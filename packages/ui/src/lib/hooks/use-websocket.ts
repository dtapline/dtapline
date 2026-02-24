/**
 * useWebSocket hook
 *
 * Manages WebSocket connection lifecycle tied to authentication state.
 * When the user is authenticated, connects to the WebSocket server.
 * When a deployment-created event is received:
 *   1. Immediately updates the matrix cache via setQueryData so the UI
 *      reflects the new deployment without waiting for a network round-trip.
 *   2. Invalidates related queries so they refetch fresh data in the background.
 */
import type { Deployment } from "@dtapline/domain/Deployment"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import type { DeploymentMatrix } from "../api/projects"
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
 * automatically updates React Query caches on deployment events.
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

  // Register message listener for cache updates
  useEffect(() => {
    const unsubscribe = wsClient.addListener((message: WebSocketMessage) => {
      if (message.action === "deployment-created") {
        const payload = message.message as DeploymentCreatedPayload
        const { deployment, projectId } = payload

        // 1. Optimistically update the matrix cache immediately so the UI
        //    reflects the new deployment without waiting for a network round-trip.
        //    Cast to Deployment: DeploymentCell only uses id/version/status/deployedAt;
        //    the background refetch will replace this with the full object.
        const optimisticDeployment = {
          id: deployment.id,
          environmentId: deployment.environmentId,
          serviceId: deployment.serviceId,
          version: deployment.version,
          status: deployment.status,
          deployedAt: new Date(deployment.deployedAt)
        } as unknown as Deployment

        queryClient.setQueryData<DeploymentMatrix>(
          projectKeys.matrix(projectId),
          (prev) => {
            if (!prev) return prev
            return {
              ...prev,
              deployments: {
                ...prev.deployments,
                [deployment.environmentId]: {
                  ...prev.deployments[deployment.environmentId],
                  [deployment.serviceId]: optimisticDeployment
                }
              }
            }
          }
        )

        // 2. Invalidate to trigger a background refetch for full consistency
        //    (the matrix endpoint returns richer data than the WS payload).
        queryClient.invalidateQueries({ queryKey: projectKeys.matrix(projectId) })
        queryClient.invalidateQueries({ queryKey: projectKeys.deployments(projectId) })
        queryClient.invalidateQueries({ queryKey: ["deployment-history", projectId] })
      }
    })

    return unsubscribe
  }, [queryClient])
}
