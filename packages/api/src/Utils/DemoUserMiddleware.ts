import { DemoUserMiddleware } from "@dtapline/domain/Api"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { HttpServerRequest } from "effect/unstable/http"
import { AuthorizationService } from "../Services/AuthorizationService.js"

export const DemoUserMiddlewareLive = Layer.effect(
  DemoUserMiddleware,
  Effect.gen(function*() {
    const authService = yield* AuthorizationService

    // Middleware implementation as an Effect
    // that can access the `HttpServerRequest` context.
    return (res) =>
      Effect.gen(function*() {
        const request = yield* HttpServerRequest.HttpServerRequest

        const allowedCalls = [
          "GET *",
          "POST /api/auth/sign-out"
        ]

        if (
          allowedCalls.some((pattern) => {
            const [method, path] = pattern.split(" ")
            const methodMatch = request.method === method
            const pathMatch = path === "*" || request.url === path
            return methodMatch && pathMatch
          })
        ) {
          return yield* res
        }

        yield* authService.requireWriteAccess(request).pipe(
          Effect.catchTag("Unauthorized", () => Effect.void) // Ignore unauthorized errors, let auth middleware handle it
        )

        return yield* res
      })
  })
)
