# Dtapline Deployment Setup Guide

Complete guide to deploy Dtapline infrastructure and enable self-hosting.

## Overview

Dtapline tracks its own deployments across 2 environments:
- **`development`**: Deployed on every merge to `main`
- **`production`**: Deployed when Changesets publishes a release

Services tracked:
- **`api`**: Backend API server (AWS Lambda)
- **`ui`**: Frontend (Netlify)
- **`cli`**: CLI tool (NPM package)

---

## Prerequisites

- [ ] AWS account for development
- [ ] AWS account for production (or use the same account with different regions)
- [ ] MongoDB Atlas cluster
- [ ] Terraform Cloud organization
- [ ] Netlify account with site created
- [ ] GitHub repository: **dtapline/dtapline**

---

## Step 1: Create AWS Credentials

Terraform needs AWS credentials to deploy infrastructure. You have two options:

### Option A: Use Existing Admin Credentials (Simplest)

If you already have AWS admin access, skip creating a new user and use your existing credentials.

### Option B: Create Dedicated CI User (Recommended for Production)

Create an IAM user specifically for CI/CD deployments.

#### Development Account

```bash
# Switch to development account
aws configure --profile dtapline-dev

# Create CI user
aws iam create-user --user-name dtapline-ci --profile dtapline-dev

# Create access key
aws iam create-access-key --user-name dtapline-ci --profile dtapline-dev
# Save: Access Key ID and Secret Access Key

# Attach admin policy (for Terraform to create all resources)
aws iam attach-user-policy --user-name dtapline-ci \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess \
  --profile dtapline-dev
```

> **Note**: For production, consider using a more restrictive policy that only allows Lambda, IAM, API Gateway, and CloudWatch operations.

#### Production Account

Repeat the same steps for production account.

---

## Step 2: Terraform Cloud Setup

### 2.1 Create Workspaces

1. Go to https://app.terraform.io/app/dtapline
2. Create **TWO** workspaces (CLI-driven workflow):
   - **`dtapline-api-dev`**
   - **`dtapline-api-prd`**
3. For each workspace, add tag: **`dtapline-api`**

### 2.2 Configure Workspace Variables

**For EACH workspace**, add these variables:

#### AWS Credentials (Environment Variables, Sensitive)
- `AWS_ACCESS_KEY_ID` - AWS access key for Terraform
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for Terraform

> **Note**: These can be the same credentials from Step 1, or separate admin credentials for Terraform.

### 2.3 Get Terraform Cloud API Token

1. Go to https://app.terraform.io/app/settings/tokens
2. Create token: "GitHub Actions Dtapline"
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
- ARN: `arn:aws:iam::<your-dev-account-id>:role/dtapline-lambda-dev`
- Database: `dtapline-dev`
- Roles: `readWrite@dtapline-dev`

**Production User:**
- Authentication Method: AWS IAM
- ARN: `arn:aws:iam::<your-prod-account-id>:role/dtapline-lambda-prd`
- Database: `dtapline-prd`
- Roles: `readWrite@dtapline-prd`

> **Note**: These roles will be created by Terraform. You can add the users now or after running Terraform.

### 3.3 Configure Network Access

1. Go to Atlas → Network Access
2. Allow all IPs: `0.0.0.0/0` (simplest for Lambda)

---

## Step 4: Deploy Infrastructure with Terraform

### 4.1 Bundle Lambda Code

First, build the Lambda deployment package:

```bash
cd packages/api

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
export TF_WORKSPACE=dtapline-api-dev

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
# Example: dtapline-api-dev
```

### 4.3 Production Environment

```bash
# Switch workspace
export TF_WORKSPACE=dtapline-api-prd

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
3. Connect to GitHub → Select `dtapline/dtapline`
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

## Step 6: Dtapline Project Setup

### 6.1 Start Local API Server

```bash
cd packages/api
pnpm dev
```

Server runs at http://localhost:3000

### 6.2 Create Project via UI

1. Open http://localhost:3000 (or deploy UI to Netlify first)
2. Create new project:
   - Name: **Dtapline**
   - Description: "Self-hosting deployment tracking"

### 6.3 Generate API Key

1. Go to Project Settings → API Keys
2. Click "Create API Key"
3. Name: "GitHub Actions"
4. Scopes: **`deployments:write`**
5. Copy the key (starts with `cm_...`)

**Save this key** → GitHub secret `DTAPLINE_API_KEY`

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
| `DTAPLINE_API_KEY` | `cm_...` | Dtapline UI (Step 6.3) |
| `NETLIFY_AUTH_TOKEN` | `...` | Netlify (Step 5.2) |
| `NETLIFY_SITE_ID` | `...` | Netlify (Step 5.2) |
| `NPM_TOKEN` | `...` | Already exists |

### 7.2 Add Variables

Go to Repository Settings → Secrets and variables → Actions → Variables

| Variable Name | Value | Where to get |
|---------------|-------|--------------|
| `API_GATEWAY_URL_DEVELOPMENT` | `https://....execute-api.eu-central-1.amazonaws.com` | Terraform output (Step 4.1) |
| `API_GATEWAY_URL_PRODUCTION` | `https://....execute-api.eu-central-1.amazonaws.com` | Terraform output (Step 4.2) |
| `DTAPLINE_SERVER_URL` | Same as production API Gateway URL | For CLI reporting |

---

## Step 8: Test Deployment

### 8.1 Test Development Deployment

1. Create a small change in `packages/api/src/server.ts`
2. Commit and push to `main`:
   ```bash
   git add .
   git commit -m "test: trigger development deployment"
   git push origin main
   ```

3. Watch GitHub Actions:
   - `.github/workflows/deploy-development.yml` should run
   - Check logs for Lambda deployment
   - Verify Dtapline CLI reporting succeeds

4. Check Dtapline dashboard:
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

5. Check Dtapline dashboard:
   - Environment: `production`
   - Service: `api`, `ui`, `cli`
   - Should show version tag (e.g., `v1.0.0`)

---

## Summary

You now have:
- ✅ Dtapline tracking its own deployments
- ✅ 2 environments: `development` and `production`
- ✅ 3 services: `api`, `ui`, `cli`
- ✅ Automated deployment via Terraform (no manual Lambda updates)
- ✅ Single bundled Lambda file (fast cold starts)
- ✅ Secure infrastructure with IAM authentication
- ✅ Simple AWS credentials (no OIDC complexity)

**Dashboard URL**: https://your-site.netlify.app/projects/<PROJECT_ID>

Enjoy dogfooding Dtapline! 🚀
