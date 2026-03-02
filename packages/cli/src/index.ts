import { DtaplineApi } from "@dtapline/domain/Api"
import { Args, CliConfig, Command, Options } from "@effect/cli"
import { HttpApiClient, HttpClient, HttpClientRequest } from "@effect/platform"
import { NodeContext, NodeHttpClient, NodeRuntime } from "@effect/platform-node"
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { Config, Console, Effect, Layer, Option } from "effect"
import React from "react"
import { detectCICD, getGitCommitSha } from "./cicd-detect.js"
import { signIn } from "./dashboard/api-client.js"
import { App } from "./dashboard/App.js"
import { loadSession, saveSession } from "./dashboard/auth.js"

/**
 * Dtapline CLI
 * Reports deployment information to Dtapline API server via webhook
 */

// Get version: use build-time injected constant or dev placeholder
function getVersion(): string {
  try {
    // __VERSION__ is replaced at build time by tsup
    return __VERSION__
  } catch {
    // Fallback for running source directly (e.g., with tsx)
    return "dev"
  }
}

// ============================================================================
// CLI Arguments
// ============================================================================

const environmentArg = Args.text({ name: "environment" }).pipe(
  Args.withDescription("The deployment environment (e.g., dev, staging, production)")
)

const serviceArg = Args.text({ name: "service" }).pipe(
  Args.withDescription("The service name being deployed")
)

const commitShaArg = Args.text({ name: "commitSha" }).pipe(
  Args.withDescription("Git commit SHA (auto-detected in CI/CD or from git)"),
  Args.optional
)

// ============================================================================
// CLI Options
// ============================================================================

const apiKeyOption = Options.text("api-key").pipe(
  Options.withDescription("Dtapline API key (or set DTAPLINE_API_KEY env var)"),
  Options.withFallbackConfig(Config.string("DTAPLINE_API_KEY"))
)

const serverUrlOption = Options.text("server-url").pipe(
  Options.withDescription("Dtapline API server URL (or set DTAPLINE_SERVER_URL env var)"),
  Options.withFallbackConfig(Config.string("DTAPLINE_SERVER_URL")),
  Options.withDefault("https://api.dtapline.com")
)

const gitTagOption = Options.text("git-tag").pipe(
  Options.withDescription("Git tag for this deployment (e.g., v1.2.3)"),
  Options.optional
)

const prUrlOption = Options.text("pr-url").pipe(
  Options.withDescription("Pull request URL"),
  Options.optional
)

const deployedByOption = Options.text("deployed-by").pipe(
  Options.withDescription("Who/what triggered the deployment"),
  Options.optional
)

const statusOption = Options.choice("status", ["success", "failed", "in_progress", "rolled_back"]).pipe(
  Options.withDescription("Deployment status"),
  Options.withDefault("success" as const)
)

const buildUrlOption = Options.text("build-url").pipe(
  Options.withDescription("Build/CI pipeline URL"),
  Options.optional
)

const releaseNotesOption = Options.text("release-notes").pipe(
  Options.withDescription("Release notes or changelog"),
  Options.optional
)

const deployedVersionOption = Options.text("deployed-version").pipe(
  Options.withDescription("Semantic version for this deployment (e.g., 1.2.3)"),
  Options.optional
)

// ============================================================================
// Deploy Command
// ============================================================================

const deployCommand = Command.make(
  "deploy",
  {
    environment: environmentArg,
    service: serviceArg,
    commitSha: commitShaArg,
    apiKey: apiKeyOption,
    serverUrl: serverUrlOption,
    gitTag: gitTagOption,
    prUrl: prUrlOption,
    deployedBy: deployedByOption,
    status: statusOption,
    buildUrl: buildUrlOption,
    releaseNotes: releaseNotesOption,
    deployedVersion: deployedVersionOption
  },
  (args) =>
    Effect.gen(function*() {
      yield* Console.log("🚀 Reporting deployment to dtapline...")

      // Auto-detect CI/CD platform
      const cicdInfo = detectCICD()

      // Resolve commitSha with fallback chain: CLI arg > CI/CD > git rev-parse > error
      let commitSha: string
      if (Option.isSome(args.commitSha)) {
        commitSha = args.commitSha.value
      } else if (cicdInfo.commitSha) {
        commitSha = cicdInfo.commitSha
      } else {
        const gitSha = yield* getGitCommitSha()
        if (gitSha) {
          commitSha = gitSha
        } else {
          yield* Effect.fail(
            new Error(
              "Could not determine commit SHA. Please provide it as an argument or run from a git repository."
            )
          )
          return // TypeScript needs this, though Effect.fail never returns
        }
      }

      // Auto-fill gitTag from CI/CD if not provided
      const gitTag = Option.isSome(args.gitTag) ? args.gitTag.value : cicdInfo.gitTag

      // Auto-fill deployedBy: prefer actor, fall back to platform name
      const deployedBy = Option.isSome(args.deployedBy)
        ? args.deployedBy.value
        : cicdInfo.actor || (cicdInfo.detected ? cicdInfo.platform : undefined)

      yield* Console.log(`  Environment: ${args.environment}`)
      yield* Console.log(`  Service: ${args.service}`)
      yield* Console.log(`  Commit: ${commitSha}`)
      if (Option.isSome(args.deployedVersion)) yield* Console.log(`  Version: ${args.deployedVersion.value}`)
      if (gitTag) yield* Console.log(`  Tag: ${gitTag}`)
      if (cicdInfo.detected) yield* Console.log(`  CI/CD Platform: ${cicdInfo.platform}`)
      yield* Console.log(`  Status: ${args.status}`)

      // Build typed API client from the shared DtaplineApi schema
      const client = yield* HttpApiClient.make(DtaplineApi, {
        baseUrl: args.serverUrl,
        transformClient: HttpClient.mapRequest(
          HttpClientRequest.setHeader("Authorization", `Bearer ${args.apiKey}`)
        )
      })

      const response = yield* client.deploymentsWebhook.createDeployment({
        payload: {
          environment: args.environment,
          service: args.service,
          commitSha,
          ...(Option.isSome(args.deployedVersion) && { version: args.deployedVersion.value }),
          ...(gitTag && { gitTag }),
          ...(Option.isSome(args.prUrl) && { pullRequestUrl: args.prUrl.value }),
          ...(deployedBy && { deployedBy }),
          status: args.status,
          ...(Option.isSome(args.buildUrl) && { buildUrl: args.buildUrl.value }),
          ...(cicdInfo.detected && !Option.isSome(args.buildUrl) && cicdInfo.buildUrl && {
            buildUrl: cicdInfo.buildUrl
          }),
          ...(Option.isSome(args.releaseNotes) && { releaseNotes: args.releaseNotes.value }),
          ...(cicdInfo.detected && {
            cicdPlatform: cicdInfo.platform,
            cicdBuildUrl: cicdInfo.buildUrl,
            cicdBuildId: cicdInfo.buildId
          })
        }
      }).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function*() {
            yield* Console.error("❌ Failed to report deployment:")
            yield* Console.error(String(error))
            return yield* Effect.fail(new Error("Deployment reporting failed"))
          })
        )
      )

      yield* Console.log(`✅ Deployment recorded successfully!`)
      yield* Console.log(`  Deployment ID: ${response.id}`)
      yield* Console.log(`  Version: ${response.version}`)
    })
).pipe(
  Command.withDescription("Report a deployment to dtapline server")
)

