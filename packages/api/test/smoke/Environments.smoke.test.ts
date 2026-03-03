import type { Environment } from "@dtapline/domain/Environment"
import { it } from "@effect/vitest"
import { Effect } from "effect"
import { describe, expect } from "vitest"
import { authRequest, setupTestApp, signUp } from "./_testApp.js"

/**
 * Smoke tests for the Environments API endpoints.
 *
 * Covers:
 * - GET /api/v1/environments
 * - POST /api/v1/environments
 * - PUT /api/v1/environments/:environmentId
 * - PUT /api/v1/environments/:environmentId/reorder
 * - DELETE /api/v1/environments/:environmentId (archive/soft delete)
 * - DELETE /api/v1/environments/:environmentId/hard (hard delete)
 */
describe("Environments API Smoke Tests", () => {
  it.scoped("GET /api/v1/environments returns empty list for new user", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `env-list-${Date.now()}@example.com`)

      const response = yield* authRequest(app, "GET", "/api/v1/environments")
      expect(response.status).toBe(200)

      const data = response.body as { environments: Array<Environment> }
      expect(Array.isArray(data.environments)).toBe(true)
      expect(data.environments).toHaveLength(0)
    }))

  it.scoped("POST /api/v1/environments creates a new environment", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `env-create-${Date.now()}@example.com`)

      const response = yield* authRequest(app, "POST", "/api/v1/environments", {
        slug: "production",
        name: "Production",
        color: "#22D3EE"
      })
      expect(response.status).toBe(200)

      const data = response.body as {
        environment: Environment
      }
      expect(data.environment.slug).toBe("production")
      expect(data.environment.name).toBe("Production")
      expect(data.environment.id).toBeDefined()
    }))

  it.scoped("PUT /api/v1/environments/:environmentId updates an environment", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `env-update-${Date.now()}@example.com`)

      // Create
      const createRes = yield* authRequest(app, "POST", "/api/v1/environments", {
        slug: "staging",
        name: "Staging"
      })
      const { environment } = createRes.body as { environment: Environment }

      // Update
      const response = yield* authRequest(app, "PUT", `/api/v1/environments/${environment.id}`, {
        name: "Staging Updated",
        color: "#10B981"
      })
      expect(response.status).toBe(200)

      const data = response.body as { environment: Environment }
      expect(data.environment.name).toBe("Staging Updated")
      expect(data.environment.id).toBe(environment.id)
    }))

  it.scoped("PUT /api/v1/environments/:environmentId/reorder reorders an environment", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `env-reorder-${Date.now()}@example.com`)

      // Create an environment
      const createRes = yield* authRequest(app, "POST", "/api/v1/environments", {
        slug: "dev",
        name: "Development",
        order: 0
      })
      const { environment } = createRes.body as { environment: Environment }

      // Reorder
      const response = yield* authRequest(
        app,
        "PUT",
        `/api/v1/environments/${environment.id}/reorder`,
        { newOrder: 2 }
      )
      expect(response.status).toBe(204)
    }))

  it.scoped("DELETE /api/v1/environments/:environmentId archives (soft-deletes) an environment", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `env-archive-${Date.now()}@example.com`)

      // Create
      const createRes = yield* authRequest(app, "POST", "/api/v1/environments", {
        slug: "to-archive",
        name: "To Archive"
      })
      const { environment } = createRes.body as { environment: Environment }

      // Archive (soft delete)
      const response = yield* authRequest(app, "DELETE", `/api/v1/environments/${environment.id}`)
      expect(response.status).toBe(204)

      // Verify it no longer appears in the active list
      const listRes = yield* authRequest(app, "GET", "/api/v1/environments")
      const data = listRes.body as { environments: Array<Environment> }
      expect(data.environments.find((e) => e.id === environment.id)).toBeUndefined()
    }))

  it.scoped("DELETE /api/v1/environments/:environmentId/hard hard-deletes an environment", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `env-harddelete-${Date.now()}@example.com`)

      // Create a fresh environment (no deployments)
      const createRes = yield* authRequest(app, "POST", "/api/v1/environments", {
        slug: "to-hard-delete",
        name: "To Hard Delete"
      })
      const { environment } = createRes.body as { environment: Environment }

      // Hard delete
      const response = yield* authRequest(
        app,
        "DELETE",
        `/api/v1/environments/${environment.id}/hard`
      )
      expect(response.status).toBe(204)
    }))
})
