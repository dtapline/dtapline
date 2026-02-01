# CloudMatrix Deployment Setup Guide

Complete guide to deploy CloudMatrix infrastructure and enable self-hosting.

## Overview

CloudMatrix tracks its own deployments across 2 environments:
- **`development`**: Deployed on every merge to `main` (AWS account 780689416838)
- **`production`**: Deployed when Changesets publishes a release (AWS account 127221304765)

Services tracked:
- **`api`**: Backend server (AWS Lambda)
- **`ui`**: Frontend (Netlify)
- **`cli`**: CLI tool (NPM package)

---

## Prerequisites

- [x] AWS account for development: **780689416838**
- [x] AWS account for production: **127221304765**
- [x] MongoDB Atlas cluster: **cloudmatrixcluster.ed0pems.mongodb.net**
- [x] Terraform Cloud organization: **cloudmatrix**
- [ ] Netlify account with site created
- [x] GitHub repository: **floydspace/cloud-matrix**

---

## Step 1: Create AWS Credentials

Terraform needs AWS credentials to deploy infrastructure. You have two options:

### Option A: Use Existing Admin Credentials (Simplest)

If you already have AWS admin access, skip creating a new user and use your existing credentials.

### Option B: Create Dedicated CI User (Recommended for Production)

Create an IAM user specifically for CI/CD deployments.

#### Development Account (780689416838)

```bash
# Switch to development account
aws configure --profile cloudmatrix-dev

# Create CI user
aws iam create-user --user-name cloudmatrix-ci --profile cloudmatrix-dev

# Create access key
aws iam create-access-key --user-name cloudmatrix-ci --profile cloudmatrix-dev
# Save: Access Key ID and Secret Access Key

# Attach admin policy (for Terraform to create all resources)
aws iam attach-user-policy --user-name cloudmatrix-ci \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess \
  --profile cloudmatrix-dev
```

> **Note**: For production, consider using a more restrictive policy that only allows Lambda, IAM, API Gateway, and CloudWatch operations.

#### Production Account (127221304765)

Repeat the same steps for production account.

---

## Step 2: Terraform Cloud Setup

### 2.1 Create Workspaces

1. Go to https://app.terraform.io/app/cloudmatrix
2. Create **TWO** workspaces (CLI-driven workflow):
   - **`cloud-matrix-server-development`**
   - **`cloud-matrix-server-production`**
3. For each workspace, add tag: **`cloud-matrix-server`**

### 2.2 Configure Workspace Variables

**For EACH workspace**, add these variables:

#### AWS Credentials (Environment Variables, Sensitive)
- `AWS_ACCESS_KEY_ID` - AWS access key for Terraform
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for Terraform

> **Note**: These can be the same credentials from Step 1, or separate admin credentials for Terraform.

### 2.3 Get Terraform Cloud API Token

1. Go to https://app.terraform.io/app/settings/tokens
2. Create token: "GitHub Actions CloudMatrix"
3. Copy token → Save as GitHub secret `TF_API_TOKEN`

---

## Step 3: MongoDB Atlas Configuration

### 3.1 Enable IAM Authentication

1. Go to Atlas → Database Access
2. Click "Add New Database User"
3. Select "AWS IAM" authentication method

### 3.2 Create Database Users

Create **TWO** database users (one per environment):

**Development User:**
- Authentication Method: AWS IAM
- ARN: `arn:aws:iam::780689416838:role/cloud-matrix-lambda-development`
- Database: `cloudmatrix-dev`
- Roles: `readWrite@cloudmatrix-dev`

**Production User:**
- Authentication Method: AWS IAM
- ARN: `arn:aws:iam::127221304765:role/cloud-matrix-lambda-production`
- Database: `cloudmatrix-prod`
- Roles: `readWrite@cloudmatrix-prod`

> **Note**: These roles will be created by Terraform. You can add the users now or after running Terraform.

### 3.3 Configure Network Access

1. Go to Atlas → Network Access
2. Allow all IPs: `0.0.0.0/0` (simplest for Lambda)

---

## Step 4: Deploy Infrastructure with Terraform

### 4.1 Bundle Lambda Code

First, build the Lambda deployment package:

```bash
cd packages/server

# Install dependencies
pnpm install

# Bundle Lambda code with esbuild
pnpm bundle:lambda
```

This creates `dist/lambda/index.js` - a single bundled file with all dependencies (1.4MB minified CommonJS).

**Bundle optimizations:**
- MongoDB's ESM source used via alias to avoid compatibility issues
- CommonJS output (handles Node.js built-ins like zlib, timers correctly)
- Minified and tree-shaken for optimal size
- AWS SDK externalized (provided by Lambda runtime)

### 4.2 Development Environment

```bash
cd infrastructure/terraform

# Set workspace
export TF_WORKSPACE=cloud-matrix-server-development

# Initialize Terraform
terraform init

# Preview changes
terraform plan -var-file=environments/development/terraform.tfvars

# Apply infrastructure
terraform apply -var-file=environments/development/terraform.tfvars
```

**Save outputs:**
```bash
terraform output api_gateway_url
# Example: https://abc123xyz.execute-api.eu-central-1.amazonaws.com

terraform output lambda_function_name
# Example: cloud-matrix-api-development
```

### 4.3 Production Environment

