import { DemoUserMiddleware } from "@dtapline/domain/Api"
import { HttpServerRequest } from "@effect/platform"
import { Effect, Layer } from "effect"
import { AuthorizationService } from "../Services/AuthorizationService.js"

export const DemoUserMiddlewareLive = Layer.effect(
  DemoUserMiddleware,
  Effect.gen(function*() {
    const authService = yield* AuthorizationService

    // Middleware implementation as an Effect
    // that can access the `HttpServerRequest` context.
    return Effect.gen(function*() {
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
        return
      }

      yield* authService.requireWriteAccess(request).pipe(
        Effect.catchTag("Unauthorized", () => Effect.void) // Ignore unauthorized errors, let auth middleware handle it
      )
    })
  })
)
