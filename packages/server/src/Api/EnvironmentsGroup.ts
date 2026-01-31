import { CloudMatrixApi } from "@cloud-matrix/domain/Api"
import { HttpApiBuilder } from "@effect/platform"
import { Config, Effect } from "effect"
import { EnvironmentsRepository } from "../Repositories/EnvironmentsRepository.js"

/**
 * Environments API Group implementation
 * Environments are now global (per user/tenant) instead of per-project
 */
export const EnvironmentsGroupLive = HttpApiBuilder.group(
  CloudMatrixApi,
  "environments",
  (handlers) =>
    Effect.gen(function*() {
      const environmentsRepo = yield* EnvironmentsRepository
      const defaultUserId = yield* Config.string("DEFAULT_USER_ID")

      return handlers
        // GET /api/v1/environments
        .handle("listEnvironments", () =>
          Effect.gen(function*() {
            const environments = yield* environmentsRepo.findByUserId(defaultUserId, false)
            return { environments }
          }))
        // POST /api/v1/environments
        .handle("createEnvironment", ({ payload }) =>
          Effect.gen(function*() {
            const environment = yield* environmentsRepo.create(defaultUserId, payload)
            return { environment }
          }))
        // PUT /api/v1/environments/:environmentId
        .handle("updateEnvironment", ({ path: { environmentId }, payload }) =>
          Effect.gen(function*() {
            const environment = yield* environmentsRepo.update(environmentId, payload)
            return { environment }
          }))
        // PUT /api/v1/environments/:environmentId/reorder
        .handle("reorderEnvironment", ({ path: { environmentId }, payload }) =>
          environmentsRepo.reorder(environmentId, payload.newOrder))
        // DELETE /api/v1/environments/:environmentId (soft delete/archive)
        .handle("archiveEnvironment", ({ path: { environmentId } }) =>
          environmentsRepo.archive(environmentId))
        // DELETE /api/v1/environments/:environmentId/hard (hard delete)
        .handle("deleteEnvironment", ({ path: { environmentId } }) => environmentsRepo.hardDelete(environmentId))
    })
)
