# @dtapline/api

## 0.2.0

### Minor Changes

- [`ae86654`](https://github.com/dtapline/dtapline/commit/ae86654b22cca3e3e31bd869a1ebd88d2e94a744) - Add `--deployment-version` flag and update API to accept explicit version

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

- [`ae86654`](https://github.com/dtapline/dtapline/commit/ae86654b22cca3e3e31bd869a1ebd88d2e94a744) - Add deployment details page and timeline drawer

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

- Updated dependencies [[`ae86654`](https://github.com/dtapline/dtapline/commit/ae86654b22cca3e3e31bd869a1ebd88d2e94a744)]:
  - @dtapline/domain@0.2.0

## 0.1.0

### Minor Changes

- [`d004bc3`](https://github.com/dtapline/dtapline/commit/d004bc321c904a31ad921295c884aeaddfe07596) - first release

### Patch Changes

- Updated dependencies [[`d004bc3`](https://github.com/dtapline/dtapline/commit/d004bc321c904a31ad921295c884aeaddfe07596)]:
  - @dtapline/domain@0.1.0
