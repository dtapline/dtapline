import { DtaplineApi } from "@dtapline/domain/Api"
import { Deployment } from "@dtapline/domain/Deployment"
import { DeploymentNotFound, PlanLimitExceeded } from "@dtapline/domain/Errors"
import { RoleLimits } from "@dtapline/domain/User"
import * as Effect from "effect/Effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { DeploymentsRepository } from "../Repositories/DeploymentsRepository.js"
import { EnvironmentsRepository } from "../Repositories/EnvironmentsRepository.js"
import { ProjectsRepository } from "../Repositories/ProjectsRepository.js"
import { ServicesRepository } from "../Repositories/ServicesRepository.js"
import { AuthService } from "../Services/AuthService.js"
import { ComparisonService } from "../Services/ComparisonService.js"
import { DeploymentService } from "../Services/DeploymentService.js"
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
      const authService = yield* AuthService
      const projectsRepo = yield* ProjectsRepository
      const environmentsRepo = yield* EnvironmentsRepository
      const servicesRepo = yield* ServicesRepository
      const deploymentsRepo = yield* DeploymentsRepository
      const deploymentService = yield* DeploymentService
      const matrixService = yield* MatrixService
      const comparisonService = yield* ComparisonService

      return handlers
        // GET /api/v1/projects
        .handle("listProjects", ({ request }) =>
          Effect.gen(function*() {
            const userId = yield* authService.getUserId(request)
            const projects = yield* projectsRepo.findByUserId(userId)
            return { projects }
          }))
        // POST /api/v1/projects
        .handle("createProject", ({ payload, request }) =>
          Effect.gen(function*() {
            // Get authenticated user
            const user = yield* authService.getCurrentUser(request)

            // Check project limit for the user's role
            const limit = RoleLimits[user.role].maxProjects
            if (limit !== Infinity) {
              const existingProjects = yield* projectsRepo.findByUserId(user.id)
              if (existingProjects.length >= limit) {
                return yield* Effect.fail(
                  new PlanLimitExceeded({
                    role: user.role,
                    resource: "projects",
                    limit,
                    message:
                      `You have reached the maximum number of projects (${limit}) for your plan. Upgrade to create more projects.`
                  })
                )
              }
            }

            const project = yield* projectsRepo.create(user.id, payload)
            return { project }
          }))
        // GET /api/v1/projects/:projectId
        .handle("getProject", ({ params: { projectId } }) => projectsRepo.findById(projectId))
        // PUT /api/v1/projects/:projectId
        .handle("updateProject", ({ params: { projectId }, payload }) =>
          Effect.gen(function*() {
            const project = yield* projectsRepo.update(projectId, payload)
            return { project }
          }))
        // DELETE /api/v1/projects/:projectId
        .handle("deleteProject", ({ params: { projectId } }) => projectsRepo.delete(projectId))
        // GET /api/v1/projects/:projectId/matrix
        .handle("getMatrix", ({ params: { projectId } }) =>
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
        .handle("getDeployments", ({ params: { projectId }, query }) =>
          Effect.gen(function*() {
            // Find deployments with filters
            const deployments = yield* deploymentsRepo.findByFilters(projectId, query)
            const total = yield* deploymentsRepo.countByFilters(projectId, query)

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
              limit: query.limit ?? 50,
              offset: query.offset ?? 0
            }
          }))
        // GET /api/v1/projects/:projectId/deployments/:deploymentId
        .handle("getDeployment", ({ params: { deploymentId, projectId } }) =>
          Effect.gen(function*() {
            // Verify project exists
            yield* projectsRepo.findById(projectId)

            // Find deployment by ID
            const deployment = yield* deploymentsRepo.findById(String(deploymentId))

            // Verify deployment belongs to this project
            if (String(deployment.projectId) !== projectId) {
              return yield* Effect.fail(
                new DeploymentNotFound({
                  deploymentId: String(deploymentId),
                  message: "Deployment not found in this project"
                })
              )
            }

            // Calculate diff URL on-the-fly if not present (catch errors since it's best-effort)
            const diffUrl = yield* deploymentService.calculateDiffUrl(deployment).pipe(
              Effect.catch(() => Effect.succeed(undefined))
            )

            // Return deployment with calculated diffUrl (must be class instance for Schema.Class encoding)
            const finalDiffUrl = diffUrl ?? deployment.diffUrl
            if (finalDiffUrl != null && finalDiffUrl !== deployment.diffUrl) {
              return new Deployment({ ...deployment, diffUrl: finalDiffUrl })
            }
            return deployment
          }))
        // GET /api/v1/projects/:projectId/compare
        .handle("compareEnvironments", ({ params: { projectId }, query: { env1, env2 } }) =>
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
                ...(serviceComp.compareUrl != null && { compareUrl: serviceComp.compareUrl })
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
