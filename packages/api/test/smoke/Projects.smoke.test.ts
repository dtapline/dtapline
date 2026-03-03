import type { Environment } from "@dtapline/domain/Environment"
import type { Project } from "@dtapline/domain/Project"
import { it } from "@effect/vitest"
import { Effect } from "effect"
import { describe, expect } from "vitest"
import { authRequest, setupTestApp, signUp } from "./_testApp.js"

/**
 * Smoke tests for the Projects API endpoints.
 *
 * Covers:
 * - GET /api/v1/projects (unauthenticated → 401, authenticated → 200)
 * - POST /api/v1/projects
 * - GET /api/v1/projects/:projectId
 * - PUT /api/v1/projects/:projectId
 * - DELETE /api/v1/projects/:projectId
 * - GET /api/v1/projects/:projectId/matrix
 * - GET /api/v1/projects/:projectId/deployments
 * - GET /api/v1/projects/:projectId/compare
 */
describe("Projects API Smoke Tests", () => {
  it.scoped("GET /api/v1/projects without auth returns 401", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp

      const response = yield* authRequest(app, "GET", "/api/v1/projects")
      expect(response.status).toBe(401)
    }))

  it.scoped("GET /api/v1/projects with auth returns empty project list initially", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `projects-list-${Date.now()}@example.com`)

      const response = yield* authRequest(app, "GET", "/api/v1/projects")
      expect(response.status).toBe(200)

      const data = response.body as { projects: Array<Project> }
      expect(Array.isArray(data.projects)).toBe(true)
      expect(data.projects).toHaveLength(0)
    }))

  it.scoped("POST /api/v1/projects creates a new project", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `projects-create-${Date.now()}@example.com`)

      const response = yield* authRequest(app, "POST", "/api/v1/projects", {
        name: "My Smoke Project",
        description: "Created in smoke test"
      })
      expect(response.status).toBe(200)

      const data = response.body as { project: Project }
      expect(data.project.name).toBe("My Smoke Project")
      expect(data.project.id).toBeDefined()
    }))

  it.scoped("GET /api/v1/projects/:projectId returns a single project", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `projects-get-${Date.now()}@example.com`)

      // Create a project first
      const createRes = yield* authRequest(app, "POST", "/api/v1/projects", { name: "Get Project Test" })
      const { project } = createRes.body as { project: Project }

      // Retrieve it
      const response = yield* authRequest(app, "GET", `/api/v1/projects/${project.id}`)
      expect(response.status).toBe(200)

      const fetched = response.body as Project
      expect(fetched.id).toBe(project.id)
      expect(fetched.name).toBe("Get Project Test")
    }))

  it.scoped("GET /api/v1/projects/:projectId with unknown id returns 404", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `projects-notfound-${Date.now()}@example.com`)

      const response = yield* authRequest(app, "GET", "/api/v1/projects/000000000000000000000000")
      expect(response.status).toBe(404)
    }))

  it.scoped("PUT /api/v1/projects/:projectId updates a project", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `projects-update-${Date.now()}@example.com`)

      // Create
      const createRes = yield* authRequest(app, "POST", "/api/v1/projects", { name: "Original Name" })
      const { project } = createRes.body as { project: Project }

      // Update
      const response = yield* authRequest(app, "PUT", `/api/v1/projects/${project.id}`, {
        name: "Updated Name",
        description: "Updated description"
      })
      expect(response.status).toBe(200)

      const data = response.body as { project: Project }
      expect(data.project.name).toBe("Updated Name")
      expect(data.project.id).toBe(project.id)
    }))

  it.scoped("DELETE /api/v1/projects/:projectId deletes a project", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `projects-delete-${Date.now()}@example.com`)

      // Create
      const createRes = yield* authRequest(app, "POST", "/api/v1/projects", { name: "To Delete" })
      const { project } = createRes.body as { project: Project }

      // Delete
      const deleteRes = yield* authRequest(app, "DELETE", `/api/v1/projects/${project.id}`)
      expect(deleteRes.status).toBe(204)

      // Verify it's gone
      const getRes = yield* authRequest(app, "GET", `/api/v1/projects/${project.id}`)
      expect(getRes.status).toBe(404)
    }))

  it.scoped("GET /api/v1/projects/:projectId/matrix returns matrix structure", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `projects-matrix-${Date.now()}@example.com`)

      // Create project
      const createRes = yield* authRequest(app, "POST", "/api/v1/projects", { name: "Matrix Project" })
      const { project } = createRes.body as { project: Project }

      // Get matrix
      const response = yield* authRequest(app, "GET", `/api/v1/projects/${project.id}/matrix`)
      expect(response.status).toBe(200)

      const data = response.body as {
        environments: Array<Environment>
        services: Array<unknown>
        deployments: Record<string, unknown>
      }
      expect(Array.isArray(data.environments)).toBe(true)
      expect(Array.isArray(data.services)).toBe(true)
      expect(typeof data.deployments).toBe("object")
    }))

  it.scoped("GET /api/v1/projects/:projectId/deployments returns paginated deployments", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `projects-deployments-${Date.now()}@example.com`)

      // Create project
      const createRes = yield* authRequest(app, "POST", "/api/v1/projects", {
        name: "Deployments Project"
      })
      const { project } = createRes.body as { project: Project }

      // List deployments (empty)
      const response = yield* authRequest(app, "GET", `/api/v1/projects/${project.id}/deployments`)
      expect(response.status).toBe(200)

      const data = response.body as {
        deployments: Array<unknown>
        total: number
        limit: number
        offset: number
      }
      expect(Array.isArray(data.deployments)).toBe(true)
      expect(data.total).toBe(0)
      expect(data.limit).toBe(50)
      expect(data.offset).toBe(0)
    }))

  it.scoped("GET /api/v1/projects/:projectId/compare returns comparison structure", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `projects-compare-${Date.now()}@example.com`)

      // Create project
      const createRes = yield* authRequest(app, "POST", "/api/v1/projects", { name: "Compare Project" })
      const { project } = createRes.body as { project: Project }

      // Create two environments
      const env1Res = yield* authRequest(app, "POST", "/api/v1/environments", {
        slug: "staging",
        name: "Staging"
      })
      const { environment: env1 } = env1Res.body as { environment: Environment }

      const env2Res = yield* authRequest(app, "POST", "/api/v1/environments", {
        slug: "production",
        name: "Production"
      })
      const { environment: env2 } = env2Res.body as { environment: Environment }

      // Compare the two environments
      const response = yield* authRequest(
        app,
        "GET",
        `/api/v1/projects/${project.id}/compare?env1=${env1.id}&env2=${env2.id}`
      )
      expect(response.status).toBe(200)

      const data = response.body as {
        env1: Environment
        env2: Environment
        differences: Array<unknown>
      }
      expect(data.env1.id).toBe(env1.id)
      expect(data.env2.id).toBe(env2.id)
      expect(Array.isArray(data.differences)).toBe(true)
    }))
})
