import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { deploymentsApi } from "../api/deployments"

/**
 * Fetch a single deployment by ID
 */
export function useDeployment(projectId: string, deploymentId: string) {
  return useQuery({
    queryKey: ["deployment", projectId, deploymentId],
    queryFn: () => deploymentsApi.getDeployment(projectId, deploymentId),
    enabled: !!projectId && !!deploymentId
  })
}

/**
 * Fetch deployment history for a service+environment combination
 * Supports infinite scrolling (20 items per page)
 */
export function useDeploymentHistory(
  projectId: string,
  filters: {
    serviceId: string
    environmentId: string
  }
) {
  return useInfiniteQuery({
    queryKey: ["deployment-history", projectId, filters.serviceId, filters.environmentId],
    queryFn: ({ pageParam = 0 }) =>
      deploymentsApi.getDeploymentHistory(projectId, {
        ...filters,
        limit: 20,
        offset: pageParam
      }),
    getNextPageParam: (lastPage, allPages) => {
      const currentOffset = allPages.length * 20
      return currentOffset < lastPage.total ? currentOffset : undefined
    },
    initialPageParam: 0,
    enabled: !!projectId && !!filters.serviceId && !!filters.environmentId
  })
}
