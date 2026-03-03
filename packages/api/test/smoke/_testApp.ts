import type { User } from "@dtapline/domain/User"
import { Etag, HttpApiBuilder } from "@effect/platform"
import { NodeContext, NodeHttpPlatform, NodeHttpServer } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { MongoClient } from "mongodb"
import supertest from "supertest"
import { inject } from "vitest"
import { DtaplineApiLive } from "../../src/Api/DtaplineApiLive.js"
import { BetterAuthLive } from "../../src/Auth.js"
import { ServerConfigService } from "../../src/Config.js"
import { MongoClientTag, MongoDatabase } from "../../src/MongoDB.js"
import { ApiKeysRepositoryLive } from "../../src/Repositories/ApiKeysRepository.js"
import { DeploymentsRepositoryLive } from "../../src/Repositories/DeploymentsRepository.js"
import { EnvironmentsRepositoryLive } from "../../src/Repositories/EnvironmentsRepository.js"
import { ProjectsRepositoryLive } from "../../src/Repositories/ProjectsRepository.js"
import { ServicesRepositoryLive } from "../../src/Repositories/ServicesRepository.js"
import { VersionPatternsRepositoryLive } from "../../src/Repositories/VersionPatternsRepository.js"
import { AuthorizationServiceLive } from "../../src/Services/AuthorizationService.js"
import { AuthServiceLive } from "../../src/Services/AuthService.js"
import { BroadcastServiceNoop } from "../../src/Services/BroadcastService.js"
import { ComparisonServiceLive } from "../../src/Services/ComparisonService.js"
import { DeploymentServiceLive } from "../../src/Services/DeploymentService.js"
import { MatrixServiceLive } from "../../src/Services/MatrixService.js"
import { DemoUserMiddlewareLive } from "../../src/Utils/DemoUserMiddleware.js"

/** A supertest agent with a cookie jar for session-based auth. */
export type TestApp = InstanceType<typeof supertest.agent>

/**
 * Sets up a full test application instance backed by in-memory MongoDB.
 * Each call creates a unique database to ensure test isolation.
 *
 * Uses NodeHttpServer.makeHandler to produce a Node.js request handler
 * and wraps it in a supertest agent (with a cookie jar for session management).
 *
 * Returns a scoped Effect — use with `it.scoped` in each test. The MongoDB
 * connection is automatically released when the scope closes.
 */
