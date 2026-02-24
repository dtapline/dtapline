/**
 * WebSocket API Gateway event schemas
 *
 * Defines Effect Schema types for API Gateway v2 WebSocket events.
 * Adapted from @pms/websocket schema definitions.
 */
import * as S from "effect/Schema"

// ============================================================================
// Request Context schemas
// ============================================================================

const BaseWebsocketRequest = S.Struct({
  routeKey: S.String,
  extendedRequestId: S.String,
  requestTime: S.String,
  messageDirection: S.Literal("IN"),
  stage: S.String,
  connectedAt: S.Number,
  requestTimeEpoch: S.Number,
  identity: S.Struct({ sourceIp: S.String }),
  requestId: S.String,
  domainName: S.String,
  connectionId: S.String,
  apiId: S.String
})

export const WebsocketConnectRequest = S.Struct({
  eventType: S.Literal("CONNECT")
}).pipe(S.extend(BaseWebsocketRequest))
export type WebsocketConnectRequest = S.Schema.Type<typeof WebsocketConnectRequest>

export const WebsocketMessageRequest = S.Struct({
  eventType: S.Literal("MESSAGE"),
  messageId: S.String
}).pipe(S.extend(BaseWebsocketRequest))
export type WebsocketMessageRequest = S.Schema.Type<typeof WebsocketMessageRequest>

export const WebsocketDisconnectRequest = S.Struct({
  eventType: S.Literal("DISCONNECT"),
  disconnectStatusCode: S.Number,
  disconnectReason: S.String
}).pipe(S.extend(BaseWebsocketRequest))
export type WebsocketDisconnectRequest = S.Schema.Type<typeof WebsocketDisconnectRequest>

export const WebsocketRequestContext = S.Union(
  WebsocketConnectRequest,
  WebsocketMessageRequest,
  WebsocketDisconnectRequest
)
export type WebsocketRequestContext = S.Schema.Type<typeof WebsocketRequestContext>

// ============================================================================
// Query parameters (passed on $connect)
// ============================================================================

export const QueryParams = S.Struct({
  token: S.optional(S.String)
})
export type QueryParams = S.Schema.Type<typeof QueryParams>

// ============================================================================
// Top-level WebSocket event
// ============================================================================

export const WebsocketEvent = S.Struct({
  queryStringParameters: S.optional(QueryParams),
  requestContext: WebsocketRequestContext,
  body: S.optional(S.String),
  isBase64Encoded: S.Boolean
})
export type WebsocketEvent = S.Schema.Type<typeof WebsocketEvent>

// ============================================================================
// WebSocket message types (sent to clients)
// ============================================================================

export interface WebsocketMessage<T> {
  readonly action: string
  readonly message: T
}

export const ConnectionRecord = S.Struct({
  userId: S.String,
  connectionId: S.String
})
export type ConnectionRecord = S.Schema.Type<typeof ConnectionRecord>