// ============================================================================
// Login Command
// ============================================================================

const loginCommand = Command.make(
  "login",
  { serverUrl: serverUrlOption },
  (args) =>
    Effect.gen(function*() {
      const readline = yield* Effect.promise(() => import("node:readline"))
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
      const question = (prompt: string): Promise<string> => new Promise((resolve) => rl.question(prompt, resolve))

      const questionHidden = (prompt: string): Promise<string> =>
        new Promise((resolve, reject) => {
          process.stdout.write(prompt)
          let value = ""
          // Switch to raw mode so we can intercept each keypress without echo
          process.stdin.setRawMode(true)
          process.stdin.resume()
          process.stdin.setEncoding("utf8")
          const onData = (ch: string) => {
            if (ch === "\u0003") {
              // Ctrl+C — restore terminal and reject so Effect handles the interruption
              process.stdin.setRawMode(false)
              process.stdin.pause()
              process.stdin.removeListener("data", onData)
              process.stdout.write("\n")
              reject(new Error("Interrupted"))
            } else if (ch === "\n" || ch === "\r") {
              // Enter — stop reading
              process.stdin.setRawMode(false)
              process.stdin.pause()
              process.stdin.removeListener("data", onData)
              process.stdout.write("\n")
              resolve(value)
            } else if (ch === "\u007f" || ch === "\b") {
              // Backspace
              value = value.slice(0, -1)
            } else {
              value += ch
            }
          }
          process.stdin.on("data", onData)
        })

      yield* Console.log(`Signing in to ${args.serverUrl}`)
      const email = yield* Effect.promise(() => question("Email: "))
      rl.close()
      const password = yield* Effect.tryPromise({
        try: () => questionHidden("Password: "),
        catch: (err) => err as Error
      })

      const token = yield* Effect.tryPromise({
        try: () => signIn(args.serverUrl, email, password),
        catch: (err) => err as Error
      })

      saveSession(args.serverUrl, token, email)
      yield* Console.log(`Logged in as ${email}`)
    })
).pipe(
  Command.withDescription("Authenticate with the Dtapline API server and save session")
)

// ============================================================================
// Dashboard Command
// ============================================================================

const refreshOption = Options.integer("refresh").pipe(
  Options.withDescription("Auto-refresh interval in seconds"),
  Options.withDefault(30)
)

const dashboardCommand = Command.make(
  "dashboard",
  { serverUrl: serverUrlOption, refresh: refreshOption },
  (args) =>
    Effect.gen(function*() {
      const session = loadSession(args.serverUrl)
      const renderer = yield* Effect.promise(() => createCliRenderer())
      createRoot(renderer).render(
        React.createElement(App, {
          serverUrl: args.serverUrl,
          initialToken: session?.token ?? null,
          refreshInterval: args.refresh * 1000,
          onQuit: () => renderer.destroy()
        })
      )
      // Wait until the renderer fires its "destroy" event, then exit cleanly
      yield* Effect.promise(
        () =>
          new Promise<void>((resolve) => {
            renderer.on("destroy", () => resolve())
          })
      )
    })
).pipe(
  Command.withDescription("Open the deployment matrix dashboard in the terminal")
)

// ============================================================================
// Root Command
// ============================================================================

const rootCommand = Command.make("dtapline").pipe(
  Command.withDescription("Dtapline CLI - Report deployments to your Dtapline API server"),
  Command.withSubcommands([deployCommand, loginCommand, dashboardCommand])
)

// ============================================================================
// Run CLI
// ============================================================================

const cli = Command.run(rootCommand, {
  name: "Dtapline CLI",
  version: getVersion()
})

const MainLayer = Layer.mergeAll(
  NodeContext.layer,
  NodeHttpClient.layer,
  CliConfig.layer({ showBuiltIns: false })
)

Effect.suspend(() => cli(process.argv)).pipe(
  Effect.provide(MainLayer),
  Effect.tapErrorCause(Effect.logError),
  NodeRuntime.runMain
)
