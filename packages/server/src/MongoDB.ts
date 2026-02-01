import { DatabaseError } from "@cloud-matrix/domain/Errors"
import { Context, Effect, Layer } from "effect"
import type { Db } from "mongodb"
import { MongoClient } from "mongodb"
import { ServerConfigService } from "./Config.js"

/**
 * Service tag for MongoDB database connection
 */
export class MongoDatabase extends Context.Tag("MongoDatabase")<
  MongoDatabase,
  Db
>() {}

/**
 * Cached MongoDB client for Lambda warm starts
 * This prevents reconnecting on every Lambda invocation
 */
let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

/**
 * Live implementation of MongoDB connection with caching
 * - Reuses connection across Lambda invocations (warm starts)
 * - Properly handles connection lifecycle
 * - Uses Effect resource management for graceful shutdown
 */
export const MongoDBLive = Layer.scoped(
  MongoDatabase,
  Effect.gen(function*() {
    const config = yield* ServerConfigService

    // If we have a cached connection, test it and reuse if valid
    if (cachedDb && cachedClient) {
      try {
        // Ping to verify connection is still alive
        yield* Effect.tryPromise({
          try: () => cachedClient!.db("admin").command({ ping: 1 }),
          catch: (error) =>
            new DatabaseError({
              operation: "ping",
              message: "Failed to ping cached MongoDB connection",
              cause: error
            })
        })

        return cachedDb
      } catch {
        // Connection is stale, clear cache and reconnect
        cachedClient = null
        cachedDb = null
      }
    }

    // Create new connection
    const client = yield* Effect.tryPromise({
      try: () =>
        MongoClient.connect(config.mongodbUri, {
          maxPoolSize: 10,
          minPoolSize: 1,
          maxIdleTimeMS: 60000, // Close idle connections after 1 minute
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000
        }),
      catch: (error) =>
        new DatabaseError({
          operation: "connect",
          message: "Failed to connect to MongoDB",
          cause: error
        })
    })

    // Extract database name from MongoDB connection URI
    // The database name is the path segment after the hostname
    const uriMatch = config.mongodbUri.match(/\/\/[^/]+\/([^/?]+)/)
    const dbName = uriMatch?.[1] || "cloudmatrix"
    const db = client.db(dbName)

    // Cache for next invocation
    cachedClient = client
    cachedDb = db

    // Register cleanup finalizer (called when Layer is released)
    // In Lambda, this typically won't be called until container shutdown
    yield* Effect.addFinalizer(() =>
      Effect.tryPromise({
        try: () => {
          if (cachedClient) {
            const clientToClose = cachedClient
            cachedClient = null
            cachedDb = null
            return clientToClose.close()
          }
          return Promise.resolve()
        },
        catch: (error) =>
          new DatabaseError({
            operation: "close",
            message: "Failed to close MongoDB connection",
            cause: error
          })
      }).pipe(Effect.orElseSucceed(() => undefined))
    )

    return db
  })
)

/**
 * Helper to create MongoDB indexes on application startup
 * Call this once when deploying or updating the application
 */
export const createIndexes = Effect.gen(function*() {
  const db = yield* MongoDatabase

  // Deployments indexes (critical for query performance)
  yield* Effect.tryPromise({
    try: () =>
      db.collection("deployments").createIndex(
        { projectId: 1, deployedAt: -1 },
        { background: true }
      ),
    catch: (error) =>
      new DatabaseError({
        operation: "createIndex",
        message: "Failed to create deployments index (projectId, deployedAt)",
        cause: error
      })
  })

  yield* Effect.tryPromise({
    try: () =>
      db.collection("deployments").createIndex(
        { environmentId: 1, serviceId: 1, deployedAt: -1 },
        { background: true }
      ),
    catch: (error) =>
      new DatabaseError({
        operation: "createIndex",
        message: "Failed to create deployments index (environmentId, serviceId, deployedAt)",
        cause: error
      })
  })

  yield* Effect.tryPromise({
    try: () =>
      db.collection("deployments").createIndex(
        { projectId: 1, environmentId: 1, serviceId: 1, status: 1, deployedAt: -1 },
        { background: true }
      ),
    catch: (error) =>
      new DatabaseError({
        operation: "createIndex",
        message: "Failed to create deployments compound index",
        cause: error
      })
  })

  // API keys index
  yield* Effect.tryPromise({
    try: () =>
      db.collection("api_keys").createIndex(
        { projectId: 1, keyHash: 1 },
        { background: true }
      ),
    catch: (error) =>
      new DatabaseError({
        operation: "createIndex",
        message: "Failed to create api_keys index",
        cause: error
      })
  })

  // Version patterns unique index
  yield* Effect.tryPromise({
    try: () =>
      db.collection("version_patterns").createIndex(
        { projectId: 1 },
        { unique: true, background: true }
      ),
    catch: (error) =>
      new DatabaseError({
        operation: "createIndex",
        message: "Failed to create version_patterns unique index",
        cause: error
      })
  })

  // Projects index
  yield* Effect.tryPromise({
    try: () =>
      db.collection("projects").createIndex(
        { userId: 1, createdAt: -1 },
        { background: true }
      ),
    catch: (error) =>
      new DatabaseError({
        operation: "createIndex",
        message: "Failed to create projects index",
        cause: error
      })
  })

  // Environments index
  yield* Effect.tryPromise({
    try: () =>
      db.collection("environments").createIndex(
        { projectId: 1, archived: 1, order: 1 },
        { background: true }
      ),
    catch: (error) =>
      new DatabaseError({
        operation: "createIndex",
        message: "Failed to create environments index",
        cause: error
      })
  })

  // Services index
  yield* Effect.tryPromise({
    try: () =>
      db.collection("services").createIndex(
        { projectId: 1, archived: 1, name: 1 },
        { background: true }
      ),
    catch: (error) =>
      new DatabaseError({
        operation: "createIndex",
        message: "Failed to create services index",
        cause: error
      })
  })
})
