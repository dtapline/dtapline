import type { Environment } from "@dtapline/domain/Environment"
import type { DatabaseError, EnvironmentNotFound, ProjectNotFound } from "@dtapline/domain/Errors"
import type { Service } from "@dtapline/domain/Service"
import { Context, Effect, Layer } from "effect"
import { DeploymentsRepository } from "../Repositories/DeploymentsRepository.js"
import { EnvironmentsRepository } from "../Repositories/EnvironmentsRepository.js"
import { ProjectsRepository } from "../Repositories/ProjectsRepository.js"
import { ServicesRepository } from "../Repositories/ServicesRepository.js"

/**
 * Service comparison - shows version differences between two environments
 */
export interface ServiceComparison {
  service: Service
  environment1Version: string | null
  environment2Version: string | null
  isDifferent: boolean
  compareUrl: string | null // GitHub/GitLab compare URL
}

/**
 * Environment comparison result
 */
export interface EnvironmentComparison {
  project: {
    id: string
    name: string
  }
  environment1: Environment
  environment2: Environment
  services: Array<ServiceComparison>
  totalServices: number
  differentServices: number
}

/**
 * Comparison Service
 * Handles comparing deployment state between environments
 */
export class ComparisonService extends Context.Tag("ComparisonService")<
  ComparisonService,
  {
    /**
     * Compare two environments and show version differences
     * Generates GitHub compare URLs when repository URLs are available
     */
    readonly compareEnvironments: (
      projectId: string,
      environment1Id: string,
      environment2Id: string
    ) => Effect.Effect<EnvironmentComparison, ProjectNotFound | EnvironmentNotFound | DatabaseError>
  }
>() {}

/**
 * Generate GitHub compare URL
 * Example: https://github.com/owner/repo/compare/v1.0.0...v1.1.0
 */
const generateGitHubCompareUrl = (
  repositoryUrl: string | undefined,
  version1: string | null,
  version2: string | null
): string | null => {
  if (!repositoryUrl || !version1 || !version2) {
    return null
  }

  // Parse GitHub URL
  const githubMatch = repositoryUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+?)(\.git)?$/)
  if (!githubMatch) {
    return null
  }

  const [, owner, repo] = githubMatch
  return `https://github.com/${owner}/${repo}/compare/${version1}...${version2}`
}

/**
 * Live implementation of ComparisonService
 */
export const ComparisonServiceLive = Layer.effect(
  ComparisonService,
  Effect.gen(function*() {
    const projectsRepo = yield* ProjectsRepository
    const environmentsRepo = yield* EnvironmentsRepository
    const servicesRepo = yield* ServicesRepository
    const deploymentsRepo = yield* DeploymentsRepository

    return {
      compareEnvironments: (projectId, environment1Id, environment2Id) =>
        Effect.gen(function*() {
          // 1. Verify project exists
          const project = yield* projectsRepo.findById(projectId)

          // 2. Get both environments
          const environment1 = yield* environmentsRepo.findById(environment1Id)
          const environment2 = yield* environmentsRepo.findById(environment2Id)

          // 3. Get all services for the project
          const services = yield* servicesRepo.findByProjectId(projectId, false)

          // 4. For each service, get latest deployments in both environments
          const comparisons: Array<ServiceComparison> = []

          for (const service of services) {
            const deployment1 = yield* deploymentsRepo.getLatestForEnvironmentService(
              environment1Id,
              service.id
            )

            const deployment2 = yield* deploymentsRepo.getLatestForEnvironmentService(
              environment2Id,
              service.id
            )

            const version1 = deployment1?.version ?? null
            const version2 = deployment2?.version ?? null
            const isDifferent = version1 !== version2

            const compareUrl = generateGitHubCompareUrl(
              service.repositoryUrl,
              version1,
              version2
            )

            comparisons.push({
              service,
              environment1Version: version1,
              environment2Version: version2,
              isDifferent,
              compareUrl
            })
          }

          const differentServices = comparisons.filter((c) => c.isDifferent).length

          return {
            project: {
              id: project.id,
              name: project.name
            },
            environment1,
            environment2,
            services: comparisons,
            totalServices: services.length,
            differentServices
          }
        })
    }
  })
)
