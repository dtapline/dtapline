import type { CreateEnvironmentInput, UpdateEnvironmentInput } from "@dtapline/domain/Environment"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { environmentsApi } from "../api"

/**
 * Query Keys
 */
export const environmentKeys = {
  all: ["environments"] as const,
  lists: () => [...environmentKeys.all, "list"] as const,
  list: (includeArchived = false) => [...environmentKeys.lists(), includeArchived] as const
}

/**
 * Get all environments (global - not project-scoped)
 */
export function useEnvironments(includeArchived = false) {
  return useQuery({
    queryKey: environmentKeys.list(includeArchived),
    queryFn: async () => {
      const data = await environmentsApi.list(includeArchived)
      return data.environments
    }
  })
}

/**
 * Create a new environment
 */
export function useCreateEnvironment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: typeof CreateEnvironmentInput.Type) => environmentsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: environmentKeys.all
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
      input
    }: {
      environmentId: string
      input: typeof UpdateEnvironmentInput.Type
    }) => environmentsApi.update(environmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: environmentKeys.all
      })
    }
  })
}

/**
 * Reorder an environment
 */
export function useReorderEnvironment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ environmentId, newOrder }: { environmentId: string; newOrder: number }) =>
      environmentsApi.reorder(environmentId, newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: environmentKeys.all
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
    mutationFn: (environmentId: string) => environmentsApi.archive(environmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: environmentKeys.all
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
    mutationFn: (environmentId: string) => environmentsApi.hardDelete(environmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: environmentKeys.all
      })
    }
  })
}
