import { DtaplineApi } from "@dtapline/domain/Api"
import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"
import { ProjectsRepository } from "../Repositories/ProjectsRepository.js"
import { ServicesRepository } from "../Repositories/ServicesRepository.js"

/**
 * Services API Group implementation
 * Handles CRUD operations for services, including soft delete (archive) and hard delete
 */
export const ServicesGroupLive = HttpApiBuilder.group(
  DtaplineApi,
  "services",
  (handlers) =>
    Effect.gen(function*() {
      const projectsRepo = yield* ProjectsRepository
      const servicesRepo = yield* ServicesRepository

      return handlers
        // GET /api/v1/projects/:projectId/services
        .handle("listServices", ({ path: { projectId } }) =>
          Effect.gen(function*() {
            // Verify project exists
            yield* projectsRepo.findById(projectId)
            const services = yield* servicesRepo.findByProjectId(projectId, false)
            return { services }
          }))
        // POST /api/v1/projects/:projectId/services
        .handle("createService", ({ path: { projectId }, payload }) =>
          Effect.gen(function*() {
            const service = yield* servicesRepo.create(projectId, payload)
            return { service }
          }))
        // PUT /api/v1/projects/:projectId/services/:serviceId
        .handle("updateService", ({ path: { serviceId }, payload }) =>
          Effect.gen(function*() {
            const service = yield* servicesRepo.update(serviceId, payload)
            return { service }
          }))
        // DELETE /api/v1/projects/:projectId/services/:serviceId (soft delete/archive)
        .handle("archiveService", ({ path: { serviceId } }) => servicesRepo.archive(serviceId))
        // DELETE /api/v1/projects/:projectId/services/:serviceId/hard (hard delete)
        .handle("deleteService", ({ path: { serviceId } }) => servicesRepo.hardDelete(serviceId))
    })
)
