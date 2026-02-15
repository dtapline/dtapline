/**
 * useWebSocket hook
 *
 * Manages WebSocket connection lifecycle tied to authentication state.
 * When the user is authenticated, connects to the WebSocket server.
 * When a deployment-created event is received, invalidates the relevant
 * React Query caches so the matrix and deployment lists update automatically.
 */
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { useSession } from "../auth-client"
import { type WebSocketMessage, wsClient } from "../websocket"
import { projectKeys } from "./use-projects"

interface DeploymentCreatedPayload {
  readonly projectId: string
  readonly deployment: {
    readonly id: string
    readonly environmentId: string
    readonly serviceId: string
    readonly version: string
    readonly status: string
    readonly deployedAt: string
  }
}

/**
 * Hook that connects to WebSocket when authenticated and
 * automatically invalidates React Query caches on deployment events.
 *
 * Should be called once near the root of the component tree.
 */
export function useWebSocket(): void {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const connectedTokenRef = useRef<string | null>(null)

  useEffect(() => {
    const token = session?.session?.token
    if (!token) {
      // Not authenticated — disconnect if we were connected
      if (connectedTokenRef.current) {
        wsClient.disconnect()
        connectedTokenRef.current = null
      }
      return
    }

    // Already connected with this token
    if (connectedTokenRef.current === token) return

    // Connect with new token
    wsClient.disconnect()
    wsClient.connect(token)
    connectedTokenRef.current = token

    return () => {
      wsClient.disconnect()
      connectedTokenRef.current = null
    }
  }, [session?.session?.token])

  // Register message listener for cache invalidation
  useEffect(() => {
    const unsubscribe = wsClient.addListener((message: WebSocketMessage) => {
      if (message.action === "deployment-created") {
        const payload = message.message as DeploymentCreatedPayload
        const { projectId } = payload

        // Invalidate the deployment matrix for this project
        queryClient.invalidateQueries({
          queryKey: projectKeys.matrix(projectId)
        })

        // Invalidate the deployments list for this project
        queryClient.invalidateQueries({
          queryKey: projectKeys.deployments(projectId)
        })

        // Also invalidate deployment history queries
        queryClient.invalidateQueries({
          queryKey: ["deployment-history", projectId]
        })

        console.log(
          `[WS] Deployment created in project ${projectId}, caches invalidated`
        )
      }
    })

    return unsubscribe
  }, [queryClient])
}
