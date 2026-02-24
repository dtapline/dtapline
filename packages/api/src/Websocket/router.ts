/**
 * WebSocket event router
 *
 * Parses incoming API Gateway WebSocket events and dispatches
 * to the appropriate route handler (CONNECT, MESSAGE, DISCONNECT).
 * Adapted from @pms/websocket router.
 */
import type { APIGatewayProxyResultV2, Context } from "aws-lambda"
import { Effect, Schema } from "effect"
import type {
  QueryParams,
  WebsocketConnectRequest,
  WebsocketDisconnectRequest,
  WebsocketMessageRequest,
  WebsocketRequestContext
} from "./schemas.js"
import { WebsocketEvent } from "./schemas.js"

type RouteFn<T extends WebsocketRequestContext, R, E = never, Q = unknown> = (
  request: T,
  queryParams?: Q
) => Effect.Effect<void, E, R>

type RoutesConfig<R, E> = {
  readonly CONNECT?: RouteFn<WebsocketConnectRequest, R, E, QueryParams>
  readonly MESSAGE?: RouteFn<WebsocketMessageRequest, R, E>
  readonly DISCONNECT?: RouteFn<WebsocketDisconnectRequest, R, E>
}

/**
 * Creates a WebSocket event handler that routes events to the appropriate handler
 */
export const websocketEventRouter = <R, E>(routes: RoutesConfig<R, E>) => (event: unknown, _context: Context) =>
  Effect.gen(function*() {
    const parsed = yield* Schema.decodeUnknown(WebsocketEvent)(event, { errors: "all" })
    const { queryStringParameters, requestContext } = parsed

    const route = routes[requestContext.eventType] as
      | RouteFn<WebsocketRequestContext, R, E>
      | undefined

    if (!route) {
      yield* Effect.logInfo(`Ignoring event ${requestContext.eventType}`)
      return
    }

    yield* route(requestContext, queryStringParameters)
  }).pipe(Effect.map(() => ({ statusCode: 200 }) as APIGatewayProxyResultV2))
