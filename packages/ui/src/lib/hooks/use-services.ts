import type { CreateServiceInput, UpdateServiceInput } from "@dtapline/domain/Service"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { servicesApi } from "../api"

/**
 * Query Keys
 */
export const serviceKeys = {
  all: ["services"] as const,
  lists: () => [...serviceKeys.all, "list"] as const,
  list: (projectId: string, includeArchived = false) => [...serviceKeys.lists(), projectId, includeArchived] as const
}

/**
 * Get all services for a project
 */
export function useServices(projectId: string, includeArchived = false) {
  return useQuery({
    queryKey: serviceKeys.list(projectId, includeArchived),
    queryFn: async () => {
      const data = await servicesApi.list(projectId, includeArchived)
      return data.services
    },
    enabled: !!projectId
  })
}

/**
 * Create a new service
 */
export function useCreateService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      input,
      projectId
    }: {
      projectId: string
      input: typeof CreateServiceInput.Type
    }) => servicesApi.create(projectId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.list(variables.projectId)
      })
    }
  })
}

/**
 * Update a service
 */
export function useUpdateService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      input,
      projectId,
      serviceId
    }: {
      projectId: string
      serviceId: string
      input: typeof UpdateServiceInput.Type
    }) => servicesApi.update(projectId, serviceId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.list(variables.projectId)
      })
    }
  })
}

/**
 * Archive a service (soft delete)
 */
export function useArchiveService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      serviceId
    }: {
      projectId: string
      serviceId: string
    }) => servicesApi.archive(projectId, serviceId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.list(variables.projectId)
      })
    }
  })
}

/**
 * Permanently delete a service
 */
export function useDeleteService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      serviceId
    }: {
      projectId: string
      serviceId: string
    }) => servicesApi.hardDelete(projectId, serviceId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.list(variables.projectId)
      })
    }
  })
}
