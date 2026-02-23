import { DtaplineApi } from "@dtapline/domain/Api"
import { PlanLimitExceeded } from "@dtapline/domain/Errors"
import { RoleLimits } from "@dtapline/domain/User"
import * as Effect from "effect/Effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { ProjectsRepository } from "../Repositories/ProjectsRepository.js"
import { ServicesRepository } from "../Repositories/ServicesRepository.js"
import { AuthService } from "../Services/AuthService.js"

/**
 * Services API Group implementation
 * Handles CRUD operations for services, including soft delete (archive) and hard delete
 */
export const ServicesGroupLive = HttpApiBuilder.group(
  DtaplineApi,
  "services",
  (handlers) =>
    Effect.gen(function*() {
      const authService = yield* AuthService
      const projectsRepo = yield* ProjectsRepository
      const servicesRepo = yield* ServicesRepository

      return handlers
        // GET /api/v1/projects/:projectId/services
        .handle("listServices", ({ params: { projectId } }) =>
          Effect.gen(function*() {
            // Verify project exists
            yield* projectsRepo.findById(projectId)
            const services = yield* servicesRepo.findByProjectId(projectId, false)
            return { services }
          }))
        // POST /api/v1/projects/:projectId/services
        .handle("createService", ({ params: { projectId }, payload, request }) =>
          Effect.gen(function*() {
            // Get authenticated user
            const user = yield* authService.getCurrentUser(request)

            // Check service limit for the user's role
            const limit = RoleLimits[user.role].maxServices
            if (limit !== Infinity) {
              const existingServices = yield* servicesRepo.findByProjectId(projectId, false)
              if (existingServices.length >= limit) {
                return yield* Effect.fail(
                  new PlanLimitExceeded({
                    role: user.role,
                    resource: "services",
                    limit,
                    message:
                      `You have reached the maximum number of services (${limit}) for your plan. Upgrade to create more services.`
                  })
                )
              }
            }

            const service = yield* servicesRepo.create(projectId, payload)
            return { service }
          }))
        // PUT /api/v1/projects/:projectId/services/:serviceId
        .handle("updateService", ({ params: { serviceId }, payload }) =>
          Effect.gen(function*() {
            const service = yield* servicesRepo.update(serviceId, payload)
            return { service }
          }))
        // DELETE /api/v1/projects/:projectId/services/:serviceId (soft delete/archive)
        .handle("archiveService", ({ params: { serviceId } }) => servicesRepo.archive(serviceId))
        // DELETE /api/v1/projects/:projectId/services/:serviceId/hard (hard delete)
        .handle("deleteService", ({ params: { serviceId } }) => servicesRepo.hardDelete(serviceId))
    })
)
