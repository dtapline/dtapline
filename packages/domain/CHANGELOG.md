# @dtapline/domain

## 0.3.0

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

## 0.2.0

### Minor Changes

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

- [`07efee5`](https://github.com/dtapline/dtapline/commit/07efee5b38b8a1fb0bb1c60ef8183cf2a40bcf5e) Thanks @floydspace! - fix: enforce plan limits when auto-creating services via CLI/webhook

  **Security Fix:** When deployments are reported via CLI using API tokens, services are automatically created if they don't exist. This was bypassing plan limit checks, allowing free users to exceed the 3-service limit.

  **Changes:**

  - Added plan limit validation to `ServicesRepository.getOrCreate()`
  - Service auto-creation now checks the project owner's role and enforces `RoleLimits`
  - Returns `PlanLimitExceeded` error (403) if limit would be exceeded
  - Updated webhook API to handle `PlanLimitExceeded` error responses

  **Impact:**

  - Free users (3 service limit) can no longer bypass restrictions via CLI
  - Premium users (10 service limit) are also properly enforced
  - Enterprise users (unlimited) are unaffected
  - CLI will receive clear error message when limit is reached

  **Example Error Response:**

  ```json
  {
    "_tag": "PlanLimitExceeded",
    "role": "freeUser",
    "resource": "services",
    "limit": 3,
    "message": "You have reached the maximum number of services (3) for your plan. Upgrade to create more services."
  }
  ```

## 0.1.0

### Minor Changes

- [`d004bc3`](https://github.com/dtapline/dtapline/commit/d004bc321c904a31ad921295c884aeaddfe07596) - first release
