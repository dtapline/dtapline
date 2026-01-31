# CloudMatrix CLI

Command-line tool for reporting deployment information to CloudMatrix server. Designed for CI/CD integration with Azure Pipelines, GitHub Actions, and other automation tools.

## Installation

### Local Development

```bash
# From the monorepo root
pnpm install
cd packages/cli
pnpm build

# Link globally (optional)
npm link
```

### Production

```bash
npm install -g @cloud-matrix/cli
```

## Usage

### Basic Deployment Report

```bash
cloudmatrix deploy <environment> <service> <commitSha> \
  --api-key YOUR_API_KEY \
  --server-url https://api.cloudmatrix.io
```

### With All Options

```bash
cloudmatrix deploy production my-api abc123def \
  --api-key cm_xxxxxxxxxxxxx \
  --server-url https://cloudmatrix.mycompany.com \
  --git-tag v1.2.3 \
  --pr-url https://github.com/org/repo/pull/123 \
  --deployed-by "Azure DevOps" \
  --status success \
  --build-url https://dev.azure.com/org/project/_build/results?buildId=456 \
  --release-notes "Fixed critical bug in payment processing"
```

### Using Environment Variable for API Key

```bash
export CLOUDMATRIX_API_KEY=cm_xxxxxxxxxxxxx

cloudmatrix deploy staging web-frontend def456ghi \
  --git-tag v2.0.0-rc1
```

## Azure Pipelines Integration

Add this step to your `azure-pipelines.yml`:

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: cloudmatrix-secrets  # Contains CLOUDMATRIX_API_KEY

stages:
  - stage: Build
    jobs:
      - job: BuildAndDeploy
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'

          # Your build steps here...

          - script: |
              npm install -g @cloud-matrix/cli
            displayName: 'Install CloudMatrix CLI'

          - script: |
              cloudmatrix deploy \
                $(ENVIRONMENT) \
                $(SERVICE_NAME) \
                $(Build.SourceVersion) \
                --api-key $(CLOUDMATRIX_API_KEY) \
                --server-url $(CLOUDMATRIX_SERVER_URL) \
                --git-tag $(Build.SourceBranchName) \
                --deployed-by "Azure DevOps" \
                --build-url $(System.TeamFoundationCollectionUri)$(System.TeamProject)/_build/results?buildId=$(Build.BuildId) \
                --status success
            displayName: 'Report Deployment to CloudMatrix'
            condition: succeeded()
```

## GitHub Actions Integration

Add this to your `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      # Your build/deploy steps...
      
      - name: Report to CloudMatrix
        env:
          CLOUDMATRIX_API_KEY: ${{ secrets.CLOUDMATRIX_API_KEY }}
        run: |
          npm install -g @cloud-matrix/cli
          
          cloudmatrix deploy \
            production \
            my-service \
            ${{ github.sha }} \
            --server-url https://api.cloudmatrix.io \
            --git-tag ${{ github.ref_name }} \
            --pr-url ${{ github.event.pull_request.html_url }} \
            --deployed-by "GitHub Actions" \
            --build-url ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

## Command Reference

### `cloudmatrix deploy`

Report a deployment to CloudMatrix server.

**Arguments:**
- `environment` - The deployment environment (e.g., dev, staging, production)
- `service` - The service name being deployed
- `commitSha` - Git commit SHA being deployed

**Options:**
- `--api-key <key>` - CloudMatrix API key (or set CLOUDMATRIX_API_KEY env var)
- `--server-url <url>` - CloudMatrix server URL (default: https://api.cloudmatrix.io)
- `--git-tag <tag>` - Git tag for this deployment (e.g., v1.2.3)
- `--pr-url <url>` - Pull request URL
- `--deployed-by <who>` - Who/what triggered the deployment
- `--status <status>` - Deployment status: success, failed, in_progress, rolled_back (default: success)
- `--build-url <url>` - Build/CI pipeline URL
- `--release-notes <notes>` - Release notes or changelog

**Global Options:**
- `--help` - Show help
- `--version` - Show version
- `--wizard` - Interactive mode

## API Key Management

Get your API key from the CloudMatrix dashboard:

1. Navigate to your project settings
2. Go to "API Keys" tab
3. Click "Generate New Key"
4. Copy the key (it will only be shown once!)
5. Store it securely in your CI/CD secrets

API keys should have `deployments:write` scope.

## Examples

### Successful Deployment

```bash
cloudmatrix deploy production api-gateway a1b2c3d \
  --api-key cm_xxxxxxxxxxxxx \
  --git-tag v1.5.0 \
  --deployed-by "Jenkins" \
  --status success
```

### Failed Deployment

```bash
cloudmatrix deploy staging frontend e4f5g6h \
  --api-key cm_xxxxxxxxxxxxx \
  --status failed \
  --build-url https://jenkins.company.com/job/frontend/123
```

### Rollback

```bash
cloudmatrix deploy production database i7j8k9l \
  --api-key cm_xxxxxxxxxxxxx \
  --git-tag v1.4.9 \
  --status rolled_back \
  --release-notes "Rolling back due to performance issues"
```

## Troubleshooting

### "API key is required"

Make sure you either:
- Pass `--api-key` flag
- Set `CLOUDMATRIX_API_KEY` environment variable

### "Failed to report deployment"

Check:
- API key is valid and not expired
- API key has `deployments:write` scope
- Server URL is correct
- Network connectivity to CloudMatrix server
- Project exists in CloudMatrix

### View detailed errors

The CLI automatically logs errors to stderr. Check your CI/CD logs for details.

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Type check
pnpm check

# Run locally
pnpm dev deploy production test-service abc123 --api-key test

# Or after building
node bin/cloudmatrix.js deploy production test-service abc123 --api-key test
```

## License

MIT