```bash
# Switch workspace
export TF_WORKSPACE=cloud-matrix-server-production

# Initialize (if needed)
terraform init

# Apply infrastructure
terraform apply -var-file=environments/production/terraform.tfvars
```

**Save outputs** (same as development).

### How It Works

1. **`archive_file` data source**: Terraform zips the `dist/lambda` folder
2. **Lambda resource**: Uses the zip file and its hash for deployment
3. **Automatic updates**: When code changes, hash changes, Lambda updates

No separate `aws lambda update-function-code` needed - Terraform handles everything!

---

## Step 5: Netlify Setup

### 5.1 Create Netlify Site

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub → Select `floydspace/cloud-matrix`
4. **Build settings**:
   - Base directory: `packages/ui`
   - Build command: `pnpm build`
   - Publish directory: `packages/ui/dist`
5. Click "Deploy site"

### 5.2 Get Netlify Credentials

1. **Auth Token**:
   - User Settings → Applications → Personal access tokens
   - Create new token → Copy

2. **Site ID**:
   - Site Settings → General → Site details
   - Copy "Site ID"

---

## Step 6: CloudMatrix Project Setup

### 6.1 Start Local Server

```bash
cd packages/server
pnpm dev
```

Server runs at http://localhost:3000

### 6.2 Create Project via UI

1. Open http://localhost:3000 (or deploy UI to Netlify first)
2. Create new project:
   - Name: **CloudMatrix**
   - Description: "Self-hosting deployment tracking"

### 6.3 Generate API Key

1. Go to Project Settings → API Keys
2. Click "Create API Key"
3. Name: "GitHub Actions"
4. Scopes: **`deployments:write`**
5. Copy the key (starts with `cm_...`)

**Save this key** → GitHub secret `CLOUDMATRIX_API_KEY`

---

## Step 7: GitHub Repository Configuration

### 7.1 Add Secrets

Go to Repository Settings → Secrets and variables → Actions → Secrets

| Secret Name | Value | Where to get |
|-------------|-------|--------------|
| `AWS_ACCESS_KEY_ID_DEV` | `AKIA...` | AWS IAM (Step 1) |
| `AWS_SECRET_ACCESS_KEY_DEV` | `...` | AWS IAM (Step 1) |
| `AWS_ACCESS_KEY_ID_PROD` | `AKIA...` | AWS IAM (Step 1) |
| `AWS_SECRET_ACCESS_KEY_PROD` | `...` | AWS IAM (Step 1) |
| `TF_API_TOKEN` | `...` | Terraform Cloud (Step 2.3) |
| `CLOUDMATRIX_API_KEY` | `cm_...` | CloudMatrix UI (Step 6.3) |
| `NETLIFY_AUTH_TOKEN` | `...` | Netlify (Step 5.2) |
| `NETLIFY_SITE_ID` | `...` | Netlify (Step 5.2) |
| `NPM_TOKEN` | `...` | Already exists |

### 7.2 Add Variables

Go to Repository Settings → Secrets and variables → Actions → Variables

| Variable Name | Value | Where to get |
|---------------|-------|--------------|
| `API_GATEWAY_URL_DEVELOPMENT` | `https://....execute-api.eu-central-1.amazonaws.com` | Terraform output (Step 4.1) |
| `API_GATEWAY_URL_PRODUCTION` | `https://....execute-api.eu-central-1.amazonaws.com` | Terraform output (Step 4.2) |
| `CLOUDMATRIX_SERVER_URL` | Same as production API Gateway URL | For CLI reporting |

---

## Step 8: Test Deployment

### 8.1 Test Development Deployment

1. Create a small change in `packages/server/src/server.ts`
2. Commit and push to `main`:
   ```bash
   git add .
   git commit -m "test: trigger development deployment"
   git push origin main
   ```

3. Watch GitHub Actions:
   - `.github/workflows/deploy-development.yml` should run
   - Check logs for Lambda deployment
   - Verify CloudMatrix CLI reporting succeeds

4. Check CloudMatrix dashboard:
   - Environment: `development`
   - Service: `api` and `ui`
   - Should show green checkmark with commit SHA

### 8.2 Test Production Deployment

1. Create a changeset:
   ```bash
   pnpm changeset
   ```
   - Select packages to version
   - Choose version bump (patch/minor/major)
   - Write summary

2. Commit changeset:
   ```bash
   git add .changeset
   git commit -m "chore: add changeset for release"
   git push origin main
   ```

3. Changesets will create a "Version Packages" PR:
   - Review the PR
   - Merge when ready

4. After merge:
   - Changesets publishes to NPM (via `release.yml`)
   - Creates git tag (e.g., `v1.0.0`)
   - Tag triggers `.github/workflows/deploy-production.yml`

5. Check CloudMatrix dashboard:
   - Environment: `production`
   - Service: `api`, `ui`, `cli`
   - Should show version tag (e.g., `v1.0.0`)

---

## Summary

You now have:
- ✅ CloudMatrix tracking its own deployments
- ✅ 2 environments: `development` and `production`
- ✅ 3 services: `api`, `ui`, `cli`
- ✅ Automated deployment via Terraform (no manual Lambda updates)
- ✅ Single bundled Lambda file (fast cold starts)
- ✅ Secure infrastructure with IAM authentication
- ✅ Simple AWS credentials (no OIDC complexity)

**Dashboard URL**: https://your-site.netlify.app/projects/<PROJECT_ID>

Enjoy dogfooding CloudMatrix! 🚀
