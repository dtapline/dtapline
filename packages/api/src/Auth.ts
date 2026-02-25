import type { BetterAuthOptions } from "better-auth"
import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { Context, Effect, Layer } from "effect"
import { ServerConfigService } from "./Config.js"
import { MongoClientTag, MongoDatabase } from "./MongoDB.js"

/**
 * Better Auth instance tag
 */
export class BetterAuthInstance extends Context.Tag("BetterAuthInstance")<
  BetterAuthInstance,
  ReturnType<typeof betterAuth>
>() {}

/**
 * Create Better Auth instance with MongoDB adapter and GitHub OAuth
 */
export const BetterAuthLive = Layer.effect(
  BetterAuthInstance,
  Effect.gen(function*() {
    const config = yield* ServerConfigService
    const db = yield* MongoDatabase
    const client = yield* MongoClientTag

    const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {}

    // Only enable GitHub OAuth if credentials are provided
    if (config.githubClientId && config.githubClientSecret) {
      socialProviders.github = {
        clientId: config.githubClientId,
        clientSecret: config.githubClientSecret
      }
    }

    const auth = betterAuth<BetterAuthOptions>({
      database: mongodbAdapter(db, { client }),
      baseURL: config.authUrl,
      secret: config.authSecret,
      trustedOrigins: [...config.corsOrigins],

      advanced: {
        // Set default cookie attributes to ensure secure cookies with SameSite=None for OAuth flows when using netlify.app subdomains.
        // NOTE: This does not work in iOS Chrome browser due to a known issue with SameSite=None cookies, see https://github.com/better-auth/better-auth/issues/5892
        defaultCookieAttributes: {
          sameSite: "None",
          secure: true
        }
      },

      account: {
        accountLinking: {
          enabled: true
        }
      },

      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false // Set to true in production with email service
      },

      socialProviders,

      user: {
        additionalFields: {
          role: {
            type: "string",
            defaultValue: config.selfHosted ? "proUser" : "freeUser",
            required: true
          }
        },
        deleteUser: {
          enabled: true
        }
      },

      session: {
        cookieCache: {
          enabled: false // Disable cookie cache to force database lookups
        }
      }
    })

    return auth
  })
)
