# Release Pipeline

Complete guide to the automated release and deployment pipeline for Dtapline.

## Overview

Dtapline uses **Changesets** for version management and automated deployments. The pipeline consists of:

1. **Release workflow** (`.github/workflows/release.yml`) - Creates version PRs and publishes tags
2. **Package-specific deployment workflows** - Deploy when tags are pushed
   - `.github/workflows/deploy-cli.yml` - Publishes CLI to NPM
   - `.github/workflows/deploy-api.yml` - Deploys API to AWS Lambda
   - `.github/workflows/deploy-ui.yml` - Deploys UI to Netlify

## How It Works

### 1. Creating a Release

```bash
# Create a changeset describing your changes
pnpm changeset

# Select which packages to version (cli, api, ui)
# Choose version bump (patch, minor, major)
# Write a summary of the changes

# Commit and push the changeset
git add .changeset
git commit -m "chore: add changeset for feature X"
git push origin main
```

### 2. Version Packages PR

When changesets are pushed to `main`, the release workflow automatically:

1. Creates/updates a "Version Packages" PR
2. The PR contains:
   - Updated `package.json` files with new versions
   - Generated `CHANGELOG.md` files
   - Consumes the changeset files

### 3. Publishing the Release

When you merge the "Version Packages" PR:

1. **Release workflow runs** (`.github/workflows/release.yml`)

   - Uses `changesets/action@v1` with `publish: pnpm changeset tag`
   - Creates git tags for each versioned package (e.g., `@dtapline/cli@0.1.0`)
   - Pushes tags using a **Personal Access Token (PAT)**

2. **Tags trigger deployment workflows**

   - `@dtapline/cli@*` → Publishes to NPM
   - `@dtapline/api@*` → Deploys to AWS Lambda (Terraform)
   - `@dtapline/ui@*` → Deploys to Netlify

3. **Each deployment reports to Dtapline**
   - Status: `in_progress` → `success` or `failed`
   - Includes git tag, commit SHA, and build URL

## Key Implementation Details

### Why Use PAT Instead of GITHUB_TOKEN?

**Problem:** GitHub Actions workflows triggered by `GITHUB_TOKEN` cannot trigger other workflows (security limitation).

**Solution:** Use a Personal Access Token (PAT) with `repo` and `workflow` scopes:

```yaml
# .github/workflows/release.yml
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.PAT_TOKEN }}

- uses: changesets/action@v1
  with:
    publish: pnpm changeset tag
  env:
    GITHUB_TOKEN: ${{ secrets.PAT_TOKEN }}
```

This allows the release workflow to push tags that trigger deployment workflows.

### Tag-Based Deployment Triggers

Each deployment workflow listens for specific package tags:

```yaml
# .github/workflows/deploy-cli.yml
on:
  push:
    tags:
      - "@dtapline/cli@**"
```

The double asterisk (`**`) pattern matches any version number.

### Husky Pre-push Hook CI Skip

The Gitleaks pre-push hook is disabled in CI to allow the release workflow to push tags:

```bash
# .husky/pre-push
if [ -z "$CI" ]; then
  pnpm gitleaks:staged
fi
```

## Deployment Workflow Features

Each deployment workflow includes:

1. **Environment protection** - Uses GitHub `production` environment
2. **Concurrency control** - Prevents simultaneous deployments
3. **Deployment reporting** - Reports to Dtapline at 3 stages:
   - Before deployment (`in_progress`)
   - After success (`success`)
   - After failure (`failed`)
4. **Build URLs** - Links back to GitHub Actions run
5. **Git tags** - Associates deployment with release version

### CLI Deployment (deploy-cli.yml)

- Builds all packages
- Publishes to NPM with `--access public`
- Uses `NPM_TOKEN` secret

### API Deployment (deploy-api.yml)

- Bundles Lambda code with esbuild
- Deploys via Terraform to AWS Lambda
- Uses Terraform Cloud with workspace: `dtapline-api-prd`
- Outputs API Gateway URL

### UI Deployment (deploy-ui.yml)

- Builds React app with Vite
- Deploys to Netlify using `nwtgck/actions-netlify@v3`
- Uses `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`

## Required Secrets & Variables

### Secrets

| Secret                  | Used By                  | Purpose                          |
| ----------------------- | ------------------------ | -------------------------------- |
| `PAT_TOKEN`             | release.yml              | Push tags to trigger deployments |
| `NPM_TOKEN`             | deploy-cli.yml           | Publish to NPM                   |
| `AWS_ACCESS_KEY_ID`     | deploy-api.yml           | AWS credentials                  |
| `AWS_SECRET_ACCESS_KEY` | deploy-api.yml           | AWS credentials                  |
| `TF_API_TOKEN`          | deploy-api.yml           | Terraform Cloud authentication   |
| `MONGODB_URI`           | deploy-api.yml           | Production database              |
| `NETLIFY_AUTH_TOKEN`    | deploy-ui.yml            | Netlify authentication           |
| `DTAPLINE_API_KEY`      | All deployment workflows | Report deployments               |

### Variables

| Variable              | Used By                  | Purpose                    |
| --------------------- | ------------------------ | -------------------------- |
| `NETLIFY_SITE_ID`     | deploy-ui.yml            | Netlify site identifier    |
| `DTAPLINE_SERVER_URL` | All deployment workflows | API endpoint for reporting |
| `API_GATEWAY_URL`     | deploy-ui.yml            | Backend URL for frontend   |

## Troubleshooting

### Tags Created But Workflows Don't Trigger

**Cause:** Using `GITHUB_TOKEN` instead of PAT

**Solution:** Ensure release workflow uses PAT:

```yaml
with:
  token: ${{ secrets.PAT_TOKEN }}
env:
  GITHUB_TOKEN: ${{ secrets.PAT_TOKEN }}
```

### Manual Tags Trigger But Automated Tags Don't

**Cause:** Workflows triggered by workflows are blocked by GitHub

**Solution:** Use a PAT from a real user account (not a bot account)

### Deployment Fails: "No changes to apply"

**Cause:** Version commit triggered development deployment, then tag triggered production

**Solution:** Already implemented - development workflow skips version commits

### Gitleaks Blocks Tag Push in CI

**Cause:** Pre-push hook runs in CI

**Solution:** Already implemented - hook checks for `CI` environment variable

## Testing the Pipeline

### 1. Test with a Patch Release

```bash
# Create changeset
pnpm changeset
# Select packages, choose "patch", write summary

# Push changeset
git add .changeset
git commit -m "chore: test release pipeline"
git push
```

### 2. Monitor the Release PR

- Check that "Version Packages" PR is created
- Review version bumps and changelogs
- Merge when ready

### 3. Watch Deployments

After merging the version PR:

1. Check release workflow creates tags
2. Check each deployment workflow triggers:
   - CLI → NPM package published
   - API → Lambda deployed via Terraform
   - UI → Netlify site deployed
3. Check Dtapline dashboard shows all 3 deployments

## Example: v0.1.0 Release

The v0.1.0 release successfully:

1. Created tags: `@dtapline/cli@0.1.0`, `@dtapline/api@0.1.0`, `@dtapline/ui@0.1.0`
2. Published CLI to NPM
3. Deployed API to AWS Lambda
4. Deployed UI to Netlify
5. Reported all 3 deployments to Dtapline production environment

All workflows completed successfully and were visible in the Dtapline dashboard.

## References

- [Changesets Documentation](https://github.com/changesets/changesets)
- [GitHub Actions: Triggering workflows from workflows](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow)
- [Deployment Setup Guide](./deployment-setup.md)
