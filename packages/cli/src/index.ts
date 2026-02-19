import { Args, CliConfig, Command, Options } from "@effect/cli"
import { HttpBody, HttpClient, HttpClientRequest } from "@effect/platform"
import { NodeContext, NodeHttpClient, NodeRuntime } from "@effect/platform-node"
import { Config, Console, Effect, Layer, Option, Schema } from "effect"
import { detectCICD, getGitCommitSha } from "./cicd-detect.js"

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

// Response schema for type safety
const DeploymentResponse = Schema.Struct({
  id: Schema.String,
  version: Schema.String,
  message: Schema.String
})

type DeploymentResponse = typeof DeploymentResponse.Type

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

      // Build the deployment payload
      const payload = {
        environment: args.environment,
        service: args.service,
        commitSha,
        ...(Option.isSome(args.deployedVersion) && { version: args.deployedVersion.value }),
        ...(gitTag && { gitTag }),
        ...(Option.isSome(args.prUrl) && { pullRequestUrl: args.prUrl.value }),
        ...(deployedBy && { deployedBy }),
        status: args.status,
        ...(Option.isSome(args.buildUrl) && { buildUrl: args.buildUrl.value }),
        ...(cicdInfo.detected && !Option.isSome(args.buildUrl) && cicdInfo.buildUrl && { buildUrl: cicdInfo.buildUrl }),
        ...(Option.isSome(args.releaseNotes) && { releaseNotes: args.releaseNotes.value }),
        ...(cicdInfo.detected && {
          cicdPlatform: cicdInfo.platform,
          cicdBuildUrl: cicdInfo.buildUrl,
          cicdBuildId: cicdInfo.buildId
        })
      }

      yield* Console.log(`  Environment: ${args.environment}`)
      yield* Console.log(`  Service: ${args.service}`)
      yield* Console.log(`  Commit: ${commitSha}`)
      if (Option.isSome(args.deployedVersion)) yield* Console.log(`  Version: ${args.deployedVersion.value}`)
      if (gitTag) yield* Console.log(`  Tag: ${gitTag}`)
      if (cicdInfo.detected) yield* Console.log(`  CI/CD Platform: ${cicdInfo.platform}`)
      yield* Console.log(`  Status: ${args.status}`)

      // Send webhook request
      const httpClient = yield* HttpClient.HttpClient

      const body = HttpBody.text(JSON.stringify(payload), "application/json")
      const request = HttpClientRequest.post(`${args.serverUrl}/api/v1/deployments`).pipe(
        HttpClientRequest.setHeader("Authorization", `Bearer ${args.apiKey}`),
        HttpClientRequest.setBody(body)
      )

      const response: DeploymentResponse = yield* httpClient.execute(request).pipe(
        Effect.flatMap((res) => {
          // Check for non-success status codes
          if (res.status !== 200 && res.status !== 201) {
            return Effect.gen(function*() {
              const text = yield* res.text
              yield* Console.error(`❌ Server returned status ${res.status}:`)
              yield* Console.error(text)
              return yield* Effect.fail(new Error(`Server error: ${res.status}`))
            })
          }
          return res.json
        }),
        Effect.flatMap((json) => Schema.decodeUnknown(DeploymentResponse)(json)),
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
// Root Command
// ============================================================================

const rootCommand = Command.make("dtapline").pipe(
  Command.withDescription("Dtapline CLI - Report deployments to your Dtapline API server"),
  Command.withSubcommands([deployCommand])
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
  NodeHttpClient.layerUndici,
  CliConfig.layer({ showBuiltIns: false })
)

Effect.suspend(() => cli(process.argv)).pipe(
  Effect.provide(MainLayer),
  Effect.tapErrorCause(Effect.logError),
  NodeRuntime.runMain
)
