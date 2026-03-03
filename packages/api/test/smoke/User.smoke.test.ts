import type { User } from "@dtapline/domain/User"
import { it } from "@effect/vitest"
import { Effect } from "effect"
import { describe, expect } from "vitest"
import { authRequest, setupTestApp, signIn, signUp } from "./_testApp.js"

/**
 * Smoke tests for the User and Auth API endpoints.
 *
 * Covers:
 * - GET /api/v1/user/me (unauthenticated → 401, authenticated → 200)
 * - POST /api/auth/sign-up/email
 * - POST /api/auth/sign-in/email
 * - GET /api/auth/get-session
 */
describe("User & Auth API Smoke Tests", () => {
  it.scoped("GET /api/v1/user/me without auth returns 401", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp

      const response = yield* authRequest(app, "GET", "/api/v1/user/me")
      expect(response.status).toBe(401)
    }))

  it.scoped("GET /api/v1/user/me with valid session returns the authenticated user", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      const email = `user-me-${Date.now()}@example.com`
      yield* signUp(app, email)

      const response = yield* authRequest(app, "GET", "/api/v1/user/me")
      expect(response.status).toBe(200)

      const user = response.body as User
      expect(user.email).toBe(email)
      expect(user.name).toBe("Test User")
      expect(user.role).toBe("freeUser")
      expect(user.id).toBeDefined()
    }))

  it.scoped("POST /api/auth/sign-up/email creates a new user", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      const email = `signup-smoke-${Date.now()}@example.com`

      const response = yield* Effect.promise(() =>
        app
          .post("/api/auth/sign-up/email")
          .set("Origin", "http://localhost:5173")
          .send({ email, password: "testpass123", name: "Smoke User" })
      )
      expect(response.status).toBe(200)

      const data = response.body as {
        user: { email: string; name: string; role: string }
        token: string
      }
      expect(data.user.email).toBe(email)
      expect(data.user.name).toBe("Smoke User")
      expect(data.user.role).toBe("freeUser")
      expect(data.token).toBeDefined()
    }))

  it.scoped("POST /api/auth/sign-in/email authenticates an existing user", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      const email = `signin-smoke-${Date.now()}@example.com`

      // Sign up first
      yield* signUp(app, email)

      // Sign in (session cookie stored in agent)
      yield* signIn(app, email)

      // Verify session works
      const meResponse = yield* authRequest(app, "GET", "/api/v1/user/me")
      expect(meResponse.status).toBe(200)
    }))

  it.scoped("GET /api/auth/get-session returns session data with valid cookie", () =>
    Effect.gen(function*() {
      const app = yield* setupTestApp
      const email = `getsession-${Date.now()}@example.com`
      yield* signUp(app, email)

      const response = yield* Effect.promise(() =>
        app
          .get("/api/auth/get-session")
          .set("Origin", "http://localhost:5173")
      )
      expect(response.status).toBe(200)

      const sessionData = response.body as {
        user: { email: string }
        session: { token: string; userId: string }
      } | null
      expect(sessionData).not.toBeNull()
      expect(sessionData?.user.email).toBe(email)
      expect(sessionData?.session.token).toBeDefined()
    }))
})
