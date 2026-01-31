import type { Environment, CreateEnvironmentInput, UpdateEnvironmentInput } from "@cloud-matrix/domain/Environment"
import { apiClient } from "./client"

/**
 * Environments API
 */
export const environmentsApi = {
  /**
   * List environments for a project
   */
  list: (projectId: string, includeArchived = false) => {
    const query = includeArchived ? "?includeArchived=true" : ""
    return apiClient.get<{ environments: Environment[] }>(
      `/api/v1/projects/${projectId}/environments${query}`
    )
  },

  /**
   * Create a new environment
   */
  create: (projectId: string, input: typeof CreateEnvironmentInput.Type) =>
    apiClient.post<{ environment: Environment }>(
      `/api/v1/projects/${projectId}/environments`,
      input
    ),

  /**
   * Update an environment
   */
  update: (
    projectId: string,
    environmentId: string,
    input: typeof UpdateEnvironmentInput.Type
  ) =>
    apiClient.put<{ environment: Environment }>(
      `/api/v1/projects/${projectId}/environments/${environmentId}`,
      input
    ),

  /**
   * Archive an environment (soft delete)
   */
  archive: (projectId: string, environmentId: string) =>
    apiClient.delete(`/api/v1/projects/${projectId}/environments/${environmentId}`),

  /**
   * Permanently delete an environment
   */
  hardDelete: (projectId: string, environmentId: string) =>
    apiClient.delete(`/api/v1/projects/${projectId}/environments/${environmentId}/hard`),
}
