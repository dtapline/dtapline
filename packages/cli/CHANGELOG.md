# @dtapline/cli

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

### Patch Changes

- Updated dependencies [[`ae86654`](https://github.com/dtapline/dtapline/commit/ae86654b22cca3e3e31bd869a1ebd88d2e94a744)]:
  - @dtapline/domain@0.2.0

## 0.1.0

### Minor Changes

- [`d004bc3`](https://github.com/dtapline/dtapline/commit/d004bc321c904a31ad921295c884aeaddfe07596) - first release

### Patch Changes

- Updated dependencies [[`d004bc3`](https://github.com/dtapline/dtapline/commit/d004bc321c904a31ad921295c884aeaddfe07596)]:
  - @dtapline/domain@0.1.0
