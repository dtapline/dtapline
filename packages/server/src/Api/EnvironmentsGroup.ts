import { CloudMatrixApi } from "@cloud-matrix/domain/Api"
import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"
import { EnvironmentsRepository } from "../Repositories/EnvironmentsRepository.js"
import { ProjectsRepository } from "../Repositories/ProjectsRepository.js"

/**
 * Environments API Group implementation
 * Handles CRUD operations for environments, including soft delete (archive) and hard delete
 */
export const EnvironmentsGroupLive = HttpApiBuilder.group(
  CloudMatrixApi,
  "environments",
  (handlers) =>
    Effect.gen(function*() {
      const projectsRepo = yield* ProjectsRepository
      const environmentsRepo = yield* EnvironmentsRepository

      return handlers
        // GET /api/v1/projects/:projectId/environments
        .handle("listEnvironments", ({ path: { projectId } }) =>
          Effect.gen(function*() {
            // Verify project exists
            yield* projectsRepo.findById(projectId)
            const environments = yield* environmentsRepo.findByProjectId(projectId, false)
            return { environments }
          }))
        // POST /api/v1/projects/:projectId/environments
        .handle("createEnvironment", ({ path: { projectId }, payload }) =>
          Effect.gen(function*() {
            const environment = yield* environmentsRepo.create(projectId, payload)
            return { environment }
          }))
        // PUT /api/v1/projects/:projectId/environments/:environmentId
        .handle("updateEnvironment", ({ path: { environmentId }, payload }) =>
          Effect.gen(function*() {
            const environment = yield* environmentsRepo.update(environmentId, payload)
            return { environment }
          }))
        // DELETE /api/v1/projects/:projectId/environments/:environmentId (soft delete/archive)
        .handle("archiveEnvironment", ({ path: { environmentId } }) => environmentsRepo.archive(environmentId))
        // DELETE /api/v1/projects/:projectId/environments/:environmentId/hard (hard delete)
        .handle("deleteEnvironment", ({ path: { environmentId } }) => environmentsRepo.hardDelete(environmentId))
    })
)
