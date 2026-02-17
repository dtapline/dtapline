# @dtapline/ui

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
