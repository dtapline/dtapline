---
"@dtapline/cli": minor
---

Enhanced CLI with comprehensive CI/CD auto-detection and improved configuration handling:

- **Auto-detect CI/CD metadata**: Automatically extracts commit SHA, git tags, branch, repository URL, and actor from 12 CI/CD platforms (GitHub Actions, Azure Pipelines, GitLab CI, CircleCI, Jenkins, Travis CI, Bitbucket Pipelines, TeamCity, AWS CodeBuild, Google Cloud Build, Drone CI, Bamboo)
- **Optional commit SHA**: Made `commitSha` argument optional with intelligent fallback chain: CLI arg → CI/CD env vars → local git → error
- **Environment variable support**: Added `DTAPLINE_SERVER_URL` env var support using Effect's `withFallbackConfig` API
- **Effect-TS Command API**: Replaced Node's `execSync` with `@effect/platform` Command API for running git commands
- **Cleaner help output**: Hidden built-in options (`--wizard`, `--completions`, etc.) from help documentation using `CliConfig.layer({ showBuiltIns: false })`
- **Automatic field population**: Auto-fills `--git-tag` and `--deployed-by` from CI/CD detection when not explicitly provided

Users can now simply run `dtap deploy <env> <service> --status success` and the CLI will automatically detect all metadata from the CI/CD environment or local git repository.
