# Dtapline

**Track and visualize deployments across your environments and services.**

Dtapline helps teams answer questions like "What version is running in production?" and "When was the last deployment to staging?" with a simple 2D matrix dashboard. Integrate with your CI/CD pipeline to automatically report deployments.

## Quick Start

### CLI Usage

The CLI allows you to report deployments from CI/CD pipelines:

```sh
cd packages/cli

# Using API key from environment
export DTAPLINE_API_KEY=cm_xxxxxxxxxxxxx

# Report a deployment
pnpm --package=@dtapline/cli dlx dtapline deploy \
  production \
  api-service \
  abc123def456 \
  --status success \
  --deployed-version v1.2.3 \
  --deployed-by "Jenkins" \
```

See [packages/cli/README.md](packages/cli/README.md) for full documentation.

## Operations

**Building**

To build all packages in the monorepo:

```sh
pnpm build
```

**Type Checking**

```sh
pnpm check
```

**Testing**

To test all packages in the monorepo:

```sh
pnpm test
```

**Secret Scanning**

Run Gitleaks to check for secrets:

```sh
pnpm gitleaks              # Full repository scan
pnpm gitleaks:staged       # Check only staged files
pnpm gitleaks:report       # Generate JSON report
```

Gitleaks automatically runs on `git push` via Husky pre-push hook to prevent secrets from being committed.

## Release and Deployment

Dtapline uses **Changesets** for version management and automated deployments:

```sh
# Create a changeset for your changes
pnpm changeset

# Commit and push - this creates a "Version Packages" PR
git add .changeset && git commit -m "chore: add changeset" && git push

# Merge the PR to trigger production deployments
# - CLI publishes to NPM
# - API deploys to AWS Lambda
# - UI deploys to Netlify
```

See the [Release Pipeline Guide](docs/release-pipeline.md) for complete documentation.

## Running Code

This template leverages [tsx](https://tsx.is) to allow execution of TypeScript files via NodeJS as if they were written in plain JavaScript.

To execute a file with `tsx`:

```sh
pnpm tsx ./path/to/the/file.ts
```
