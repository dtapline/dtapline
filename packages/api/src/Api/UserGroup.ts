import { DtaplineApi } from "@dtapline/domain/Api"
import * as Effect from "effect/Effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { AuthService } from "../Services/AuthService.js"

/**
 * User API Group Handler
 * Returns the currently authenticated user
 */
export const UserGroupLive = HttpApiBuilder.group(
  DtaplineApi,
  "user",
  (handlers) =>
    handlers.handle("getCurrentUser", ({ request }) =>
      Effect.gen(function*() {
        const authService = yield* AuthService
        const user = yield* authService.getCurrentUser(request)
        return user
      }))
)
