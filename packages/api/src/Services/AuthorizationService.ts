import type { Unauthorized } from "@dtapline/domain/Errors"
import { Forbidden } from "@dtapline/domain/Errors"
import { Effect, Layer, ServiceMap } from "effect"
import type { HttpServerRequest } from "effect/unstable/http"
import { AuthService } from "./AuthService.js"

/**
 * Authorization service for access control
 *
 * Handles role-based authorization checks,  specifically for read-only users (demo accounts).
 */
export interface AuthorizationService {
  /**
   * Require write access for the current user
   *
   * Fails with Forbidden if user has a read-only role (e.g., demoUser)
   */
  readonly requireWriteAccess: (
    request: HttpServerRequest.HttpServerRequest
  ) => Effect.Effect<void, Forbidden | Unauthorized>
}

export const AuthorizationService = ServiceMap.Service<AuthorizationService>("AuthorizationService")

export const AuthorizationServiceLive = Layer.effect(
  AuthorizationService,
  Effect.gen(function*() {
    const authService = yield* AuthService

    const requireWriteAccess = (
      request: HttpServerRequest.HttpServerRequest
    ): Effect.Effect<void, Forbidden | Unauthorized> =>
      Effect.gen(function*() {
        const user = yield* authService.getCurrentUser(request)

        if (user.role === "demoUser") {
          return yield* Effect.fail(
            new Forbidden({
              resource: "write_operations",
              message: "Demo users have read-only access. Sign up to create and modify resources."
            })
          )
        }
      })

    return AuthorizationService.of({
      requireWriteAccess
    })
  })
)
