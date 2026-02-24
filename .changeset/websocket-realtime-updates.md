---
"@dtapline/api": minor
"@dtapline/ui": minor
---

Add real-time deployment updates via WebSocket

Introduces a WebSocket layer so the dashboard updates instantly when a deployment is recorded via the webhook — no polling required.

**API (`@dtapline/api`)**

- New `websocket-lambda` entry point handles `$connect`, `$disconnect`, and `$default` routes from API Gateway WebSocket
- `$connect` authenticates via a session token passed as a query parameter, then stores the connection ID + user ID in DynamoDB
- New `BroadcastService` scans DynamoDB for connections belonging to a user and posts messages through API Gateway Management API; falls back to a no-op implementation when `WS_API_URL` / `WS_CONNECTIONS_TABLE` are absent (local dev)
- `DeploymentsWebhookGroup` now calls `BroadcastService.sendToUser` after recording a deployment, emitting a `deployment-created` event to all connected clients of that API key's owner
- Terraform modules added for the WebSocket API Gateway and the WebSocket Lambda (`modules/websocket`, `modules/ws-api-gateway`)

**UI (`@dtapline/ui`)**

- New `WebSocketClient` singleton (`lib/websocket.ts`) manages connection lifecycle with exponential-backoff reconnection and listener dispatch
- New `useWebSocket` hook connects automatically when a session is present and disconnects on sign-out
- On `deployment-created` events the hook applies an optimistic `setQueryData` update to the matrix cache so the cell updates immediately, then invalidates related queries for a background refetch
- `useWebSocket` is called once at the root route so the connection is shared across all pages
- `Dashboard` now uses the shared `projectKeys.matrix()` query key factory so WebSocket-driven invalidations reach the correct cached queries
