import type { CreateDeploymentInput, Deployment } from "@dtapline/domain/Deployment"
import type { Environment } from "@dtapline/domain/Environment"
import type {
  DatabaseError,
  EnvironmentNotFound,
  PlanLimitExceeded,
  ProjectNotFound,
  ServiceNotFound
} from "@dtapline/domain/Errors"
import type { Project } from "@dtapline/domain/Project"
import type { Service } from "@dtapline/domain/Service"
import { extractVersion } from "@dtapline/domain/Utils/VersionExtractor"
import { Effect, Layer, ServiceMap } from "effect"
import { DeploymentsRepository } from "../Repositories/DeploymentsRepository.js"
import { EnvironmentsRepository } from "../Repositories/EnvironmentsRepository.js"
import { ProjectsRepository } from "../Repositories/ProjectsRepository.js"
import { ServicesRepository } from "../Repositories/ServicesRepository.js"
import { VersionPatternsRepository } from "../Repositories/VersionPatternsRepository.js"
import { getCICDIcon } from "../Utils/CICDIcons.js"
import { generateDiffUrl } from "../Utils/DiffUrlGenerator.js"

/**
 * Deployment Service
 * Handles webhook processing, auto-creation of environments/services, and version extraction
 */
export class DeploymentService extends ServiceMap.Service<DeploymentService, {
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
  ) => Effect.Effect<Deployment, ProjectNotFound | DatabaseError | PlanLimitExceeded>

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

  /**
   * Calculate diff URL for a deployment on-the-fly
   * Useful when deployment doesn't have a stored diffUrl
   */
  readonly calculateDiffUrl: (
    deployment: Deployment
  ) => Effect.Effect<string | undefined, ProjectNotFound | EnvironmentNotFound | ServiceNotFound | DatabaseError>
}>()("DeploymentService") {}

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

    /**
     * Helper: Extract version from input
     */
    const extractVersionFromInput = (
      projectId: string,
      serviceName: string,
      input: typeof CreateDeploymentInput.Type
    ): Effect.Effect<string, DatabaseError> =>
      Effect.gen(function*() {
        if (input.version) {
          return input.version
        }
        if (input.gitTag) {
          const versionPattern = yield* versionPatternsRepo.getPatternForService(projectId, serviceName)
          return extractVersion(input.gitTag, versionPattern) ?? input.commitSha.slice(0, 7)
        }
        return input.commitSha.slice(0, 7)
      })

    /**
     * Helper: Generate diff URL between current deployment and next environment
     */
    const generateDiffUrlForDeployment = (
      project: Project,
      environment: Environment,
      service: Service,
      commitSha: string
    ): Effect.Effect<string | undefined, DatabaseError> =>
      Effect.gen(function*() {
        // Try service.repositoryUrl first, fall back to project.gitRepoUrl (for monorepos)
        const repositoryUrl = service.repositoryUrl ?? project.gitRepoUrl
        if (!repositoryUrl) {
          return undefined
        }

        // Get all environments sorted by order to find the next one
        const allEnvironments = yield* environmentsRepo.findByUserId(project.userId)

        // Filter by selected environments if project has specific ones enabled
        const projectEnvironments = project.selectedEnvironmentIds
          ? allEnvironments.filter((env) => project.selectedEnvironmentIds!.includes(env.id))
          : allEnvironments

        // Sort by order
        const sortedEnvironments = [...projectEnvironments].sort((a, b) => a.order - b.order)

        // Find current environment index
        const currentIndex = sortedEnvironments.findIndex((env) => env.id === environment.id)

        // Get next environment (higher order number)
        if (currentIndex !== -1 && currentIndex < sortedEnvironments.length - 1) {
          const nextEnvironment = sortedEnvironments[currentIndex + 1]

          // Get the latest deployment in the next environment for the same service
          const nextDeployment = yield* deploymentsRepo
            .getLatestForEnvironmentService(nextEnvironment.id, service.id)
            .pipe(
              // Ignore errors - if there's no deployment in next env, that's ok
              Effect.catch(() => Effect.succeed(null))
            )

          // Generate diff URL if we have a deployment in the next environment
          if (nextDeployment) {
            const generatedDiffUrl = generateDiffUrl(
              repositoryUrl,
              nextDeployment.commitSha, // FROM: commit in next environment (older)
              commitSha // TO: current commit (newer)
            )
            if (generatedDiffUrl) {
              return generatedDiffUrl
            }
          }
        }

        return undefined
      })

    /**
     * Helper: Create the deployment with version and diff URL
     */
    const createDeploymentWithMetadata = (
      projectId: string,
      project: Project,
      environment: Environment,
      service: Service,
      input: typeof CreateDeploymentInput.Type
    ): Effect.Effect<Deployment, DatabaseError> =>
      Effect.gen(function*() {
        // Extract version
        const version = yield* extractVersionFromInput(projectId, service.name, input)

        // Generate diff URL
        const diffUrl = yield* generateDiffUrlForDeployment(project, environment, service, input.commitSha)

        // Record the deployment
        return yield* deploymentsRepo.create(projectId, environment.id, service.id, version, {
          ...input,
          diffUrl
        })
      })

    return {
      processWebhook: (projectId, input) =>
        Effect.gen(function*() {
          // 1. Verify project exists
          const project = yield* projectsRepo.findById(projectId)

          // 2. Get or create environment (auto-creation)
          const environment = yield* environmentsRepo.getOrCreate(
            project.userId,
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
              yield* servicesRepo.update(service.id, { iconUrl }).pipe(Effect.catch(() => Effect.void))
            }
          }

          // 5. Create deployment with version extraction and diff URL generation
          return yield* createDeploymentWithMetadata(projectId, project, environment, service, input)
        }),

      recordDeployment: (projectId, environmentId, serviceId, input) =>
        Effect.gen(function*() {
          // 1. Verify project exists
          const project = yield* projectsRepo.findById(projectId)

          // 2. Verify environment exists
          const environment = yield* environmentsRepo.findById(environmentId)

          // 3. Verify service exists
          const service = yield* servicesRepo.findById(serviceId)

          // 4. Create deployment with version extraction and diff URL generation
          return yield* createDeploymentWithMetadata(projectId, project, environment, service, input)
        }),

      calculateDiffUrl: (deployment) =>
        Effect.gen(function*() {
          // If deployment already has a diff URL, return it
          if (deployment.diffUrl) {
            return deployment.diffUrl
          }

          // Fetch project to get selectedEnvironmentIds
          const project = yield* projectsRepo.findById(String(deployment.projectId))

          // Fetch environment to get order information
          const environment = yield* environmentsRepo.findById(String(deployment.environmentId))

          // Fetch service to get repositoryUrl
          const service = yield* servicesRepo.findById(String(deployment.serviceId))

          // Generate diff URL using the helper
          return yield* generateDiffUrlForDeployment(project, environment, service, deployment.commitSha)
        })
    }
  })
)
