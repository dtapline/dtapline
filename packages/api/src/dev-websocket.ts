/**
 * Local development WebSocket server
 *
 * Uses the `ws` library to provide WebSocket support in the local dev server.
 * Stores connections in-memory (no DynamoDB needed).
 * Validates sessions using Better Auth.
 */
import type { Server } from "node:http"
import { URL } from "node:url"
import { WebSocketServer } from "ws"
import type { WebSocket } from "ws"
import type { WebsocketMessage } from "./Websocket/schemas.js"

interface Connection {
  readonly ws: WebSocket
  readonly userId: string
}

// In-memory connection store
const connections = new Map<string, Connection>()

let connectionIdCounter = 0

/**
 * Attach a WebSocket server to the HTTP server for local development
 *
 * @param server - The Node.js HTTP server to attach to
 * @param validateSession - Function to validate a session token and return userId
 */
export function attachWebSocketServer(
  server: Server,
  validateSession: (token: string) => Promise<string | null>
): void {
  // Use noServer: true to manually handle the upgrade event
  // This prevents conflicts with Effect's HTTP handler
  const wss = new WebSocketServer({ noServer: true })

  console.log("🔌 [WS] Attaching WebSocket server...")

  // Use prependListener to ensure our handler runs BEFORE Effect's upgrade handler
  // This is critical because Effect also attaches an upgrade handler
  server.prependListener("upgrade", async (req, socket, head) => {
    console.log(`🔌 [WS] Upgrade event received for: ${req.url}`)

    const url = new URL(req.url || "/", `http://${req.headers.host}`)

    // Only handle /ws path - let Effect handle other WebSocket routes
    if (url.pathname !== "/ws") {
      console.log(`🔌 [WS] Ignoring upgrade for non-/ws path: ${url.pathname}`)
      // Don't destroy the socket - let Effect's handler process it
      return
    }

    const token = url.searchParams.get("token")

    if (!token) {
      console.log("❌ [WS] Missing token, rejecting connection")
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n")
      socket.destroy()
      return
    }

    const userId = await validateSession(token)
    if (!userId) {
      console.log("❌ [WS] Invalid token, rejecting connection")
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n")
      socket.destroy()
      return
    }

    console.log(`🔌 [WS] Token validated for user: ${userId}, completing handshake...`)

    // Complete the WebSocket handshake
    wss.handleUpgrade(req, socket, head, (ws) => {
      const connectionId = `local-${++connectionIdCounter}`
      connections.set(connectionId, { ws, userId })

      console.log(`🔌 [WS] Connected: ${connectionId} (user: ${userId})`)

      ws.on("close", () => {
        connections.delete(connectionId)
        console.log(`🔌 [WS] Disconnected: ${connectionId}`)
      })

      ws.on("error", (error) => {
        console.error(`❌ [WS] Error on ${connectionId}:`, error)
        connections.delete(connectionId)
      })

      wss.emit("connection", ws, req)
    })
  })

  console.log("🔌 [WS] WebSocket server attached at ws://localhost:3000/ws")
}

/**
 * Send a message to all connections belonging to a specific user
 * Used by the local BroadcastService implementation
 */
export function sendToUserLocal<T>(userId: string, event: WebsocketMessage<T>): void {
  const data = JSON.stringify(event)

  for (const [connectionId, conn] of connections) {
    if (conn.userId === userId && conn.ws.readyState === conn.ws.OPEN) {
      try {
        conn.ws.send(data)
        console.log(`📤 [WS] Sent to ${connectionId}: ${event.action}`)
      } catch (error) {
        console.error(`❌ [WS] Failed to send to ${connectionId}:`, error)
        connections.delete(connectionId)
      }
    }
  }
}
