import type { Unauthorized } from "@dtapline/domain/Errors"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ServiceMap from "effect/ServiceMap"
import type { HttpServerRequest } from "effect/unstable/http"
import { Forbidden } from "effect/unstable/httpapi/HttpApiError"
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
          return yield* Effect.fail(new Forbidden({}))
        }
      })

    return AuthorizationService.of({
      requireWriteAccess
    })
  })
)
