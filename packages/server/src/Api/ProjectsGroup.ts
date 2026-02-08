import { DtaplineApi } from "@dtapline/domain/Api"
import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"
import { ServerConfigService } from "../Config.js"
import { DeploymentsRepository } from "../Repositories/DeploymentsRepository.js"
import { EnvironmentsRepository } from "../Repositories/EnvironmentsRepository.js"
import { ProjectsRepository } from "../Repositories/ProjectsRepository.js"
import { ServicesRepository } from "../Repositories/ServicesRepository.js"
import { ComparisonService } from "../Services/ComparisonService.js"
import { MatrixService } from "../Services/MatrixService.js"

/**
 * Projects API Group implementation
 * Handles CRUD operations for projects, matrix view, deployments list, and environment comparison
 */
export const ProjectsGroupLive = HttpApiBuilder.group(
  DtaplineApi,
  "projects",
  (handlers) =>
    Effect.gen(function*() {
      const config = yield* ServerConfigService
      const projectsRepo = yield* ProjectsRepository
      const environmentsRepo = yield* EnvironmentsRepository
      const servicesRepo = yield* ServicesRepository
      const deploymentsRepo = yield* DeploymentsRepository
      const matrixService = yield* MatrixService
      const comparisonService = yield* ComparisonService

      const userId = config.defaultUserId

      return handlers
        // GET /api/v1/projects
        .handle("listProjects", () =>
          Effect.gen(function*() {
            const projects = yield* projectsRepo.findByUserId(userId)
            return { projects }
          }))
        // POST /api/v1/projects
        .handle("createProject", ({ payload }) =>
          Effect.gen(function*() {
            const project = yield* projectsRepo.create(userId, payload)
            return { project }
          }))
        // GET /api/v1/projects/:projectId
        .handle("getProject", ({ path: { projectId } }) => projectsRepo.findById(projectId))
        // PUT /api/v1/projects/:projectId
        .handle("updateProject", ({ path: { projectId }, payload }) =>
          Effect.gen(function*() {
            const project = yield* projectsRepo.update(projectId, payload)
            return { project }
          }))
        // DELETE /api/v1/projects/:projectId
        .handle("deleteProject", ({ path: { projectId } }) => projectsRepo.delete(projectId))
        // GET /api/v1/projects/:projectId/matrix
        .handle("getMatrix", ({ path: { projectId } }) =>
          Effect.gen(function*() {
            const matrix = yield* matrixService.getMatrix(projectId)

            // Transform the matrix into the API response format
            // The matrix service returns { project, environments, services, matrix }
            // API expects { environments, services, deployments: Record<envId, Record<serviceId, deployment>> }
            const deployments: Record<string, Record<string, typeof matrix.matrix[number][number]["deployment"]>> = {}

            matrix.environments.forEach((env, envIndex) => {
              const envId = String(env.id)
              deployments[envId] = {}
              matrix.services.forEach((service, serviceIndex) => {
                const serviceId = String(service.id)
                // Extract just the deployment field from the MatrixCell
                deployments[envId][serviceId] = matrix.matrix[envIndex][serviceIndex].deployment
              })
            })

            return {
              environments: matrix.environments,
              services: matrix.services,
              deployments
            }
          }))
        // GET /api/v1/projects/:projectId/deployments
        .handle("getDeployments", ({ path: { projectId }, urlParams }) =>
          Effect.gen(function*() {
            // Find deployments with filters
            const deployments = yield* deploymentsRepo.findByFilters(projectId, urlParams)
            const total = yield* deploymentsRepo.countByFilters(projectId, urlParams)

            // Enrich deployments with environment and service data
            const enrichedDeployments = yield* Effect.all(
              deployments.map((deployment) =>
                Effect.gen(function*() {
                  const environment = yield* environmentsRepo.findById(String(deployment.environmentId))
                  const service = yield* servicesRepo.findById(String(deployment.serviceId))
                  return {
                    ...deployment,
                    environment,
                    service
                  }
                })
              )
            )

            return {
              deployments: enrichedDeployments,
              total,
              limit: urlParams.limit ?? 50,
              offset: urlParams.offset ?? 0
            }
          }))
        // GET /api/v1/projects/:projectId/compare
        .handle("compareEnvironments", ({ path: { projectId }, urlParams: { env1, env2 } }) =>
          Effect.gen(function*() {
            const comparison = yield* comparisonService.compareEnvironments(projectId, env1, env2)

            // Transform the comparison result to match the API schema
            // The service returns { environment1, environment2, services, ... }
            // API expects { env1, env2, differences, ... }
            const differences = comparison.services.map((serviceComp) => {
              // Determine status based on versions
              let status: "same" | "different" | "only_in_env1" | "only_in_env2"
              if (serviceComp.environment1Version && serviceComp.environment2Version) {
                status = serviceComp.isDifferent ? "different" : "same"
              } else if (serviceComp.environment1Version) {
                status = "only_in_env1"
              } else if (serviceComp.environment2Version) {
                status = "only_in_env2"
              } else {
                status = "same" // Both null
              }

              return {
                service: serviceComp.service,
                env1Deployment: serviceComp.environment1Version ?
                  {
                    version: serviceComp.environment1Version,
                    commitSha: "", // Not available in ServiceComparison
                    deployedAt: new Date() // Not available
                  } :
                  null,
                env2Deployment: serviceComp.environment2Version ?
                  {
                    version: serviceComp.environment2Version,
                    commitSha: "", // Not available
                    deployedAt: new Date() // Not available
                  } :
                  null,
                status,
                compareUrl: serviceComp.compareUrl ?? undefined
              }
            })

            return {
              env1: comparison.environment1,
              env2: comparison.environment2,
              differences
            }
          }))
    })
)
