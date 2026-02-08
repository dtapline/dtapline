/**
 * API Keys API Client
 */
import type { ApiKeyResponse, CreateApiKeyInput } from "@dtapline/domain/ApiKey"
import { apiClient } from "./client"

type ApiKeyResponseType = typeof ApiKeyResponse.Type

export const apiKeysApi = {
  /**
   * List all API keys for a project
   */
  list: async (projectId: string): Promise<{ apiKeys: Array<ApiKeyResponseType> }> => {
    return apiClient.get(`/api/v1/projects/${projectId}/api-keys`)
  },

  /**
   * Create a new API key
   */
  create: async (
    projectId: string,
    input: typeof CreateApiKeyInput.Type
  ): Promise<ApiKeyResponseType> => {
    return apiClient.post(`/api/v1/projects/${projectId}/api-keys`, input)
  },

  /**
   * Revoke an API key
   */
  revoke: async (projectId: string, apiKeyId: string): Promise<void> => {
    return apiClient.delete(`/api/v1/projects/${projectId}/api-keys/${apiKeyId}`)
  }
}