export const setupTestApp = Effect.gen(function*() {
  const mongoUri = inject("mongoUri")

  const client = yield* Effect.acquireRelease(
    Effect.promise(() => new MongoClient(mongoUri).connect()),
    (c) => Effect.promise(() => c.close())
  )

  const dbName = `test-smoke-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
  const db = client.db(dbName)

  const mongoLayer = Layer.mergeAll(
    Layer.succeed(MongoDatabase, db),
    Layer.succeed(MongoClientTag, client)
  )

  const configLayer = Layer.succeed(ServerConfigService, {
    mongodbUri: mongoUri,
    corsOrigins: ["http://localhost:5173"],
    authSecret: "test-secret-key-for-smoke-tests-only",
    authUrl: "http://localhost:3000",
    selfHosted: false,
    githubClientId: null,
    githubClientSecret: null
  })

  const repositoriesLayer = Layer.mergeAll(
    ProjectsRepositoryLive,
    EnvironmentsRepositoryLive,
    ServicesRepositoryLive.pipe(Layer.provide(ProjectsRepositoryLive)),
    DeploymentsRepositoryLive,
    ApiKeysRepositoryLive,
    VersionPatternsRepositoryLive
  ).pipe(Layer.provide(mongoLayer))

  const servicesLayer = Layer.mergeAll(
    DeploymentServiceLive,
    MatrixServiceLive,
    ComparisonServiceLive
  ).pipe(Layer.provide(repositoriesLayer))

  const betterAuthLayer = BetterAuthLive.pipe(
    Layer.provide(mongoLayer),
    Layer.provide(configLayer)
  )

  const authServiceLayer = AuthServiceLive.pipe(
    Layer.provide(betterAuthLayer)
  )

  const authorizationServiceLayer = AuthorizationServiceLive.pipe(
    Layer.provide(authServiceLayer)
  )

  const demoUserMiddlewareLayer = DemoUserMiddlewareLive.pipe(
    Layer.provide(authorizationServiceLayer)
  )

  const appLayer = DtaplineApiLive.pipe(
    Layer.provide(BroadcastServiceNoop),
    Layer.provide(demoUserMiddlewareLayer),
    Layer.provide(authorizationServiceLayer),
    Layer.provide(authServiceLayer),
    Layer.provide(betterAuthLayer),
    Layer.provide(servicesLayer),
    Layer.provide(repositoriesLayer),
    Layer.provide(mongoLayer),
    Layer.provide(configLayer)
  )

  // Build the raw HttpApp and convert to a Node.js (req, res) => void handler.
  //
  // IMPORTANT: Router.Live and Middleware.layer must be merged into the *same*
  // Layer.provide call as appLayer (DtaplineApiLive + its groups). Each group
  // internally calls Router.use(), which does Layer.provide(Router.Live) — but
  // Effect's Layer memoization means it reuses an existing Router.Live from
  // context rather than creating a fresh one. If Router.Live is provided
  // separately (a second Effect.provide), it arrives after the groups are built,
  // so every group gets its own fresh empty router and the outer httpApp sees an
  // empty router → every route returns 404.
  //
  // Solution: merge appLayer + platform layers into one and provide in one call.
  const fullLayer = Layer.mergeAll(
    appLayer,
    NodeHttpPlatform.layer,
    NodeContext.layer,
    Etag.layer,
    HttpApiBuilder.Router.Live,
    HttpApiBuilder.Middleware.layer
  )

  const nodeHandler = yield* HttpApiBuilder.httpApp.pipe(
    Effect.flatMap((app) => NodeHttpServer.makeHandler(app)),
    Effect.provide(fullLayer)
  )

  return supertest.agent(nodeHandler)
})

/**
 * Signs up a new user. The session cookie is stored in the agent's cookie jar,
 * so subsequent requests via the same agent are automatically authenticated.
 */
export const signUp = (
  agent: TestApp,
  email: string,
  password = "testpass123",
  name = "Test User"
): Effect.Effect<User> =>
  Effect.gen(function*() {
    const res = yield* Effect.promise(() =>
      agent
        .post("/api/auth/sign-up/email")
        .set("Origin", "http://localhost:5173")
        .send({ email, password, name })
    )

    if (res.status !== 200) {
      return yield* Effect.die(new Error(`Sign up failed with status ${res.status}: ${JSON.stringify(res.body)}`))
    }

    return res.body.user as User
  })

/**
 * Signs in an existing user. The session cookie is stored in the agent's cookie jar.
 */
export const signIn = (
  agent: TestApp,
  email: string,
  password = "testpass123"
): Effect.Effect<void> =>
  Effect.gen(function*() {
    const res = yield* Effect.promise(() =>
      agent
        .post("/api/auth/sign-in/email")
        .set("Origin", "http://localhost:5173")
        .send({ email, password })
    )

    if (res.status !== 200) {
      return yield* Effect.die(new Error(`Sign in failed with status ${res.status}: ${JSON.stringify(res.body)}`))
    }
  })

/**
 * Makes a request using the agent's session cookie jar.
 */
export const authRequest = (
  agent: TestApp,
  method: string,
  path: string,
  body?: unknown
): Effect.Effect<supertest.Response> =>
  Effect.promise(() => {
    const req = agent[method.toLowerCase() as "get"](path).set("Origin", "http://localhost:5173")
    return body !== undefined ? req.send(body as object) : req
  })

/**
 * Makes an unauthenticated request with a Bearer token.
 * Used for API key authenticated endpoints (e.g. the deployments webhook).
 */
export const bearerRequest = (
  agent: TestApp,
  method: string,
  path: string,
  token: string,
  body?: unknown
): Effect.Effect<supertest.Response> =>
  Effect.promise(() => {
    const req = agent[method.toLowerCase() as "get"](path)
      .set("Origin", "http://localhost:5173")
      .set("Authorization", `Bearer ${token}`)
    return body !== undefined ? req.send(body as object) : req
  })
