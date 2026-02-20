import { Effect } from "effect"
import type { HttpServerRequest } from "effect/unstable/http"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { BetterAuthInstance } from "./Auth.js"

/**
 * Effect HTTP handler for Better Auth endpoints
 *
 * Converts Effect HttpServerRequest to standard Web Request,
 * calls Better Auth handler, and converts Response back to Effect HttpServerResponse.
 *
 * Uses HttpServerResponse.fromWeb() to properly handle multiple Set-Cookie headers
 * which is critical for OAuth state persistence (prevents state_security_mismatch errors).
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

    // Convert Web Response to Effect HttpServerResponse using fromWeb()
    // This properly preserves multiple Set-Cookie headers (via getSetCookie()),
    // which is essential for OAuth flows where Better Auth sets both a state
    // cookie and other cookies on the same response.
    return HttpServerResponse.fromWeb(webResponse)
  }).pipe(
    Effect.catch((error) =>
      Effect.logError(error).pipe(
        Effect.map(() => HttpServerResponse.text("Auth handler error", { status: 500 }))
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
export const BetterAuthRouter = HttpRouter.addAll([
  HttpRouter.route("*", "/api/auth/*", betterAuthHandler)
])
