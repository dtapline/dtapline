# @dtapline/api

## 0.2.3

### Patch Changes

- [`0072ece`](https://github.com/dtapline/dtapline/commit/0072ece0581aafcf324d0b29f17c0262e7a51107) Thanks @floydspace! - Add custom domain support for API Gateway with automatic ACM certificate creation

  - Add Terraform module for API Gateway custom domains
  - Automatically create and validate ACM certificates
  - Add certificate deletion protection (prevent_destroy)
  - Support for both production (api.dtapline.com) and development (development--api.dtapline.com) domains
  - Comprehensive setup documentation with Netlify DNS integration
  - Certificate auto-renewal support
  - New outputs: certificate_validation_records, certificate_status, api_gateway_target_domain

## 0.2.2

### Patch Changes

- [`7580bd5`](https://github.com/dtapline/dtapline/commit/7580bd59ad3e1b5a3bec4f0d55a47639a82d0539) Thanks @floydspace! - fix object id bug

## 0.2.1

### Patch Changes

- [`05ac7f4`](https://github.com/dtapline/dtapline/commit/05ac7f4ea414fb5e9fcd41c041ac388509e0f1f3) Thanks @floydspace! - fix: convert branded UserId to string for MongoDB user lookup in ServicesRepository

  **Bug Fix:** When reporting deployments via CLI, the server was returning a 500 error with "User not found for project" due to a type mismatch in the user lookup query.

  **Root Cause:**
  The `ServicesRepository.getOrCreate()` method queries the user collection to check plan limits. However, `project.userId` is a branded type (`UserId`) while MongoDB stores it as a plain string. MongoDB couldn't match the branded type against the stored string value.

  **Changes:**

  - Convert `project.userId` to plain string using `String()` before querying MongoDB user collection
  - This fixes the user lookup in the plan limit validation flow

  **Impact:**

  - CLI deployments will now successfully complete instead of failing with 500 errors
  - Plan limit checks for auto-created services will work correctly
  - No changes to API behavior or responses, only internal bug fix

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

- [`0573213`](https://github.com/dtapline/dtapline/commit/0573213fcd507d917e2ea4dbed56cd93582ab1fa) Thanks @floydspace! - Add `--deployment-version` flag and update API to accept explicit version

  **CLI:**

  - Added `--deployment-version` optional flag to pass semantic version explicitly
  - Workflows can now provide version explicitly instead of relying on API-side parsing

  **API:**

  - API now prioritizes explicit `version` field from payload over gitTag parsing
  - Version resolution order: `input.version` → `extractVersion(input.gitTag)` → `commitSha.slice(0, 7)`
  - Falls back to short commit SHA (first 7 characters) when version cannot be determined
  - Backward compatible: still falls back to gitTag parsing if version not provided

  **Example usage:**

  ```bash
  # Development (with changesets)
  dtapline deploy dev api ${{ github.sha }} \
    --deployment-version "$(pnpm tsx scripts/get-next-version.ts @dtapline/api)"

  # Production (from git tag @dtapline/api@1.2.3)
  dtapline deploy production api ${{ github.sha }} \
    --deployment-version "${GITHUB_REF_NAME##*@}"
  ```

  **Benefits:**

  - Clearer separation of concerns: version extraction is caller's responsibility
  - More flexible: different environments can use different version strategies
  - Removes need for complex version pattern configuration in API

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

- [`8a78d07`](https://github.com/dtapline/dtapline/commit/8a78d07c719183b616a94c4cbb53afd3f63feb0d) Thanks @floydspace! - Fix 500 Internal Server Error in deployment webhook endpoint when authorization header is missing or invalid. The issue was caused by missing `return` statements after `Effect.fail()` calls, allowing code execution to continue and attempt to access undefined values.

  **Fixed:**

  - Added `return` statements before `yield* Effect.fail()` in authorization validation
  - Properly handles missing Authorization header (returns 401)
  - Properly handles invalid Authorization header format (returns 401)
  - Properly handles insufficient API key scopes (returns 403)

  **Impact:**

  - CLI deployments that were failing with 500 errors will now receive proper 401/403 error responses
  - Error messages are now descriptive and help users fix authentication issues

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

- Updated dependencies [[`4981ba8`](https://github.com/dtapline/dtapline/commit/4981ba8fc2b8805f90afd341e52c2dd54a0b2e40), [`0573213`](https://github.com/dtapline/dtapline/commit/0573213fcd507d917e2ea4dbed56cd93582ab1fa), [`07efee5`](https://github.com/dtapline/dtapline/commit/07efee5b38b8a1fb0bb1c60ef8183cf2a40bcf5e)]:
  - @dtapline/domain@0.2.0

## 0.1.0

### Minor Changes

- [`d004bc3`](https://github.com/dtapline/dtapline/commit/d004bc321c904a31ad921295c884aeaddfe07596) - first release

### Patch Changes

- Updated dependencies [[`d004bc3`](https://github.com/dtapline/dtapline/commit/d004bc321c904a31ad921295c884aeaddfe07596)]:
  - @dtapline/domain@0.1.0
