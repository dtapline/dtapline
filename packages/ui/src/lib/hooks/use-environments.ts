import type { CreateEnvironmentInput, UpdateEnvironmentInput } from "@cloud-matrix/domain/Environment"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { environmentsApi } from "../api"

/**
 * Query Keys
 */
export const environmentKeys = {
  all: ["environments"] as const,
  lists: () => [...environmentKeys.all, "list"] as const,
  list: (projectId: string, includeArchived = false) =>
    [...environmentKeys.lists(), projectId, includeArchived] as const
}

/**
 * Get all environments for a project
 */
export function useEnvironments(projectId: string, includeArchived = false) {
  return useQuery({
    queryKey: environmentKeys.list(projectId, includeArchived),
    queryFn: async () => {
      const data = await environmentsApi.list(projectId, includeArchived)
      return data.environments
    },
    enabled: !!projectId
  })
}

/**
 * Create a new environment
 */
export function useCreateEnvironment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      input,
      projectId
    }: {
      projectId: string
      input: typeof CreateEnvironmentInput.Type
    }) => environmentsApi.create(projectId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: environmentKeys.list(variables.projectId)
      })
    }
  })
}

/**
 * Update an environment
 */
export function useUpdateEnvironment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      environmentId,
      input,
      projectId
    }: {
      projectId: string
      environmentId: string
      input: typeof UpdateEnvironmentInput.Type
    }) => environmentsApi.update(projectId, environmentId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: environmentKeys.list(variables.projectId)
      })
    }
  })
}

/**
 * Archive an environment (soft delete)
 */
export function useArchiveEnvironment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      environmentId,
      projectId
    }: {
      projectId: string
      environmentId: string
    }) => environmentsApi.archive(projectId, environmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: environmentKeys.list(variables.projectId)
      })
    }
  })
}

/**
 * Permanently delete an environment
 */
export function useDeleteEnvironment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      environmentId,
      projectId
    }: {
      projectId: string
      environmentId: string
    }) => environmentsApi.hardDelete(projectId, environmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: environmentKeys.list(variables.projectId)
      })
    }
  })
}
