import { DtaplineApi } from "@dtapline/domain/Api"
import { HttpApiBuilder } from "@effect/platform"
import { Layer } from "effect"
import { ApiKeysGroupLive } from "./ApiKeysGroup.js"
import { DeploymentsWebhookGroupLive } from "./DeploymentsWebhookGroup.js"
import { EnvironmentsGroupLive } from "./EnvironmentsGroup.js"
import { ProjectsGroupLive } from "./ProjectsGroup.js"
import { ServicesGroupLive } from "./ServicesGroup.js"
import { UserGroupLive } from "./UserGroup.js"
import { VersionPatternsGroupLive } from "./VersionPatternsGroup.js"

/**
 * Complete Dtapline API implementation
 * Combines all API groups into a single HTTP API layer
 */
export const DtaplineApiLive = HttpApiBuilder.api(DtaplineApi).pipe(
  Layer.provide(DeploymentsWebhookGroupLive),
  Layer.provide(ProjectsGroupLive),
  Layer.provide(EnvironmentsGroupLive),
  Layer.provide(ServicesGroupLive),
  Layer.provide(ApiKeysGroupLive),
  Layer.provide(VersionPatternsGroupLive),
  Layer.provide(UserGroupLive)
)
