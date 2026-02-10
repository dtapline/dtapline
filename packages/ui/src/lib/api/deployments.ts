import type { Deployment } from "@dtapline/domain/Deployment"
import { apiClient } from "./client"

export const deploymentsApi = {
  /**
   * Get a single deployment by ID
   */
  async getDeployment(projectId: string, deploymentId: string): Promise<Deployment> {
    const response = await apiClient.get<Deployment>(`/api/v1/projects/${projectId}/deployments/${deploymentId}`)
    return response
  },

  /**
   * Get deployment history with filters (paginated)
   * Used for timeline view
   */
  async getDeploymentHistory(
    projectId: string,
    filters: {
      serviceId: string
      environmentId: string
      limit: number
      offset: number
    }
  ): Promise<{ deployments: Array<Deployment>; total: number; limit: number; offset: number }> {
    // Build query string
    const params = new URLSearchParams({
      serviceId: filters.serviceId,
      environmentId: filters.environmentId,
      limit: filters.limit.toString(),
      offset: filters.offset.toString()
    })

    const response = await apiClient.get<
      { deployments: Array<Deployment>; total: number; limit: number; offset: number }
    >(
      `/api/v1/projects/${projectId}/deployments?${params.toString()}`
    )
    return response
  }
}
