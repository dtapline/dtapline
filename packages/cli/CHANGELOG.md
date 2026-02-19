# @dtapline/cli

## 0.4.0

### Minor Changes

- [`1f6e106`](https://github.com/dtapline/dtapline/commit/1f6e1067053234feb6ee9c25ebf85714579e8051) Thanks @floydspace! - Enhanced CLI with comprehensive CI/CD auto-detection and improved configuration handling:

  - **Auto-detect CI/CD metadata**: Automatically extracts commit SHA, git tags, branch, repository URL, and actor from 12 CI/CD platforms (GitHub Actions, Azure Pipelines, GitLab CI, CircleCI, Jenkins, Travis CI, Bitbucket Pipelines, TeamCity, AWS CodeBuild, Google Cloud Build, Drone CI, Bamboo)
  - **Optional commit SHA**: Made `commitSha` argument optional with intelligent fallback chain: CLI arg → CI/CD env vars → local git → error
  - **Environment variable support**: Added `DTAPLINE_SERVER_URL` env var support using Effect's `withFallbackConfig` API
  - **Effect-TS Command API**: Replaced Node's `execSync` with `@effect/platform` Command API for running git commands
  - **Cleaner help output**: Hidden built-in options (`--wizard`, `--completions`, etc.) from help documentation using `CliConfig.layer({ showBuiltIns: false })`
  - **Automatic field population**: Auto-fills `--git-tag` and `--deployed-by` from CI/CD detection when not explicitly provided

  Users can now simply run `dtap deploy <env> <service> --status success` and the CLI will automatically detect all metadata from the CI/CD environment or local git repository.

## 0.3.1

### Patch Changes

- [`82f9e0a`](https://github.com/dtapline/dtapline/commit/82f9e0a05e079e51f8a8d30c1bb0b533b73222f2) Thanks @floydspace! - fix default api domain set in cli

## 0.3.0

### Minor Changes

- [`11ab320`](https://github.com/dtapline/dtapline/commit/11ab32007efaa95da8ffaa552e86656ed1b504c0) Thanks @floydspace! - Rename `--deployment-version` CLI parameter to `--deployed-version` for consistency with `--deployed-by` and improved brevity.

  **BREAKING CHANGE:** Users must update their CI/CD scripts to use `--deployed-version` instead of `--deployment-version`. The old parameter name will no longer be recognized.

## 0.2.2

### Patch Changes

- [`9c56497`](https://github.com/dtapline/dtapline/commit/9c56497b0b0095c4c4acff6207d8385ab8ffc963) Thanks @floydspace! - Fix npm installation error and improve build process

  - Fixed npm installation by bundling internal `@dtapline/domain` package while keeping Effect dependencies external
  - Version is now dynamically injected from package.json at build time instead of being hardcoded
  - Migrated from manual esbuild to tsup for better TypeScript-first bundling experience
  - Cleaner build configuration with TypeScript config file

## 0.2.1

### Patch Changes

- [`dca903e`](https://github.com/dtapline/dtapline/commit/dca903ea19f439000ad2dd55dc3c873028272a6b) Thanks @floydspace! - Fix npm installation error by removing unused workspace dependency

  Removed `@dtapline/domain` dependency from CLI package.json. This dependency was causing installation failures when users installed the CLI from npm because `@dtapline/domain` is a private workspace package not published to npm. The dependency was never actually used in the CLI code - all functionality is self-contained and bundled with esbuild.

## 0.2.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [[`4981ba8`](https://github.com/dtapline/dtapline/commit/4981ba8fc2b8805f90afd341e52c2dd54a0b2e40), [`0573213`](https://github.com/dtapline/dtapline/commit/0573213fcd507d917e2ea4dbed56cd93582ab1fa), [`07efee5`](https://github.com/dtapline/dtapline/commit/07efee5b38b8a1fb0bb1c60ef8183cf2a40bcf5e)]:
  - @dtapline/domain@0.2.0

## 0.1.0

### Minor Changes

- [`d004bc3`](https://github.com/dtapline/dtapline/commit/d004bc321c904a31ad921295c884aeaddfe07596) - first release

### Patch Changes

- Updated dependencies [[`d004bc3`](https://github.com/dtapline/dtapline/commit/d004bc321c904a31ad921295c884aeaddfe07596)]:
  - @dtapline/domain@0.1.0
