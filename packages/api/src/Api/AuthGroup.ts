import { DtaplineApi } from "@dtapline/domain/Api"
import { HttpApiBuilder } from "@effect/platform"
import { betterAuthHandler } from "../BetterAuthRouter.js"

/**
 * Auth API Group Handler
 *
 * Forwards all /api/auth/* requests to Better Auth for handling.
 * Better Auth handles:
 * - Sign in/sign up
 * - OAuth flows (GitHub, Google, etc.)
 * - Session management
 * - Email verification
 * - Password reset
 */
export const AuthGroupLive = HttpApiBuilder.group(
  DtaplineApi,
  "auth",
  (handlers) =>
    handlers
      .handle("handleAuth", ({ request }) => betterAuthHandler(request))
      .handle("handleAuthPost", ({ request }) => betterAuthHandler(request))
)
