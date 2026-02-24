/**
 * WebSocket client for real-time deployment updates
 *
 * Manages a WebSocket connection with:
 * - Auto-reconnect with exponential backoff
 * - Session-based authentication via query parameter
 * - Event dispatching to registered listeners
 *
 * In local dev, connects to ws://localhost:3000/ws
 * In production, connects to the API Gateway WebSocket URL (VITE_WS_URL)
 */

export interface WebSocketMessage<T = unknown> {
  readonly action: string
  readonly message: T
}

type MessageListener = (message: WebSocketMessage) => void

const MAX_RECONNECT_DELAY = 30_000
const INITIAL_RECONNECT_DELAY = 1_000

/**
 * Derives the WebSocket URL from environment configuration
 *
 * - Production: uses VITE_WS_URL env var (wss://...)
 * - Local dev: derives from the API base URL (ws://localhost:3000/ws)
 */
function getWebSocketUrl(token: string): string {
  const wsUrl = import.meta.env.VITE_WS_URL
  if (wsUrl) {
    return `${wsUrl}?token=${encodeURIComponent(token)}`
  }

  // Local dev: derive from API base URL
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
  const wsBase = apiBase.replace(/^http/, "ws")
  return `${wsBase}/ws?token=${encodeURIComponent(token)}`
}

/**
 * WebSocket connection manager
 *
 * Call `connect()` to establish a connection with the session token.
 * Register listeners with `addListener()` to receive messages.
 * Call `disconnect()` to close and stop reconnecting.
 */
class WebSocketClient {
  private ws: WebSocket | null = null
  private listeners = new Set<MessageListener>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = INITIAL_RECONNECT_DELAY
  private token: string | null = null
  private shouldReconnect = false

  /**
   * Connect to the WebSocket server
   */
  connect(token: string): void {
    this.token = token
    this.shouldReconnect = true
    this.reconnectDelay = INITIAL_RECONNECT_DELAY
    this.doConnect()
  }

  /**
   * Disconnect and stop reconnecting
   */
  disconnect(): void {
    this.shouldReconnect = false
    this.token = null

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close(1000, "Client disconnect")
      this.ws = null
    }
  }

  /**
   * Register a message listener
   * Returns an unsubscribe function
   */
  addListener(listener: MessageListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Whether the connection is currently open
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private doConnect(): void {
    if (!this.token || !this.shouldReconnect) return

    // Close any existing connection
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    const url = getWebSocketUrl(this.token)

    try {
      this.ws = new WebSocket(url)
    } catch {
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      console.log("[WS] Connected")
      // Reset backoff on successful connection
      this.reconnectDelay = INITIAL_RECONNECT_DELAY
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as WebSocketMessage
        for (const listener of this.listeners) {
          try {
            listener(data)
          } catch (err) {
            console.error("[WS] Listener error:", err)
          }
        }
      } catch {
        console.warn("[WS] Failed to parse message:", event.data)
      }
    }

    this.ws.onclose = (event) => {
      console.log(`[WS] Disconnected (code: ${event.code})`)
      this.ws = null

      // Don't reconnect if closed intentionally or auth failed
      if (event.code === 4001 || event.code === 4003) {
        console.warn("[WS] Auth failed, not reconnecting")
        this.shouldReconnect = false
        return
      }

      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      // onclose will fire after this, which handles reconnection
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    console.log(`[WS] Reconnecting in ${this.reconnectDelay}ms...`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.doConnect()
    }, this.reconnectDelay)

    // Exponential backoff with jitter
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2 + Math.random() * 1000,
      MAX_RECONNECT_DELAY
    )
  }
}

/**
 * Singleton WebSocket client instance
 */
export const wsClient = new WebSocketClient()
