import type { CreateDeploymentInput, Deployment } from "@cloud-matrix/domain/Deployment"
import type { DatabaseError, EnvironmentNotFound, ProjectNotFound, ServiceNotFound } from "@cloud-matrix/domain/Errors"
import { extractVersion } from "@cloud-matrix/domain/Utils/VersionExtractor"
import { Context, Effect, Layer } from "effect"
import { DeploymentsRepository } from "../Repositories/DeploymentsRepository.js"
import { EnvironmentsRepository } from "../Repositories/EnvironmentsRepository.js"
import { ProjectsRepository } from "../Repositories/ProjectsRepository.js"
import { ServicesRepository } from "../Repositories/ServicesRepository.js"
import { VersionPatternsRepository } from "../Repositories/VersionPatternsRepository.js"
import { getCICDIcon } from "../Utils/CICDIcons.js"

/**
 * Deployment Service
 * Handles webhook processing, auto-creation of environments/services, and version extraction
 */
export class DeploymentService extends Context.Tag("DeploymentService")<
  DeploymentService,
  {
    /**
     * Process a deployment webhook
     * - Auto-creates environment if it doesn't exist
     * - Auto-creates service if it doesn't exist
     * - Extracts version from git tag using configured patterns
     * - Records deployment
     */
    readonly processWebhook: (
      projectId: string,
      input: typeof CreateDeploymentInput.Type
    ) => Effect.Effect<Deployment, ProjectNotFound | DatabaseError>

    /**
     * Record a deployment manually (from API, not webhook)
     * Assumes environment and service already exist
     */
    readonly recordDeployment: (
      projectId: string,
      environmentId: string,
      serviceId: string,
      input: typeof CreateDeploymentInput.Type
    ) => Effect.Effect<Deployment, ProjectNotFound | EnvironmentNotFound | ServiceNotFound | DatabaseError>
  }
>() {}

/**
 * Live implementation of DeploymentService
 */
export const DeploymentServiceLive = Layer.effect(
  DeploymentService,
  Effect.gen(function*() {
    const projectsRepo = yield* ProjectsRepository
    const environmentsRepo = yield* EnvironmentsRepository
    const servicesRepo = yield* ServicesRepository
    const deploymentsRepo = yield* DeploymentsRepository
    const versionPatternsRepo = yield* VersionPatternsRepository

    return {
      processWebhook: (projectId, input) =>
        Effect.gen(function*() {
          // 1. Verify project exists
          yield* projectsRepo.findById(projectId)

          // 2. Get or create environment (auto-creation)
          const environment = yield* environmentsRepo.getOrCreate(
            projectId,
            input.environment,
            // Generate display name: "production" -> "Production"
            input.environment.charAt(0).toUpperCase() + input.environment.slice(1)
          )

          // 3. Get or create service (auto-creation)
          const service = yield* servicesRepo.getOrCreate(
            projectId,
            input.service,
            // Generate display name: "api-server" -> "Api Server"
            input.service
              .split(/[-_]/)
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")
          )

          // 4. Auto-set service icon from CI/CD platform if not already set
          if (!service.iconUrl && input.cicdPlatform) {
            const iconUrl = getCICDIcon(input.cicdPlatform)
            if (iconUrl) {
              // Best-effort: ignore errors if icon update fails
              yield* servicesRepo.update(service.id, { iconUrl }).pipe(
                Effect.catchAll(() => Effect.void)
              )
            }
          }

          // 5. Extract version from git tag using configured pattern
          const versionPattern = yield* versionPatternsRepo.getPatternForService(
            projectId,
            input.service
          )

          const version = input.gitTag
            ? extractVersion(input.gitTag, versionPattern) ?? input.commitSha
            : input.commitSha

          // 6. Record the deployment
          const deployment = yield* deploymentsRepo.create(
            projectId,
            environment.id,
            service.id,
            version,
            input
          )

          return deployment
        }),

      recordDeployment: (projectId, environmentId, serviceId, input) =>
        Effect.gen(function*() {
          // 1. Verify project exists
          yield* projectsRepo.findById(projectId)

          // 2. Verify environment exists
          yield* environmentsRepo.findById(environmentId)

          // 3. Verify service exists
          const service = yield* servicesRepo.findById(serviceId)

          // 4. Extract version from git tag using configured pattern
          const versionPattern = yield* versionPatternsRepo.getPatternForService(
            projectId,
            service.name
          )

          const version = input.gitTag
            ? extractVersion(input.gitTag, versionPattern) ?? input.commitSha
            : input.commitSha

          // 5. Record the deployment
          const deployment = yield* deploymentsRepo.create(
            projectId,
            environmentId,
            serviceId,
            version,
            input
          )

          return deployment
        })
    }
  })
)
