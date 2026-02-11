---
"@dtapline/cli": minor
"@dtapline/api": minor
---

Add `--deployment-version` flag and update API to accept explicit version

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
