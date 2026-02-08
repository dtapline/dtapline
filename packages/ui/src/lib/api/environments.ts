import type { CreateEnvironmentInput, Environment, UpdateEnvironmentInput } from "@dtapline/domain/Environment"
import { apiClient } from "./client"

/**
 * Environments API (Global - not project-scoped)
 */
export const environmentsApi = {
  /**
   * List all environments for current user
   */
  list: (includeArchived = false) => {
    const query = includeArchived ? "?includeArchived=true" : ""
    return apiClient.get<{ environments: Array<Environment> }>(
      `/api/v1/environments${query}`
    )
  },

  /**
   * Create a new environment
   */
  create: (input: typeof CreateEnvironmentInput.Type) =>
    apiClient.post<{ environment: Environment }>(
      `/api/v1/environments`,
      input
    ),

  /**
   * Update an environment
   */
  update: (
    environmentId: string,
    input: typeof UpdateEnvironmentInput.Type
  ) =>
    apiClient.put<{ environment: Environment }>(
      `/api/v1/environments/${environmentId}`,
      input
    ),

  /**
   * Reorder an environment atomically
   */
  reorder: (environmentId: string, newOrder: number) =>
    apiClient.put(
      `/api/v1/environments/${environmentId}/reorder`,
      { newOrder }
    ),

  /**
   * Archive an environment (soft delete)
   */
  archive: (environmentId: string) => apiClient.delete(`/api/v1/environments/${environmentId}`),

  /**
   * Permanently delete an environment
   */
  hardDelete: (environmentId: string) => apiClient.delete(`/api/v1/environments/${environmentId}/hard`)
}
