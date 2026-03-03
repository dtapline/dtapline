import type { Service } from "@dtapline/domain/Service"
import { it } from "@effect/vitest"
import { Effect } from "effect"
import { describe, expect } from "vitest"
import type { TestApp } from "./_testApp.js"
import { authRequest, setupTestApp, signUp } from "./_testApp.js"

/**
 * Smoke tests for the Services API endpoints.
 *
 * Covers:
 * - GET /api/v1/projects/:projectId/services
 * - POST /api/v1/projects/:projectId/services
 * - PUT /api/v1/projects/:projectId/services/:serviceId
 * - DELETE /api/v1/projects/:projectId/services/:serviceId (archive)
 * - DELETE /api/v1/projects/:projectId/services/:serviceId/hard (hard delete)
 */
describe("Services API Smoke Tests", () => {
  /** Creates a project and returns its ID. */
  const setupProject = (
    app: TestApp,
    name = "Services Test Project"
  ): Effect.Effect<string> =>
    Effect.gen(function*() {
      const res = yield* authRequest(app, "POST", "/api/v1/projects", { name })
      const data = res.body as { project: { id: string } }
      return data.project.id
    })

  it.scoped("GET /api/v1/projects/:projectId/services returns empty list initially", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `svc-list-${Date.now()}@example.com`)
      const projectId = yield* setupProject(app)

      const response = yield* authRequest(app, "GET", `/api/v1/projects/${projectId}/services`)
      expect(response.status).toBe(200)

      const data = response.body as { services: Array<Service> }
      expect(Array.isArray(data.services)).toBe(true)
      expect(data.services).toHaveLength(0)
    }))

  it.scoped("POST /api/v1/projects/:projectId/services creates a new service", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `svc-create-${Date.now()}@example.com`)
      const projectId = yield* setupProject(app)

      const response = yield* authRequest(app, "POST", `/api/v1/projects/${projectId}/services`, {
        slug: "api-server",
        name: "API Server"
      })
      expect(response.status).toBe(200)

      const data = response.body as {
        service: Service
      }
      expect(data.service.slug).toBe("api-server")
      expect(data.service.name).toBe("API Server")
      expect(data.service.id).toBeDefined()
    }))

  it.scoped("PUT /api/v1/projects/:projectId/services/:serviceId updates a service", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `svc-update-${Date.now()}@example.com`)
      const projectId = yield* setupProject(app)

      // Create
      const createRes = yield* authRequest(app, "POST", `/api/v1/projects/${projectId}/services`, {
        slug: "worker",
        name: "Worker"
      })
      const { service } = createRes.body as { service: Service }

      // Update
      const response = yield* authRequest(
        app,
        "PUT",
        `/api/v1/projects/${projectId}/services/${service.id}`,
        { name: "Background Worker" }
      )
      expect(response.status).toBe(200)

      const data = response.body as { service: Service }
      expect(data.service.name).toBe("Background Worker")
      expect(data.service.id).toBe(service.id)
    }))

  it.scoped("DELETE /api/v1/projects/:projectId/services/:serviceId archives a service", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `svc-archive-${Date.now()}@example.com`)
      const projectId = yield* setupProject(app)

      // Create
      const createRes = yield* authRequest(app, "POST", `/api/v1/projects/${projectId}/services`, {
        slug: "to-archive",
        name: "To Archive"
      })
      const { service } = createRes.body as { service: Service }

      // Archive (soft delete)
      const response = yield* authRequest(
        app,
        "DELETE",
        `/api/v1/projects/${projectId}/services/${service.id}`
      )
      expect(response.status).toBe(204)

      // Verify it's no longer in the list
      const listRes = yield* authRequest(app, "GET", `/api/v1/projects/${projectId}/services`)
      const data = listRes.body as { services: Array<Service> }
      expect(data.services.find((s) => s.id === service.id)).toBeUndefined()
    }))

  it.scoped("DELETE /api/v1/projects/:projectId/services/:serviceId/hard hard-deletes a service", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `svc-harddelete-${Date.now()}@example.com`)
      const projectId = yield* setupProject(app)

      // Create a service with no deployments
      const createRes = yield* authRequest(app, "POST", `/api/v1/projects/${projectId}/services`, {
        slug: "to-hard-delete",
        name: "To Hard Delete"
      })
      const { service } = createRes.body as { service: Service }

      // Hard delete
      const response = yield* authRequest(
        app,
        "DELETE",
        `/api/v1/projects/${projectId}/services/${service.id}/hard`
      )
      expect(response.status).toBe(204)
    }))
})
