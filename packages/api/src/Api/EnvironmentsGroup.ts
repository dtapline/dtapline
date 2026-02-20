import { DtaplineApi } from "@dtapline/domain/Api"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { EnvironmentsRepository } from "../Repositories/EnvironmentsRepository.js"
import { AuthService } from "../Services/AuthService.js"

/**
 * Environments API Group implementation
 * Environments are now global (per user/tenant) instead of per-project
 */
export const EnvironmentsGroupLive = HttpApiBuilder.group(
  DtaplineApi,
  "environments",
  (handlers) =>
    Effect.gen(function*() {
      const authService = yield* AuthService
      const environmentsRepo = yield* EnvironmentsRepository

      return handlers
        // GET /api/v1/environments
        .handle("listEnvironments", ({ request }) =>
          Effect.gen(function*() {
            const userId = yield* authService.getUserId(request)
            const environments = yield* environmentsRepo.findByUserId(userId, false)
            return { environments }
          }))
        // POST /api/v1/environments
        .handle("createEnvironment", ({ payload, request }) =>
          Effect.gen(function*() {
            const userId = yield* authService.getUserId(request)
            const environment = yield* environmentsRepo.create(userId, payload)
            return { environment }
          }))
        // PUT /api/v1/environments/:environmentId
        .handle("updateEnvironment", ({ params: { environmentId }, payload }) =>
          Effect.gen(function*() {
            const environment = yield* environmentsRepo.update(environmentId, payload)
            return { environment }
          }))
        // PUT /api/v1/environments/:environmentId/reorder
        .handle("reorderEnvironment", ({ params: { environmentId }, payload }) =>
          environmentsRepo.reorder(environmentId, payload.newOrder))
        // DELETE /api/v1/environments/:environmentId (soft delete/archive)
        .handle("archiveEnvironment", ({ params: { environmentId } }) =>
          environmentsRepo.archive(environmentId))
        // DELETE /api/v1/environments/:environmentId/hard (hard delete)
        .handle("deleteEnvironment", ({ params: { environmentId } }) => environmentsRepo.hardDelete(environmentId))
    })
)
