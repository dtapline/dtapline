/**
 * WebSocket connection handler
 *
 * Handles $connect, $disconnect, and $default routes for the
 * WebSocket API Gateway. Uses Better Auth session validation
 * for authenticating connections.
 *
 * Authentication flow:
 * 1. Client connects with ?token=<session_token>
 * 2. Handler validates the session token against Better Auth
 * 3. On success, stores connection in DynamoDB with userId
 * 4. On disconnect, removes connection from DynamoDB
 */
import type { makeDynamoDBStore } from "@effect-aws/dynamodb"
import { DynamoDBStore } from "@effect-aws/dynamodb"
import { Config, Effect } from "effect"
import type { ConfigError } from "effect/ConfigError"
import { websocketEventRouter } from "./router.js"

/**
 * Concrete type for DynamoDBStore instance.
 * TypeScript 5.7+ cannot resolve the proxy types in DynamoDBStore.Type.
 */
type DynamoDBStoreInstance = Effect.Effect.Success<ReturnType<typeof makeDynamoDBStore>>

export const handler = websocketEventRouter<DynamoDBStore, ConfigError>({
  CONNECT: (req, queryParams) =>
    Effect.gen(function*() {
      const token = queryParams?.token
      if (!token) {
        yield* Effect.logError("No session token provided")
        return yield* Effect.die("No session token provided")
      }

      const authUrl = yield* Config.string("AUTH_URL").pipe(Config.withDefault("http://localhost:3000"))

      // Validate session token by calling Better Auth's getSession API
      // We make an HTTP request to the auth endpoint with the session token as a cookie
      const sessionResponse = yield* Effect.tryPromise({
        try: async () => {
          const response = await fetch(`${authUrl}/api/auth/get-session`, {
            headers: {
              cookie: `better-auth.session_token=${token}`
            }
          })
          if (!response.ok) return null
          return await response.json() as { session: { userId: string } | null; user: { id: string } | null }
        },
        catch: (error) => {
          return new Error(`Session validation failed: ${error}`)
        }
      }).pipe(Effect.orDie)

      if (!sessionResponse?.user?.id) {
        yield* Effect.logError("Invalid session token")
        return yield* Effect.die("Invalid session token")
      }

      const userId = sessionResponse.user.id

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
