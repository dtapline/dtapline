import { CloudMatrixApi } from "@cloud-matrix/domain/Api"
import { HttpApiBuilder } from "@effect/platform"
import { Layer } from "effect"
import { ApiKeysGroupLive } from "./ApiKeysGroup.js"
import { DeploymentsWebhookGroupLive } from "./DeploymentsWebhookGroup.js"
import { EnvironmentsGroupLive } from "./EnvironmentsGroup.js"
import { ProjectsGroupLive } from "./ProjectsGroup.js"
import { ServicesGroupLive } from "./ServicesGroup.js"
import { VersionPatternsGroupLive } from "./VersionPatternsGroup.js"

/**
 * Complete CloudMatrix API implementation
 * Combines all API groups into a single HTTP API layer
 */
export const CloudMatrixApiLive = HttpApiBuilder.api(CloudMatrixApi).pipe(
  Layer.provide(DeploymentsWebhookGroupLive),
  Layer.provide(ProjectsGroupLive),
  Layer.provide(EnvironmentsGroupLive),
  Layer.provide(ServicesGroupLive),
  Layer.provide(ApiKeysGroupLive),
  Layer.provide(VersionPatternsGroupLive)
)
