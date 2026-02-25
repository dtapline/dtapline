# @dtapline/ui

## 0.5.0

### Minor Changes

- [`d94d6c3`](https://github.com/dtapline/dtapline/commit/d94d6c366717c595b384e2d3cd5ca04b8be9f8fe) Thanks @floydspace! - Add Progressive Web App (PWA) support for mobile installation

  Configure `vite-plugin-pwa` with a service worker (auto-update), web app manifest, and Workbox runtime caching for API calls. Add iOS meta tags (`apple-mobile-web-app-capable`, theme color, status bar style) and generate PWA icons (192, 512, 180 apple-touch) from a new branded "d.t.a.p." SVG so the app can be added to the iPhone home screen.

- [#25](https://github.com/dtapline/dtapline/pull/25) [`69eba4c`](https://github.com/dtapline/dtapline/commit/69eba4ca3b4d99adf9d870b9185c2b6089190e6f) Thanks @floydspace! - Add real-time deployment updates via WebSocket

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

### Patch Changes

- [`a30debd`](https://github.com/dtapline/dtapline/commit/a30debd4126794be7ea8bab3e4133d14524575c3) Thanks @floydspace! - fix mobile layout

## 0.4.2

### Patch Changes

- [`7db036b`](https://github.com/dtapline/dtapline/commit/7db036bd589d7f712f80eb8b83b06e9b12a6c11f) Thanks @floydspace! - fix cookie propagation by updating the patched lambda package, and enable github social button

## 0.4.1

### Patch Changes

- Updated dependencies [[`99fe83d`](https://github.com/dtapline/dtapline/commit/99fe83dfc545a1adea9d7fab04fd3b74e32e7abd)]:
  - @dtapline/domain@0.3.1

## 0.4.0

### Minor Changes

- [`cec4c37`](https://github.com/dtapline/dtapline/commit/cec4c379be3c139f7e1be1a2c14cadf94968e2dc) Thanks @floydspace! - Add demo user functionality with read-only access and automatic sign-in route. Demo users can explore the full application with pre-seeded sample data but cannot modify any resources. This provides a public demo experience without requiring account creation.

  **Backend changes:**

  - Added `AuthorizationService` for role-based access control
  - Implemented `DemoUserMiddleware` that blocks all non-GET requests (POST, PUT, PATCH, DELETE) for demo users
  - Added `Forbidden` error response for unauthorized write operations
  - Enhanced Better Auth hooks to prevent demo users from modifying their accounts
  - Created seed script with sample e-commerce microservices data

  **Frontend changes:**

  - Added `/demo` route that automatically signs in as demo user (demo@dtapline.com)
  - Updated UI components to show error messages when demo users attempt write operations
  - Added visual indicators in account settings for demo users
  - Improved error handling in dialogs and forms to display authorization errors

  **Security:**

  - Demo users authenticated via Better Auth with proper session management
  - Write operations blocked at HTTP middleware layer (no endpoint-specific checks needed)
  - Error messages follow standard API format with `_tag` and `message` fields

### Patch Changes

- [`4d36e80`](https://github.com/dtapline/dtapline/commit/4d36e806940b50171027027ee62ebac3534f0549) Thanks @floydspace! - Add automatic diff URL generation for deployments. Diff URLs show code changes between sequential environments (e.g., dev → staging → production) and are auto-generated based on project's repository URL. Supports GitHub, GitLab, Bitbucket, and Azure DevOps. Also improved UI display of repository URLs in service overview.

- Updated dependencies [[`cec4c37`](https://github.com/dtapline/dtapline/commit/cec4c379be3c139f7e1be1a2c14cadf94968e2dc), [`4d36e80`](https://github.com/dtapline/dtapline/commit/4d36e806940b50171027027ee62ebac3534f0549)]:
  - @dtapline/domain@0.3.0

## 0.3.0

### Minor Changes

- [`f3bd40c`](https://github.com/dtapline/dtapline/commit/f3bd40cfbd32d2be9ed554438468e85d9a1db305) Thanks @floydspace! - Add color picker with DTAP preset colors and react-colorful for custom colors

### Patch Changes

- [`c6f5d38`](https://github.com/dtapline/dtapline/commit/c6f5d382f9db86fe76362392363b04ebfebf6517) Thanks @floydspace! - Add Settings placeholder page and link Get Help to GitHub issues

- [`e11c783`](https://github.com/dtapline/dtapline/commit/e11c78353a76bc692649abe1a2e1455ff9361e93) Thanks @floydspace! - Update favicon and page title to use Dtapline branding

## 0.2.1

### Patch Changes

- [`6871798`](https://github.com/dtapline/dtapline/commit/6871798dd99ab5435ac158162fe7eadc310dc78e) Thanks @floydspace! - trigger release due to changed api base url in env vars

## 0.2.0

### Minor Changes

- [`4981ba8`](https://github.com/dtapline/dtapline/commit/4981ba8fc2b8805f90afd341e52c2dd54a0b2e40) Thanks @floydspace! - Add Better Auth authentication system with comprehensive integration tests

  - Implement Better Auth with MongoDB adapter for user authentication
  - Add email/password authentication with session management
  - Configure session cookie handling with cookieCache disabled for database lookups
  - Add authentication API endpoints (signup, login, logout, get-session)
  - Implement AuthService for user management and session validation
  - Add API key authentication alongside Better Auth sessions
  - Create login and signup pages in UI with Better Auth React client
  - Add user menu with logout functionality in sidebar
  - Configure CORS for cross-origin authentication
  - Add role-based access control (freeUser vs proUser for self-hosted)
  - Implement comprehensive integration tests (7 tests) using vitest-mongodb with replica set
  - Add MongoDB in-memory test setup with proper TypeScript configuration
  - Fix session validation issue by disabling cookie cache to force database lookups
  - Update User schema to include role field with proper validation

- [`0573213`](https://github.com/dtapline/dtapline/commit/0573213fcd507d917e2ea4dbed56cd93582ab1fa) Thanks @floydspace! - Add deployment details page and timeline drawer

  **New Features:**

  - **Deployment Details Page**: View comprehensive deployment information including version details, CI/CD info, and status history
  - **Deployment Timeline Drawer**: Octopus Deploy-style slideout showing deployment history with infinite scroll
  - **Status History Tracking**: Deployments now track all status changes over time (e.g., in_progress → failed → in_progress → success)
  - **Breadcrumb Navigation**: Added breadcrumbs to project and deployment pages for better navigation
  - **Clickable Matrix Cells**: Matrix tiles now navigate to deployment details on click

  **Technical Changes:**

  - Added `deploymentHash` field for deterministic deployment identity based on projectId + environmentId + serviceId + commitSha + version
  - Added `statusHistory` array to track all deployment status changes with timestamps and CI/CD info
  - Implemented upsert logic in DeploymentsRepository for retry scenarios (same commit + version = append to statusHistory)
  - Added GET endpoint: `/api/v1/projects/:projectId/deployments/:deploymentId`
  - Route structure: `/project/:projectId/deployments/:deploymentId`
  - Backward compatible with existing deployments (lazy migration for statusHistory)

  **UI Improvements:**

  - Fixed status icon visibility in light mode (icons now use colored text instead of white)
  - Consistent layout across project and deployment detail pages
  - Hover effects on matrix cells and timeline items with 150ms transitions
  - Timeline supports pagination (20 items per page with infinite scroll)

### Patch Changes

- Updated dependencies [[`4981ba8`](https://github.com/dtapline/dtapline/commit/4981ba8fc2b8805f90afd341e52c2dd54a0b2e40), [`0573213`](https://github.com/dtapline/dtapline/commit/0573213fcd507d917e2ea4dbed56cd93582ab1fa), [`07efee5`](https://github.com/dtapline/dtapline/commit/07efee5b38b8a1fb0bb1c60ef8183cf2a40bcf5e)]:
  - @dtapline/domain@0.2.0

## 0.1.0

### Minor Changes

- [`d004bc3`](https://github.com/dtapline/dtapline/commit/d004bc321c904a31ad921295c884aeaddfe07596) - first release

### Patch Changes

- Updated dependencies [[`d004bc3`](https://github.com/dtapline/dtapline/commit/d004bc321c904a31ad921295c884aeaddfe07596)]:
  - @dtapline/domain@0.1.0
