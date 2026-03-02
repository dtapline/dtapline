/**
 * WebSocket connection handler
 *
 * Handles $connect, $disconnect, and $default routes for the
 * WebSocket API Gateway. Uses Better Auth session validation
 * for authenticating connections.
 *
 * Authentication flow:
 * 1. Client connects with ?token=<session_token>
 * 2. Handler queries MongoDB session collection directly for the token
 * 3. On success, stores connection in DynamoDB with userId
 * 4. On disconnect, removes connection from DynamoDB
 */
import type { makeDynamoDBStore } from "@effect-aws/dynamodb"
import { DynamoDBStore } from "@effect-aws/dynamodb"
import * as Effect from "effect/Effect"
import { MongoDatabase } from "../MongoDB.js"
import { websocketEventRouter } from "./router.js"

/**
 * Concrete type for DynamoDBStore instance.
 * TypeScript 5.7+ cannot resolve the proxy types in DynamoDBStore.Type.
 */
type DynamoDBStoreInstance = Effect.Success<ReturnType<typeof makeDynamoDBStore>>

export const handler = websocketEventRouter<DynamoDBStore | MongoDatabase, never>({
  CONNECT: (req, queryParams) =>
    Effect.gen(function*() {
      const token = queryParams?.token
      if (!token) {
        yield* Effect.logError("No session token provided")
        return yield* Effect.die("No session token provided")
      }

      // Query Better Auth's session collection directly using the token field.
      // Better Auth stores sessions in MongoDB with the raw token value as `token`.
      const db = yield* MongoDatabase
      const sessionDoc = yield* Effect.tryPromise({
        try: () => db.collection("session").findOne({ token }),
        catch: (error) => new Error(`MongoDB session lookup failed: ${String(error)}`)
      }).pipe(
        Effect.tapError((error) => Effect.logError("MongoDB session lookup error", { error: String(error) })),
        Effect.orDie
      )

      if (!sessionDoc?.userId) {
        yield* Effect.logError("Invalid session token — no matching session found", {
          token: token.slice(0, 8) + "..."
        })
        return yield* Effect.die("Invalid session token")
      }

      // Check session expiry
      const expiresAt = sessionDoc.expiresAt instanceof Date ? sessionDoc.expiresAt : new Date(sessionDoc.expiresAt)
      if (expiresAt < new Date()) {
        yield* Effect.logError("Session token expired", { expiresAt: expiresAt.toISOString() })
        return yield* Effect.die("Session expired")
      }

      const userId = String(sessionDoc.userId)

      const store = (yield* DynamoDBStore) as DynamoDBStoreInstance
      yield* store.put({
        Item: {
          connectionId: req.connectionId,
          userId,
          ttl: Math.floor(Date.now() / 1000) + 2 * 60 * 60 // 2 hours
        }
      }).pipe(Effect.orDie)

      yield* Effect.logInfo("WebSocket connected", {
        connectionId: req.connectionId,
        userId
      })
    }),

  MESSAGE: (req) => Effect.logInfo("WebSocket message received", { messageId: req.messageId }),

  DISCONNECT: (req) =>
    Effect.gen(function*() {
      const store = (yield* DynamoDBStore) as DynamoDBStoreInstance
      yield* store.delete({
        Key: { connectionId: req.connectionId }
      })
      yield* Effect.logInfo("WebSocket disconnected", {
        connectionId: req.connectionId
      })
    }).pipe(Effect.orDie)
})
