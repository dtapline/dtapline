import { Forbidden, Unauthorized } from "@dtapline/domain/Errors"
import type { User, UserRole } from "@dtapline/domain/User"
import { UserId } from "@dtapline/domain/User"
import type { HttpServerRequest } from "@effect/platform"
import { Context, Effect, Layer, Schema } from "effect"
import { BetterAuthInstance } from "../Auth.js"

/**
 * AuthService interface
 */
export interface AuthService {
  /**
   * Get the currently authenticated user from the request
   * Fails with Unauthorized if no valid session
   */
  readonly getCurrentUser: (
    request: HttpServerRequest.HttpServerRequest
  ) => Effect.Effect<User, Unauthorized>

  /**
   * Require that the current user has a specific role
   * Fails with Forbidden if the user doesn't have the required role
   */
  readonly requireRole: (
    request: HttpServerRequest.HttpServerRequest,
    role: UserRole
  ) => Effect.Effect<User, Unauthorized | Forbidden>

  /**
   * Get user ID from request (convenience method)
   */
  readonly getUserId: (
    request: HttpServerRequest.HttpServerRequest
  ) => Effect.Effect<Schema.Schema.Type<typeof UserId>, Unauthorized>
}

/**
 * Service tag for authentication
 */
export const AuthService = Context.GenericTag<AuthService>("AuthService")

/**
 * Live implementation of AuthService using Better Auth
 */
export const AuthServiceLive = Layer.effect(
  AuthService,
  Effect.gen(function*() {
    const auth = yield* BetterAuthInstance

    const getCurrentUser = (
      request: HttpServerRequest.HttpServerRequest
    ): Effect.Effect<User, Unauthorized> =>
      Effect.gen(function*() {
        // Convert Effect HttpServerRequest to standard Request
        const headers = request.headers
        const standardHeaders = new Headers()
        for (const [key, value] of Object.entries(headers)) {
          standardHeaders.set(key, value)
        }

        // Get session from Better Auth
        const session = yield* Effect.tryPromise({
          try: async () => {
            const result = await auth.api.getSession({
              headers: standardHeaders
            })
            return result
          },
          catch: () =>
            new Unauthorized({
              message: "No valid session found"
            })
        })

        // Check if session exists and has a user
        if (!session?.session || !session?.user) {
          return yield* Effect.fail(
            new Unauthorized({
              message: "No valid session found"
            })
          )
        }

        // Convert Better Auth user to our User type
        const userId = Schema.decodeSync(UserId)(session.user.id)

        // Better Auth stores custom fields in the user object
        const betterAuthUser = session.user as typeof session.user & {
          role?: string
        }

        const user: User = {
          id: userId,
          email: session.user.email,
          name: session.user.name,
          emailVerified: session.user.emailVerified,
          image: session.user.image ?? null,
          role: (betterAuthUser.role || "freeUser") as UserRole,
          createdAt: new Date(session.user.createdAt),
          updatedAt: new Date(session.user.updatedAt)
        }

        return user
      })

    const requireRole = (
      request: HttpServerRequest.HttpServerRequest,
      requiredRole: UserRole
    ): Effect.Effect<User, Unauthorized | Forbidden> =>
      Effect.gen(function*() {
        const user = yield* getCurrentUser(request)

        if (user.role !== requiredRole && user.role !== "admin") {
          return yield* Effect.fail(
            new Forbidden({
              resource: "role:" + requiredRole,
              message: `This action requires ${requiredRole} role`
            })
          )
        }

        return user
      })

    const getUserId = (
      request: HttpServerRequest.HttpServerRequest
    ): Effect.Effect<Schema.Schema.Type<typeof UserId>, Unauthorized> =>
      Effect.gen(function*() {
        const user = yield* getCurrentUser(request)
        return user.id
      })

    return AuthService.of({
      getCurrentUser,
      requireRole,
      getUserId
    })
  })
)
