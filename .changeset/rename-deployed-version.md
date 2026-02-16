---
"@dtapline/cli": minor
---

Rename `--deployment-version` CLI parameter to `--deployed-version` for consistency with `--deployed-by` and improved brevity.

**BREAKING CHANGE:** Users must update their CI/CD scripts to use `--deployed-version` instead of `--deployment-version`. The old parameter name will no longer be recognized.
