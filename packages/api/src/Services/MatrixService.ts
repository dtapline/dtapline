import type { Deployment } from "@dtapline/domain/Deployment"
import type { Environment } from "@dtapline/domain/Environment"
import type { DatabaseError, ProjectNotFound } from "@dtapline/domain/Errors"
import type { Service } from "@dtapline/domain/Service"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ServiceMap from "effect/ServiceMap"
import type { CurrentDeployment } from "../Repositories/DeploymentsRepository.js"
import { DeploymentsRepository } from "../Repositories/DeploymentsRepository.js"
import { EnvironmentsRepository } from "../Repositories/EnvironmentsRepository.js"
import { ProjectsRepository } from "../Repositories/ProjectsRepository.js"
import { ServicesRepository } from "../Repositories/ServicesRepository.js"

/**
 * Matrix cell - represents the deployment state for a specific environment-service pair
 */
export interface MatrixCell {
  environmentId: string
  serviceId: string
  version: string | null
  deployedAt: Date | null
  status: string | null
  deployment: Deployment | null
}

/**
 * Complete deployment matrix for a project
 */
export interface DeploymentMatrix {
  project: {
    id: string
    name: string
  }
  environments: ReadonlyArray<Environment>
  services: ReadonlyArray<Service>
  matrix: Array<Array<MatrixCell>> // [environmentIndex][serviceIndex]
}

/**
 * Matrix Service
 * Handles querying and formatting deployment matrix state
 */
export class MatrixService extends ServiceMap.Service<MatrixService, {
  /**
   * Get the deployment matrix for a project
   * Returns a 2D grid of current deployment state
   */
  readonly getMatrix: (
    projectId: string
  ) => Effect.Effect<DeploymentMatrix, ProjectNotFound | DatabaseError>

  /**
   * Get the current deployment state as a flat list
   * Useful for API responses that don't need matrix structure
   */
  readonly getCurrentState: (
    projectId: string
  ) => Effect.Effect<ReadonlyArray<CurrentDeployment>, ProjectNotFound | DatabaseError>
}>()("MatrixService") {}

/**
 * Live implementation of MatrixService
 */
export const MatrixServiceLive = Layer.effect(
  MatrixService,
  Effect.gen(function*() {
    const projectsRepo = yield* ProjectsRepository
    const environmentsRepo = yield* EnvironmentsRepository
    const servicesRepo = yield* ServicesRepository
    const deploymentsRepo = yield* DeploymentsRepository

    return {
      getMatrix: (projectId) =>
        Effect.gen(function*() {
          // 1. Verify project exists and get details
          const project = yield* projectsRepo.findById(projectId)

          // 2. Get all user's global environments (excluding archived)
          const allEnvironments = yield* environmentsRepo.findByUserId(project.userId, false)

          // 3. Filter environments based on project's selectedEnvironmentIds
          const environments = project.selectedEnvironmentIds
            ? allEnvironments.filter((env) => project.selectedEnvironmentIds!.includes(env.id))
            : allEnvironments

          // 4. Get all services (excluding archived)
          const services = yield* servicesRepo.findByProjectId(projectId, false)

          // 5. Get current deployment state
          const currentDeployments = yield* deploymentsRepo.getCurrentState(projectId)

          // 6. Create lookup map for fast access: environmentId_serviceId -> deployment
          const deploymentMap = new Map<string, CurrentDeployment>()
          for (const deployment of currentDeployments) {
            const key = `${deployment.environmentId}_${deployment.serviceId}`
            deploymentMap.set(key, deployment)
          }

          // 7. Build matrix: [environmentIndex][serviceIndex]
          const matrix: Array<Array<MatrixCell>> = environments.map((env) => {
            return services.map((service) => {
              const key = `${env.id}_${service.id}`
              const deployment = deploymentMap.get(key)

              return {
                environmentId: env.id,
                serviceId: service.id,
                version: deployment?.version ?? null,
                deployedAt: deployment?.deployedAt ?? null,
                status: deployment?.status ?? null,
                deployment: deployment?.deployment ?? null
              }
            })
          })

          return {
            project: {
              id: project.id,
              name: project.name
            },
            environments,
            services,
            matrix
          }
        }),

      getCurrentState: (projectId) =>
        Effect.gen(function*() {
          // 1. Verify project exists
          yield* projectsRepo.findById(projectId)

          // 2. Get current deployment state
          const currentDeployments = yield* deploymentsRepo.getCurrentState(projectId)

          return currentDeployments
        })
    }
  })
)
