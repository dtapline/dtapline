import type { Service, CreateServiceInput, UpdateServiceInput } from "@cloud-matrix/domain/Service"
import { apiClient } from "./client"

/**
 * Services API
 */
export const servicesApi = {
  /**
   * List services for a project
   */
  list: (projectId: string, includeArchived = false) => {
    const query = includeArchived ? "?includeArchived=true" : ""
    return apiClient.get<{ services: Service[] }>(
      `/api/v1/projects/${projectId}/services${query}`
    )
  },

  /**
   * Create a new service
   */
  create: (projectId: string, input: typeof CreateServiceInput.Type) =>
    apiClient.post<{ service: Service }>(
      `/api/v1/projects/${projectId}/services`,
      input
    ),

  /**
   * Update a service
   */
  update: (
    projectId: string,
    serviceId: string,
    input: typeof UpdateServiceInput.Type
  ) =>
    apiClient.put<{ service: Service }>(
      `/api/v1/projects/${projectId}/services/${serviceId}`,
      input
    ),

  /**
   * Archive a service (soft delete)
   */
  archive: (projectId: string, serviceId: string) =>
    apiClient.delete(`/api/v1/projects/${projectId}/services/${serviceId}`),

  /**
   * Permanently delete a service
   */
  hardDelete: (projectId: string, serviceId: string) =>
    apiClient.delete(`/api/v1/projects/${projectId}/services/${serviceId}/hard`),
}
