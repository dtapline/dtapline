import type { Deployment } from "@cloud-matrix/domain/Deployment"
import type { Environment } from "@cloud-matrix/domain/Environment"
import type { CreateProjectInput, Project, UpdateProjectInput } from "@cloud-matrix/domain/Project"
import type { Service } from "@cloud-matrix/domain/Service"
import { apiClient } from "./client"

/**
 * Deployment Matrix Response from API
 */
export interface DeploymentMatrix {
  environments: ReadonlyArray<Environment>
  services: ReadonlyArray<Service>
  deployments: Record<string, Record<string, Deployment | null>>
}

/**
 * Projects API
 */
export const projectsApi = {
  /**
   * List all projects
   */
  list: () => apiClient.get<{ projects: Array<Project> }>("/api/v1/projects"),

  /**
   * Get a single project by ID
   */
  get: (projectId: string) => apiClient.get<Project>(`/api/v1/projects/${projectId}`),

  /**
   * Create a new project
   */
  create: (input: typeof CreateProjectInput.Type) => apiClient.post<{ project: Project }>("/api/v1/projects", input),

  /**
   * Update a project
   */
  update: (projectId: string, input: typeof UpdateProjectInput.Type) =>
    apiClient.put<{ project: Project }>(`/api/v1/projects/${projectId}`, input),

  /**
   * Delete a project
   */
  delete: (projectId: string) => apiClient.delete(`/api/v1/projects/${projectId}`),

  /**
   * Get deployment matrix for a project
   */
  getMatrix: (projectId: string) => apiClient.get<DeploymentMatrix>(`/api/v1/projects/${projectId}/matrix`),

  /**
   * List deployments with filters
   */
  listDeployments: (
    projectId: string,
    filters?: {
      environmentId?: string
      serviceId?: string
      limit?: number
      offset?: number
    }
  ) => {
    const params = new URLSearchParams()
    if (filters?.environmentId) params.set("environmentId", filters.environmentId)
    if (filters?.serviceId) params.set("serviceId", filters.serviceId)
    if (filters?.limit) params.set("limit", filters.limit.toString())
    if (filters?.offset) params.set("offset", filters.offset.toString())

    const query = params.toString() ? `?${params.toString()}` : ""
    return apiClient.get<{
      deployments: Array<any> // TODO: Type this properly
      total: number
      limit: number
      offset: number
    }>(`/api/v1/projects/${projectId}/deployments${query}`)
  },

  /**
   * Compare two environments
   */
  compare: (projectId: string, env1Id: string, env2Id: string) =>
    apiClient.get<any>( // TODO: Type this properly
      `/api/v1/projects/${projectId}/compare?env1=${env1Id}&env2=${env2Id}`
    )
}
