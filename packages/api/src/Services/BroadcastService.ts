/**
 * BroadcastService
 *
 * Effect service that handles broadcasting deployment events to
 * connected WebSocket clients. In production (Lambda), it uses
 * DynamoDB + API Gateway Management API. In local dev, it uses
 * in-memory WebSocket connections.
 */
import { ApiGatewayManagementApiService } from "@effect-aws/client-api-gateway-management-api"
import type { makeDynamoDBStore } from "@effect-aws/dynamodb"
import { DynamoDBStore } from "@effect-aws/dynamodb"
import { Config, Context, Effect, Layer, Schema } from "effect"
import { ConnectionsStoreLive } from "../Websocket/context.js"
import { ConnectionRecord, type WebsocketMessage } from "../Websocket/schemas.js"

/**
 * Concrete type for DynamoDBStore instance.
 * TypeScript 5.7+ cannot resolve the proxy types in DynamoDBStore.Type.
 */
type DynamoDBStoreInstance = Effect.Effect.Success<ReturnType<typeof makeDynamoDBStore>>

/**
 * BroadcastService interface
 */
export interface BroadcastService {
  /**
   * Send a WebSocket message to all connections belonging to a user
   */
  readonly sendToUser: <T>(
    userId: string,
    event: WebsocketMessage<T>
  ) => Effect.Effect<void>
}

/**
 * Service tag
 */
export const BroadcastService = Context.GenericTag<BroadcastService>("BroadcastService")

/**
 * Live implementation for AWS Lambda
 * Uses DynamoDB to find connections and API Gateway Management API to push messages
 *
 * Dependencies are captured at layer construction time so the service methods
 * return Effect<void> with no remaining requirements.
 */
export const BroadcastServiceLive = Layer.effect(
  BroadcastService,
  Effect.gen(function*() {
    const store = (yield* DynamoDBStore) as DynamoDBStoreInstance
    const agm = yield* ApiGatewayManagementApiService

    return BroadcastService.of({
      sendToUser: (userId, event) =>
        Effect.gen(function*() {
          const items = yield* store.scan({
            FilterExpression: "#userId = :userId",
            ExpressionAttributeNames: { "#userId": "userId" },
            ExpressionAttributeValues: { ":userId": userId }
          })

          const connections = yield* Schema.decodeUnknown(
            Schema.Array(ConnectionRecord)
          )(items)

          const data = JSON.stringify(event)

          yield* Effect.forEach(
            connections,
            (item) =>
              agm.postToConnection({
                ConnectionId: item.connectionId,
                Data: data
              }).pipe(
                Effect.catchTag("GoneException", (reason) =>
                  Effect.logWarning("WebSocket connection gone", {
                    connectionId: item.connectionId,
                    reason
                  }))
              ),
            { concurrency: "unbounded", discard: true }
          )
        }).pipe(
          // Broadcasting should never fail the main request
          Effect.catchAllCause((cause) => Effect.logWarning("Broadcast failed", { cause, userId }))
        )
    })
  })
)

/**
 * API Gateway Management API layer for broadcasting
 * Reads the WebSocket API URL from environment and configures the management API client
 */
export const AGMApiServiceLive = Effect.gen(function*() {
  const wsApiUrl = yield* Config.string("WS_API_URL")
  const url = new URL(wsApiUrl)
  return ApiGatewayManagementApiService.layer({
    endpoint: `https://${url.host}${url.pathname}`
  })
}).pipe(Layer.unwrapEffect)

/**
 * Complete broadcast layer for production Lambda
 * Provides: BroadcastService
 * Requires: WS_API_URL and WS_CONNECTIONS_TABLE env vars
 */
export const BroadcastLive = BroadcastServiceLive.pipe(
  Layer.provide(AGMApiServiceLive),
  Layer.provide(ConnectionsStoreLive)
)

/**
 * Noop implementation for when WebSocket is not configured
 * (e.g., local development without WebSocket, or when env vars are missing)
 */
export const BroadcastServiceNoop = Layer.succeed(
  BroadcastService,
  BroadcastService.of({
    sendToUser: (_userId, _event) => Effect.void
  })
)
