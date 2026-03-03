import type { ApiKeyResponse } from "@dtapline/domain/ApiKey"
import type { Project } from "@dtapline/domain/Project"
import { it } from "@effect/vitest"
import { Effect } from "effect"
import { describe, expect } from "vitest"
import type { TestApp } from "./_testApp.js"
import { authRequest, setupTestApp, signUp } from "./_testApp.js"

/**
 * Smoke tests for the API Keys endpoints.
 *
 * Covers:
 * - GET /api/v1/projects/:projectId/api-keys
 * - POST /api/v1/projects/:projectId/api-keys
 * - DELETE /api/v1/projects/:projectId/api-keys/:apiKeyId
 */
describe("API Keys Smoke Tests", () => {
  /** Creates a project and returns its ID. */
  const setupProject = (app: TestApp): Effect.Effect<string> =>
    Effect.gen(function*() {
      const res = yield* authRequest(app, "POST", "/api/v1/projects", {
        name: "API Keys Test Project"
      })
      const data = res.body as { project: Project }
      return data.project.id
    })

  it.scoped("GET /api/v1/projects/:projectId/api-keys returns empty list initially", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `apikeys-list-${Date.now()}@example.com`)
      const projectId = yield* setupProject(app)

      const response = yield* authRequest(app, "GET", `/api/v1/projects/${projectId}/api-keys`)
      expect(response.status).toBe(200)

      const data = response.body as { apiKeys: Array<typeof ApiKeyResponse.Type> }
      expect(Array.isArray(data.apiKeys)).toBe(true)
      expect(data.apiKeys).toHaveLength(0)
    }))

  it.scoped("POST /api/v1/projects/:projectId/api-keys creates an API key and returns plain key", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `apikeys-create-${Date.now()}@example.com`)
      const projectId = yield* setupProject(app)

      const response = yield* authRequest(app, "POST", `/api/v1/projects/${projectId}/api-keys`, {
        name: "My CI Key",
        scopes: ["deployments:write"]
      })
      expect(response.status).toBe(200)

      const data = response.body as typeof ApiKeyResponse.Type
      expect(data.name).toBe("My CI Key")
      expect(data.id).toBeDefined()
      // Plain key is only returned at creation time
      expect(typeof data.key).toBe("string")
      expect(data.key!.length).toBeGreaterThan(0)
      expect(data.keyPrefix).toBeDefined()
      expect(data.scopes).toContain("deployments:write")
    }))

  it.scoped("DELETE /api/v1/projects/:projectId/api-keys/:apiKeyId revokes an API key", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `apikeys-revoke-${Date.now()}@example.com`)
      const projectId = yield* setupProject(app)

      // Create a key
      const createRes = yield* authRequest(app, "POST", `/api/v1/projects/${projectId}/api-keys`, {
        name: "Key To Revoke"
      })
      const keyData = createRes.body as typeof ApiKeyResponse.Type

      // Revoke it
      const response = yield* authRequest(
        app,
        "DELETE",
        `/api/v1/projects/${projectId}/api-keys/${keyData.id}`
      )
      expect(response.status).toBe(204)

      // Verify it's no longer listed
      const listRes = yield* authRequest(app, "GET", `/api/v1/projects/${projectId}/api-keys`)
      const listData = listRes.body as { apiKeys: Array<typeof ApiKeyResponse.Type> }
      expect(listData.apiKeys.find((k) => k.id === keyData.id)).toBeUndefined()
    }))
})
