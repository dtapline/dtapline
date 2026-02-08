/**
 * API Client for Dtapline
 *
 * Simple fetch-based client for making requests to the Dtapline API.
 * Uses standard fetch API for easy integration with React Query.
 */

export interface ApiConfig {
  baseUrl: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/**
 * Create API client with configuration
 */
export function createApiClient(config: ApiConfig) {
  const { baseUrl } = config

  async function request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${baseUrl}${endpoint}`

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers
        }
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new ApiError(
          error.message || `HTTP ${response.status}`,
          response.status,
          error
        )
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(
        error instanceof Error ? error.message : "Network error"
      )
    }
  }

  return {
    get: <T>(endpoint: string) => request<T>(endpoint, { method: "GET" }),

    post: <T, B = unknown>(endpoint: string, body?: B) =>
      request<T>(endpoint, {
        method: "POST",
        body: body ? JSON.stringify(body) : null
      }),

    put: <T, B = unknown>(endpoint: string, body?: B) =>
      request<T>(endpoint, {
        method: "PUT",
        body: body ? JSON.stringify(body) : null
      }),

    delete: (endpoint: string) => request<void>(endpoint, { method: "DELETE" })
  }
}

/**
 * API Client instance
 * Configure the base URL from environment variables
 */
export const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
})
