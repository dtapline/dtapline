/**
 * API Keys React Query Hooks
 */
import type { CreateApiKeyInput } from "@cloud-matrix/domain/ApiKey"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiKeysApi } from "../api"

/**
 * Query Keys
 */
export const apiKeyKeys = {
  all: ["api-keys"] as const,
  lists: () => [...apiKeyKeys.all, "list"] as const,
  list: (projectId: string) => [...apiKeyKeys.lists(), projectId] as const
}

/**
 * Get all API keys for a project
 */
export function useApiKeys(projectId: string) {
  return useQuery({
    queryKey: apiKeyKeys.list(projectId),
    queryFn: async () => {
      const data = await apiKeysApi.list(projectId)
      return data.apiKeys
    },
    enabled: !!projectId
  })
}

/**
 * Create a new API key
 */
export function useCreateApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      input,
      projectId
    }: {
      projectId: string
      input: typeof CreateApiKeyInput.Type
    }) => apiKeysApi.create(projectId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: apiKeyKeys.list(variables.projectId)
      })
    }
  })
}

/**
 * Revoke an API key
 */
export function useRevokeApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      apiKeyId,
      projectId
    }: {
      projectId: string
      apiKeyId: string
    }) => apiKeysApi.revoke(projectId, apiKeyId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: apiKeyKeys.list(variables.projectId)
      })
    }
  })
}
