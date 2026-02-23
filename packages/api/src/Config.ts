import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ServiceMap from "effect/ServiceMap"

/**
 * Server configuration interface
 */
export interface ServerConfig {
  readonly mongodbUri: string
  readonly corsOrigins: ReadonlyArray<string>
  readonly authSecret: string
  readonly authUrl: string
  readonly githubClientId: string | null
  readonly githubClientSecret: string | null
  readonly selfHosted: boolean
}

/**
 * Service tag for server configuration
 */
export class ServerConfigService extends ServiceMap.Service<
  ServerConfigService,
  ServerConfig
>()("ServerConfig") {}

/**
 * Live implementation that reads configuration from environment variables
 */
export const ServerConfigLive = Layer.effect(
  ServerConfigService,
  Effect.gen(function*() {
    const mongodbUri = yield* Config.string("MONGODB_URI")
    const corsOriginsStr = yield* Config.string("CORS_ORIGINS").pipe(
      Config.withDefault(() => "http://localhost:5173")
    )
    const corsOrigins = corsOriginsStr.split(",").map((s) => s.trim())

    const authSecret = yield* Config.string("AUTH_SECRET")
    const authUrl = yield* Config.string("AUTH_URL").pipe(
      Config.withDefault(() => "http://localhost:3000")
    )

    const githubClientId = yield* Config.string("GITHUB_CLIENT_ID").pipe(
      Config.withDefault(() => null)
    )
    const githubClientSecret = yield* Config.string("GITHUB_CLIENT_SECRET").pipe(
      Config.withDefault(() => null)
    )

    const selfHosted = yield* Config.boolean("SELF_HOSTED").pipe(
      Config.withDefault(() => false)
    )

    return {
      mongodbUri,
      corsOrigins,
      authSecret,
      authUrl,
      githubClientId,
      githubClientSecret,
      selfHosted
    }
  })
)
