import { Config, Context, Effect, Layer } from "effect"

/**
 * Server configuration interface
 */
export interface ServerConfig {
  readonly mongodbUri: string
  readonly port: number
  readonly corsOrigins: ReadonlyArray<string>
  readonly defaultUserId: string
  readonly defaultUserEmail: string
  readonly defaultUserName: string
}

/**
 * Service tag for server configuration
 */
export class ServerConfigService extends Context.Tag("ServerConfig")<
  ServerConfigService,
  ServerConfig
>() {}

/**
 * Live implementation that reads configuration from environment variables
 */
export const ServerConfigLive = Layer.effect(
  ServerConfigService,
  Effect.gen(function*() {
    const mongodbUri = yield* Config.string("MONGODB_URI")
    const port = yield* Config.number("PORT").pipe(
      Config.withDefault(3000)
    )
    const corsOriginsStr = yield* Config.string("CORS_ORIGINS").pipe(
      Config.withDefault("http://localhost:5173")
    )
    const corsOrigins = corsOriginsStr.split(",").map((s) => s.trim())

    const defaultUserId = yield* Config.string("DEFAULT_USER_ID").pipe(
      Config.withDefault("default-user")
    )
    const defaultUserEmail = yield* Config.string("DEFAULT_USER_EMAIL").pipe(
      Config.withDefault("team@company.com")
    )
    const defaultUserName = yield* Config.string("DEFAULT_USER_NAME").pipe(
      Config.withDefault("Development Team")
    )

    return {
      mongodbUri,
      port,
      corsOrigins,
      defaultUserId,
      defaultUserEmail,
      defaultUserName
    }
  })
)
