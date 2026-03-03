import type { ApiKeyResponse } from "@dtapline/domain/ApiKey"
import type { Project } from "@dtapline/domain/Project"
import { it } from "@effect/vitest"
import { Effect } from "effect"
import { describe, expect } from "vitest"
import type { TestApp } from "./_testApp.js"
import { authRequest, bearerRequest, setupTestApp, signUp } from "./_testApp.js"

/**
 * Smoke tests for the Deployment Webhook endpoint.
 *
 * The webhook uses API key authentication (Bearer token) instead of session cookies.
 *
 * Covers:
 * - POST /api/v1/deployments without auth → 401
 * - POST /api/v1/deployments with invalid key → 401
 * - POST /api/v1/deployments with valid API key → 200
 */
describe("Deployments Webhook Smoke Tests", () => {
  /**
   * Full setup: user → project → API key
   * Returns the plaintext API key and the project ID.
   */
  const setupApiKey = (app: TestApp): Effect.Effect<{ apiKey: string; projectId: string }> =>
    Effect.gen(function*() {
      const email = `webhook-${Date.now()}@example.com`
      yield* signUp(app, email)

      // Create a project
      const projectRes = yield* authRequest(app, "POST", "/api/v1/projects", {
        name: "Webhook Test Project"
      })
      const { project } = projectRes.body as { project: Project }

      // Create an API key
      const keyRes = yield* authRequest(app, "POST", `/api/v1/projects/${project.id}/api-keys`, {
        name: "CI Key",
        scopes: ["deployments:write"]
      })
      const keyData = keyRes.body as typeof ApiKeyResponse.Type

      return { apiKey: keyData.key!, projectId: project.id }
    })

  it.scoped("POST /api/v1/deployments without Authorization header returns 401", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp

      const response = yield* authRequest(app, "POST", "/api/v1/deployments", {
        environment: "production",
        service: "api",
        commitSha: "abc123def456"
      })
      expect(response.status).toBe(401)
    }))

  it.scoped("POST /api/v1/deployments with an invalid API key returns 401", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp

      const response = yield* bearerRequest(
        app,
        "POST",
        "/api/v1/deployments",
        "cm_invalidkeyxxxxxxxxxxxxxxxxxxxxxxxx",
        {
          environment: "production",
          service: "api",
          commitSha: "abc123def456"
        }
      )
      expect(response.status).toBe(401)
    }))

  it.scoped("POST /api/v1/deployments with a valid API key records the deployment", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      const { apiKey } = yield* setupApiKey(app)

      const response = yield* bearerRequest(
        app,
        "POST",
        "/api/v1/deployments",
        apiKey,
        {
          environment: "production",
          service: "api-server",
          commitSha: "abc123def456789",
          version: "1.2.3",
          status: "success",
          deployedBy: "ci-bot"
        }
      )
      expect(response.status).toBe(200)

      const data = response.body as {
        id: string
        version: string
        message: string
      }
      expect(data.id).toBeDefined()
      expect(data.version).toBe("1.2.3")
      expect(data.message).toBe("Deployment recorded successfully")
    }))

  it.scoped("POST /api/v1/deployments extracts version from git tag when no version provided", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      const { apiKey } = yield* setupApiKey(app)

      const response = yield* bearerRequest(
        app,
        "POST",
        "/api/v1/deployments",
        apiKey,
        {
          environment: "staging",
          service: "worker",
          commitSha: "deadbeef12345",
          gitTag: "v2.0.1",
          status: "success"
        }
      )
      expect(response.status).toBe(200)

      const data = response.body as {
        id: string
        version: string
        message: string
      }
      expect(data.id).toBeDefined()
      // Version should be extracted from gitTag "v2.0.1" → "2.0.1"
      expect(data.version).toBe("2.0.1")
    }))
})
