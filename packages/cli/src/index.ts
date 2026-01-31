#!/usr/bin/env node
import { Args, Command, Options } from "@effect/cli"
import { HttpBody, HttpClient, HttpClientRequest } from "@effect/platform"
import { NodeContext, NodeHttpClient, NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Layer, Option, Schema } from "effect"

/**
 * CloudMatrix CLI
 * Reports deployment information to CloudMatrix server via webhook
 */

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
  Args.withDescription("Git commit SHA being deployed")
)

// ============================================================================
// CLI Options
// ============================================================================

const apiKeyOption = Options.text("api-key").pipe(
  Options.withDescription("CloudMatrix API key (or set CLOUDMATRIX_API_KEY env var)")
)

const serverUrlOption = Options.text("server-url").pipe(
  Options.withDescription("CloudMatrix server URL"),
  Options.withDefault("https://api.cloudmatrix.io")
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
    releaseNotes: releaseNotesOption
  },
  (args) =>
    Effect.gen(function*() {
      yield* Console.log("🚀 Reporting deployment to CloudMatrix...")

      // Get API key from option or environment variable
      const apiKey = args.apiKey ?? process.env.CLOUDMATRIX_API_KEY
      if (!apiKey) {
        yield* Effect.fail(new Error("API key is required. Use --api-key or set CLOUDMATRIX_API_KEY env var"))
      }

      // Build the deployment payload
      const payload = {
        environment: args.environment,
        service: args.service,
        commitSha: args.commitSha,
        ...(Option.isSome(args.gitTag) && { gitTag: args.gitTag.value }),
        ...(Option.isSome(args.prUrl) && { pullRequestUrl: args.prUrl.value }),
        ...(Option.isSome(args.deployedBy) && { deployedBy: args.deployedBy.value }),
        status: args.status,
        ...(Option.isSome(args.buildUrl) && { buildUrl: args.buildUrl.value }),
        ...(Option.isSome(args.releaseNotes) && { releaseNotes: args.releaseNotes.value })
      }

      yield* Console.log(`  Environment: ${args.environment}`)
      yield* Console.log(`  Service: ${args.service}`)
      yield* Console.log(`  Commit: ${args.commitSha}`)
      if (Option.isSome(args.gitTag)) yield* Console.log(`  Tag: ${args.gitTag.value}`)
      yield* Console.log(`  Status: ${args.status}`)

      // Send webhook request
      const httpClient = yield* HttpClient.HttpClient

      const body = HttpBody.text(JSON.stringify(payload), "application/json")
      const request = HttpClientRequest.post(`${args.serverUrl}/api/v1/deployments`).pipe(
        HttpClientRequest.setHeader("Authorization", `Bearer ${apiKey!}`),
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
  Command.withDescription("Report a deployment to CloudMatrix server")
)

// ============================================================================
// Root Command
// ============================================================================

const rootCommand = Command.make("cloudmatrix").pipe(
  Command.withDescription("CloudMatrix CLI - Report deployments to your CloudMatrix server"),
  Command.withSubcommands([deployCommand])
)

// ============================================================================
// Run CLI
// ============================================================================

const cli = Command.run(rootCommand, {
  name: "CloudMatrix CLI",
  version: "0.1.0"
})

const MainLayer = Layer.mergeAll(
  NodeContext.layer,
  NodeHttpClient.layerUndici
)

Effect.suspend(() => cli(process.argv)).pipe(
  Effect.provide(MainLayer),
  Effect.tapErrorCause(Effect.logError),
  NodeRuntime.runMain
)
