import type { Project } from "@dtapline/domain/Project"
import type { TestPatternResponse, VersionPattern } from "@dtapline/domain/VersionPattern"
import { it } from "@effect/vitest"
import { Effect } from "effect"
import { describe, expect } from "vitest"
import type { TestApp } from "./_testApp.js"
import { authRequest, setupTestApp, signUp } from "./_testApp.js"

/**
 * Smoke tests for the Version Patterns API endpoints.
 *
 * Covers:
 * - GET /api/v1/projects/:projectId/version-patterns
 * - PUT /api/v1/projects/:projectId/version-patterns
 * - POST /api/v1/projects/:projectId/version-patterns/test
 */
describe("Version Patterns API Smoke Tests", () => {
  /** Creates a project and returns its ID. */
  const setupProject = (app: TestApp): Effect.Effect<string> =>
    Effect.gen(function*() {
      const res = yield* authRequest(app, "POST", "/api/v1/projects", {
        name: "Version Patterns Test Project"
      })
      const data = res.body as { project: Project }
      return data.project.id
    })

  it.scoped("GET /api/v1/projects/:projectId/version-patterns returns default pattern", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `vp-get-${Date.now()}@example.com`)
      const projectId = yield* setupProject(app)

      const response = yield* authRequest(
        app,
        "GET",
        `/api/v1/projects/${projectId}/version-patterns`
      )
      expect(response.status).toBe(200)

      const data = response.body as VersionPattern
      expect(data.projectId).toBe(projectId)
      // Default semver pattern
      expect(typeof data.defaultPattern).toBe("string")
      expect(data.defaultPattern.length).toBeGreaterThan(0)
    }))

  it.scoped("PUT /api/v1/projects/:projectId/version-patterns updates the version pattern", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `vp-update-${Date.now()}@example.com`)
      const projectId = yield* setupProject(app)

      const response = yield* authRequest(
        app,
        "PUT",
        `/api/v1/projects/${projectId}/version-patterns`,
        { defaultPattern: "release-(\\d+\\.\\d+\\.\\d+)" }
      )
      expect(response.status).toBe(200)

      const data = response.body as VersionPattern
      expect(data.projectId).toBe(projectId)
      expect(data.defaultPattern).toBe("release-(\\d+\\.\\d+\\.\\d+)")
    }))

  it.scoped("POST /api/v1/projects/:projectId/version-patterns/test tests a pattern successfully", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `vp-test-match-${Date.now()}@example.com`)
      const projectId = yield* setupProject(app)

      const response = yield* authRequest(
        app,
        "POST",
        `/api/v1/projects/${projectId}/version-patterns/test`,
        {
          pattern: "v?(\\d+\\.\\d+\\.\\d+)",
          testTag: "v1.2.3"
        }
      )
      expect(response.status).toBe(200)

      const data = response.body as typeof TestPatternResponse.Type
      expect(data.success).toBe(true)
      expect(data.extractedVersion).toBe("1.2.3")
    }))

  it.scoped("POST /api/v1/projects/:projectId/version-patterns/test returns failure for non-matching pattern", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      yield* signUp(app, `vp-test-nomatch-${Date.now()}@example.com`)
      const projectId = yield* setupProject(app)

      const response = yield* authRequest(
        app,
        "POST",
        `/api/v1/projects/${projectId}/version-patterns/test`,
        {
          pattern: "release-(\\d+\\.\\d+\\.\\d+)",
          testTag: "v1.2.3"
        }
      )
      expect(response.status).toBe(200)

      const data = response.body as typeof TestPatternResponse.Type
      expect(data.success).toBe(false)
      expect(data.extractedVersion).toBeUndefined()
    }))
})
