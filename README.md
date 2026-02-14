# Dtapline

A deployment tracking dashboard that helps teams visualize and manage deployments across multiple environments and services in a 2D matrix view.

## Project Structure

This is a monorepo with 4 packages:

- **`packages/domain`** - Core domain models and schemas (Effect-TS)
- **`packages/api`** - HTTP API server with MongoDB (Effect Platform)
- **`packages/ui`** - React 19 dashboard with TanStack Router and Tailwind CSS
- **`packages/cli`** - CLI tool for CI/CD integration (Effect CLI)

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm 9.10.0
- MongoDB Atlas account (or local MongoDB)
- Gitleaks installed (for secret scanning)

### Installation

```sh
pnpm install
```

### Environment Setup

Create `.env` file in `packages/api/`:

```sh
MONGODB_URI=mongodb+srv://your-connection-string
```

### Development

**Start the API server:**

```sh
cd packages/api
pnpm dev
```

**Start the UI App:**

```sh
cd packages/ui
pnpm dev
```

Visit http://localhost:5173 to access the dashboard.

### CLI Usage

The CLI allows you to report deployments from CI/CD pipelines:

```sh
cd packages/cli

# Using API key from environment
export DTAPLINE_API_KEY=cm_xxxxxxxxxxxxx

# Report a deployment
node bin/dtapline.js deploy \
  production \
  api-service \
  abc123def456 \
  --git-tag v1.2.3 \
  --deployed-by "Azure Pipelines"
```

See `packages/cli/README.md` for full documentation.

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
