import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import type * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { Effect } from "effect"
import { Readable } from "node:stream"
import type { ReadableStream as WebReadableStream } from "stream/web"
import { BetterAuthInstance } from "./Auth.js"

/**
 * Effect HTTP handler for Better Auth endpoints
 *
 * Converts Effect HttpServerRequest to standard Web Request,
 * calls Better Auth handler, and converts Response back to Effect HttpServerResponse
 */
export const betterAuthHandler = (req: HttpServerRequest.HttpServerRequest) =>
  Effect.gen(function*() {
    const auth = yield* BetterAuthInstance

    // Convert Effect request headers to Web Headers
    const headers = new Headers(req.headers as Record<string, string>)
    const host = headers.get("host") ?? "localhost:3000"
    const protocol = headers.get("x-forwarded-proto") ?? "http"

    // Build full URL
    const url = req.url.startsWith("http://") || req.url.startsWith("https://")
      ? req.url
      : `${protocol}://${host}${req.url.startsWith("/") ? req.url : `/${req.url}`}`

    // Handle request body for non-GET/HEAD requests
    let bodyInit: BodyInit | null = null
    if (req.method !== "GET" && req.method !== "HEAD") {
      const arrayBuffer = yield* req.arrayBuffer
      if (arrayBuffer.byteLength > 0) {
        bodyInit = new Uint8Array(arrayBuffer)
      } else {
        bodyInit = new Uint8Array(0)
      }
    }

    // Create standard Web Request
    const request = new Request(url, {
      method: req.method,
      headers,
      redirect: "manual",
      body: bodyInit
    })

    // Call Better Auth handler
    const webResponse = yield* Effect.promise(() => auth.handler(request))

    // Convert Web Response headers to Effect headers
    const responseHeaders: Record<string, string> = {}
    webResponse.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value
    })

    // Convert Web Response body stream to Node.js stream
    const stream = webResponse.body
      ? Readable.fromWeb(webResponse.body as WebReadableStream)
      : null

    // Return Effect HttpServerResponse
    return HttpServerResponse.raw(stream).pipe(
      HttpServerResponse.setStatus(webResponse.status),
      HttpServerResponse.setHeaders(responseHeaders)
    )
  }).pipe(
    Effect.catchAll((error) =>
      Effect.logError(error).pipe(
        Effect.zipRight(HttpServerResponse.text("Auth handler error", { status: 500 }))
      )
    )
  )

/**
 * Effect HTTP Layer Router for Better Auth
 *
 * Handles all requests to /api/auth/* and forwards them to Better Auth
 *
 * @example
 * ```typescript
 * const AllRoutes = Layer.mergeAll(
 *   YourApiRoutes,
 *   BetterAuthRouter  // Handles /api/auth/* (provides BetterAuthInstance internally)
 * )
 *
 * const HttpLive = HttpLayerRouter.serve(AllRoutes)
 * ```
 */
export const BetterAuthRouter = HttpLayerRouter.addAll([
  HttpLayerRouter.route("*", "/api/auth/*", betterAuthHandler)
])
