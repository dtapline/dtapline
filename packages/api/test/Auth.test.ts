import { it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { MongoClient } from "mongodb"
import { describe, expect, inject } from "vitest"
import { BetterAuthInstance, BetterAuthLive } from "../src/Auth.js"
import { ServerConfigService } from "../src/Config.js"
import { MongoClientTag, MongoDatabase } from "../src/MongoDB.js"

/**
 * Integration tests for Better Auth authentication flow
 *
 * These tests verify the fix for the session cookie issue where:
 * - Signup/login was working (returning user data and setting cookies)
 * - But get-session was returning null
 * - Root cause: cookieCache.enabled = true was failing validation silently
 * - Solution: cookieCache.enabled = false to force database lookups
 *
 * Test Coverage:
 * 1. User signup with session creation and cookie setting
 * 2. Session validation after signup (critical - verifies get-session works)
 * 3. Email/password authentication on sign-in
 * 4. Password validation failures (wrong password)
 * 5. MongoDB persistence verification (sessions stored in database)
 * 6. Unauthenticated session requests (should return null)
 * 7. Role assignment (freeUser vs proUser for self-hosted)
 *
 * Testing Setup:
 * - Uses vitest-mongodb for in-memory MongoDB with replica set support
 * - Replica set required for Better Auth transactions
 * - Each test uses unique database name to avoid conflicts
 * - Effect-TS @effect/vitest for Effect-based testing
 */
describe("Authentication Flow", () => {
  // Helper to create test layers
  const createTestLayers = (selfHosted = false) =>
    Effect.gen(function*() {
      const mongoUri = inject("mongoUri")
      const client = new MongoClient(mongoUri)
      yield* Effect.promise(() => client.connect())
      const dbName = `test-dtapline-${selfHosted ? "selfhosted" : "auth"}-${Date.now()}`
      const db = client.db(dbName)

      const mongoLayer = Layer.mergeAll(
        Layer.succeed(MongoDatabase, db),
        Layer.succeed(MongoClientTag, client)
      )

      const configLayer = Layer.succeed(ServerConfigService, {
        mongodbUri: mongoUri,
        corsOrigins: ["http://localhost:5173"],
        authSecret: "test-secret-key-for-testing-only",
        authUrl: "http://localhost:3000",
        selfHosted,
        githubClientId: null,
        githubClientSecret: null
      })

      return Layer.provide(BetterAuthLive, Layer.merge(mongoLayer, configLayer))
    }).pipe(Layer.unwrap)

  // Helper to extract cookies from Set-Cookie headers
  const parseCookies = (setCookieHeaders: Array<string>): Map<string, string> => {
    const cookies = new Map<string, string>()
    setCookieHeaders.forEach((header) => {
      const [cookiePart] = header.split(";")
      const [name, value] = cookiePart.split("=")
      if (name && value) {
        cookies.set(name.trim(), value.trim())
      }
    })
    return cookies
  }

  // Helper to format cookies for Cookie header
  const formatCookieHeader = (cookies: Map<string, string>): string => {
    return Array.from(cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ")
  }

  it.effect("should create user on signup and return user data", () =>
    Effect.gen(function*() {
      const auth = yield* BetterAuthInstance

      // Create signup request
      const signupRequest = new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "http://localhost:5173"
        },
        body: JSON.stringify({
          email: `test-${Date.now()}@example.com`,
          password: "testpass123",
          name: "Test User"
        })
      })

      // Call Better Auth handler
      const response = yield* Effect.promise(() => auth.handler(signupRequest))

      // Verify response
      expect(response.status).toBe(200)

      const data = yield* Effect.promise(() =>
        response.json() as Promise<{
          user: { email: string; name: string; role: string; emailVerified: boolean }
          token: string
        }>
      )

      expect(data.user.name).toBe("Test User")
      expect(data.user.role).toBe("freeUser") // Default role for non-self-hosted
      expect(data.user.emailVerified).toBe(false)
      expect(data.token).toBeDefined()
      expect(typeof data.token).toBe("string")

      // Verify session cookie is set (Better Auth sets cookies for sessions)
      const setCookieHeaders = response.headers.getSetCookie?.() || []
      expect(setCookieHeaders.length).toBeGreaterThan(0)

      // With cookieCache disabled, Better Auth uses different cookie names
      const hasBetterAuthCookie = setCookieHeaders.some((header) =>
        header.startsWith("better-auth.session_token=") ||
        header.includes("better-auth")
      )
      expect(hasBetterAuthCookie).toBe(true)
    }).pipe(Effect.provide(createTestLayers())))

  it.effect("should validate session after signup with cookieCache disabled", () =>
    Effect.gen(function*() {
      const auth = yield* BetterAuthInstance

      const email = `sessiontest-${Date.now()}@example.com`

      // Step 1: Signup
      const signupRequest = new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "http://localhost:5173"
        },
        body: JSON.stringify({
          email,
          password: "testpass123",
          name: "Session Test User"
        })
      })

      const signupResponse = yield* Effect.promise(() => auth.handler(signupRequest))
      expect(signupResponse.status).toBe(200)

      // Extract session cookie
      const setCookieHeaders = signupResponse.headers.getSetCookie?.() || []
      const cookies = parseCookies(setCookieHeaders)

      // With cookieCache disabled, Better Auth uses session_token instead of session_data
      const hasSessionCookie = cookies.has("better-auth.session_token") || cookies.has("better-auth.session_data")
      expect(hasSessionCookie).toBe(true)

      // Step 2: Get session with cookie
      const sessionRequest = new Request("http://localhost:3000/api/auth/get-session", {
        method: "GET",
        headers: {
          "Origin": "http://localhost:5173",
          "Cookie": formatCookieHeader(cookies)
        }
      })

      const sessionResponse = yield* Effect.promise(() => auth.handler(sessionRequest))
      expect(sessionResponse.status).toBe(200)

      const sessionData = yield* Effect.promise(() =>
        sessionResponse.json() as Promise<
          {
            user: { email: string; name: string; role: string }
            session: { token: string; userId: string }
          } | null
        >
      )

      // THIS IS THE CRITICAL TEST - Should NOT return null with cookieCache disabled
      expect(sessionData).not.toBe(null)
      expect(sessionData?.user.email).toBe(email)
      expect(sessionData?.user.name).toBe("Session Test User")
      expect(sessionData?.user.role).toBe("freeUser")
      expect(sessionData?.session.token).toBeDefined()
      expect(sessionData?.session.userId).toBeDefined()
    }).pipe(Effect.provide(createTestLayers())))

  it.effect("should authenticate with email/password on sign-in", () =>
    Effect.gen(function*() {
      const auth = yield* BetterAuthInstance

      const email = `signin-${Date.now()}@example.com`

      // Step 1: Signup first
      const signupRequest = new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "http://localhost:5173"
        },
        body: JSON.stringify({
          email,
          password: "testpass123",
          name: "Sign In Test"
        })
      })

      const signupResponse = yield* Effect.promise(() => auth.handler(signupRequest))
      expect(signupResponse.status).toBe(200)

      // Step 2: Sign in with same credentials
      const signinRequest = new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "http://localhost:5173"
        },
        body: JSON.stringify({
          email,
          password: "testpass123"
        })
      })

      const signinResponse = yield* Effect.promise(() => auth.handler(signinRequest))
      expect(signinResponse.status).toBe(200)

      const signinData = yield* Effect.promise(() =>
        signinResponse.json() as Promise<{
          user: { email: string; name: string; role: string }
          token: string
        }>
      )

      expect(signinData.user.email).toBe(email)
      expect(signinData.user.name).toBe("Sign In Test")
      expect(signinData.user.role).toBe("freeUser")
      expect(signinData.token).toBeDefined()

      // Verify session cookie is set on sign-in
      const setCookieHeaders = signinResponse.headers.getSetCookie?.() || []
      expect(setCookieHeaders.length).toBeGreaterThan(0)
    }).pipe(Effect.provide(createTestLayers())))

  it.effect("should fail sign-in with wrong password", () =>
    Effect.gen(function*() {
      const auth = yield* BetterAuthInstance

      const email = `wrongpass-${Date.now()}@example.com`

      // Step 1: Signup first
      const signupRequest = new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "http://localhost:5173"
        },
        body: JSON.stringify({
          email,
          password: "correctpass123",
          name: "Wrong Pass Test"
        })
      })

      const signupResponse = yield* Effect.promise(() => auth.handler(signupRequest))
      expect(signupResponse.status).toBe(200)

      // Step 2: Try to sign in with wrong password
      const signinRequest = new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "http://localhost:5173"
        },
        body: JSON.stringify({
          email,
          password: "wrongpass123"
        })
      })

      const signinResponse = yield* Effect.promise(() => auth.handler(signinRequest))

      // Should fail authentication
      expect(signinResponse.status).not.toBe(200)
      expect(signinResponse.status).toBeGreaterThanOrEqual(400)
    }).pipe(Effect.provide(createTestLayers())))

  it.effect("should return null for get-session without cookie", () =>
    Effect.gen(function*() {
      const auth = yield* BetterAuthInstance

      // Try to get session without authentication
      const sessionRequest = new Request("http://localhost:3000/api/auth/get-session", {
        method: "GET",
        headers: {
          "Origin": "http://localhost:5173"
        }
      })

      const sessionResponse = yield* Effect.promise(() => auth.handler(sessionRequest))
      expect(sessionResponse.status).toBe(200)

      const sessionData = yield* Effect.promise(() => sessionResponse.json())

      // Should return null when not authenticated
      expect(sessionData).toBe(null)
    }).pipe(Effect.provide(createTestLayers())))

  it.effect("should store session in MongoDB (database lookup)", () => {
    const mongoUri = inject("mongoUri") as string
    const client = new MongoClient(mongoUri)
    const dbName = `test-dtapline-db-${Date.now()}`
    const db = client.db(dbName)

    const testLayer = Effect.gen(function*() {
      yield* Effect.promise(() => client.connect())

      const mongoLayer = Layer.mergeAll(
        Layer.succeed(MongoDatabase, db),
        Layer.succeed(MongoClientTag, client)
      )

      const configLayer = Layer.succeed(ServerConfigService, {
        mongodbUri: mongoUri,
        corsOrigins: ["http://localhost:5173"],
        authSecret: "test-secret-key-for-testing-only",
        authUrl: "http://localhost:3000",
        selfHosted: false,
        githubClientId: null,
        githubClientSecret: null
      })

      return Layer.provide(BetterAuthLive, Layer.merge(mongoLayer, configLayer))
    }).pipe(Layer.unwrap)

    return Effect.gen(function*() {
      const auth = yield* BetterAuthInstance

      const email = `dbtest-${Date.now()}@example.com`

      // Step 1: Signup
      const signupRequest = new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "http://localhost:5173"
        },
        body: JSON.stringify({
          email,
          password: "testpass123",
          name: "DB Test User"
        })
      })

      const signupResponse = yield* Effect.promise(() => auth.handler(signupRequest))
      expect(signupResponse.status).toBe(200)

      const signupData = yield* Effect.promise(() =>
        signupResponse.json() as Promise<{
          user: { id: string; email: string }
          token: string
        }>
      )

      // Step 2: Verify user exists in MongoDB
      const userCollection = db.collection("user")
      const user = yield* Effect.promise(() => userCollection.findOne({ email }))
      expect(user).not.toBe(null)
      expect(user?.email).toBe(email)
      expect(user?.role).toBe("freeUser")

      // Step 3: Verify session exists in MongoDB (this is the key fix - sessions must be in DB)
      // The session should exist with the token from signup response
      const sessionCollection = db.collection("session")
      const session = yield* Effect.promise(() => sessionCollection.findOne({ token: signupData.token }))

      expect(session).not.toBe(null)

      // IMPORTANT: MongoDB adapter stores userId as ObjectId, but Better Auth API returns string IDs
      // This is the critical verification - session must be in MongoDB for cookieCache.enabled=false to work
      expect(session?.userId.toString()).toBe(signupData.user.id)
      expect(session?.token).toBe(signupData.token)
      expect(session?.expiresAt).toBeDefined()
      expect(session?.createdAt).toBeDefined()
    }).pipe(Effect.provide(testLayer))
  })

  it.effect("should set default role to proUser for self-hosted deployments", () =>
    Effect.gen(function*() {
      const auth = yield* BetterAuthInstance

      const signupRequest = new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "http://localhost:5173"
        },
        body: JSON.stringify({
          email: `selfhosted-${Date.now()}@example.com`,
          password: "testpass123",
          name: "Self Hosted User"
        })
      })

      const response = yield* Effect.promise(() => auth.handler(signupRequest))
      expect(response.status).toBe(200)

      const data = yield* Effect.promise(() =>
        response.json() as Promise<{
          user: { role: string }
        }>
      )

      // Should be proUser for self-hosted
      expect(data.user.role).toBe("proUser")
    }).pipe(Effect.provide(createTestLayers(true)))) // Enable self-hosted
})
