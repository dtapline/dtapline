import { DtaplineApi } from "@dtapline/domain/Api"
import { UserId } from "@dtapline/domain/User"
import { HttpApiBuilder } from "@effect/platform"
import { Effect, Schema } from "effect"
import { ServerConfigService } from "../Config.js"

/**
 * User API Group Handler
 * Returns the current user (for MVP, returns the default user from config)
 */
export const UserGroupLive = HttpApiBuilder.group(
  DtaplineApi,
  "user",
  (handlers) =>
    handlers.handle("getCurrentUser", () =>
      Effect.gen(function*() {
        const config = yield* ServerConfigService

        // For MVP: Return hardcoded user from config
        // In production, this would fetch from session/auth system
        return {
          id: Schema.decodeSync(UserId)(config.defaultUserId),
          email: config.defaultUserEmail,
          name: config.defaultUserName,
          createdAt: new Date()
        }
      }))
)
