# Server Infrastructure

Terraform configuration for deploying the Dtapline API server to AWS Lambda.

## Structure

```
infra/
├── main.tf                     # Lambda + API Gateway
├── variables.tf                # Input variables
├── outputs.tf                  # Output values
├── terraform.tfvars.example    # Example configuration
├── modules/
│   ├── lambda/                 # Lambda function + execution role
│   └── api-gateway/            # HTTP API Gateway
└── environments/
   ├── development/            # Dev config
   └── production/             # Prod config
```

## Resources Created

- **Lambda Function**: Node.js 20.x runtime for Dtapline API with Better Auth
- **Lambda Execution Role**: With MongoDB Atlas IAM permissions
- **API Gateway**: HTTP API (v2) with Lambda proxy integration
- **CloudWatch Log Groups**: For Lambda and API Gateway logs
- **Lambda Alias**: For stable endpoint (`dev` or `prd`)

## Prerequisites

1. **Terraform Cloud workspaces**:

   - `dtapline-api-dev`
   - `dtapline-api-prd`

2. **MongoDB Atlas**:

   - IAM database users configured
   - Network access allowed from AWS

3. **AWS CI User**:

   - IAM user with programmatic access
   - Permissions: Lambda deployment
   - Access keys stored in GitHub Secrets

4. **Better Auth Configuration**:
   - AUTH_SECRET generated (use `openssl rand -base64 32`)
   - GitHub OAuth App created (optional)

## Configuration

### 1. Create terraform.tfvars

Copy the example file and fill in your values:

```bash
cp terraform.tfvars.example terraform.tfvars
```

### 2. Required Variables

```hcl
# MongoDB
mongodb_uri = "mongodb+srv://..."

# Better Auth (required)
auth_secret  = "..."  # Generate with: openssl rand -base64 32
auth_url     = "https://api.dtapline.com"  # Your API Gateway URL
cors_origins = "https://dtapline.com"      # Your frontend URL

# GitHub OAuth (optional)
github_client_id     = "..."
github_client_secret = "..."
```

See `terraform.tfvars.example` for detailed documentation.

### 3. GitHub OAuth Setup (Optional)

To enable "Sign in with GitHub":

1. Create GitHub OAuth App at https://github.com/settings/developers
2. Configure:
   - **Homepage URL**: Your frontend URL (e.g., `https://dtapline.com`)
   - **Callback URL**: Your API URL + `/api/auth/callback/github` (e.g., `https://api.dtapline.com/api/auth/callback/github`)
3. Add Client ID and Secret to `terraform.tfvars`

**Note:** Create separate OAuth Apps for development and production.

## Deployment

### Development

```bash
cd packages/api/infra

# Set workspace
export TF_WORKSPACE=dtapline-api-dev

# Initialize
terraform init

# Deploy
terraform apply

# Get outputs
terraform output api_gateway_url
```

### Production

```bash
cd packages/api/infra

# Switch workspace
export TF_WORKSPACE=dtapline-api-prd

# Initialize
terraform init

# Deploy
terraform apply
```

## Environment Variables in Lambda

The following environment variables are automatically configured:

| Variable               | Description                 | Required |
| ---------------------- | --------------------------- | -------- |
| `MONGODB_URI`          | MongoDB connection string   | ✅       |
| `AUTH_SECRET`          | Secret for signing cookies  | ✅       |
| `AUTH_URL`             | Base URL for auth callbacks | ✅       |
| `CORS_ORIGINS`         | Allowed CORS origins        | ✅       |
| `GITHUB_CLIENT_ID`     | GitHub OAuth client ID      | Optional |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret  | Optional |

## Outputs

| Output                 | Description               |
| ---------------------- | ------------------------- |
| `api_gateway_url`      | API Gateway endpoint URL  |
| `lambda_function_name` | Lambda function name      |
| `lambda_function_arn`  | Lambda function ARN       |
| `lambda_role_arn`      | Lambda execution role ARN |

## GitHub Actions Integration

The Lambda code is updated automatically by GitHub Actions workflows using AWS credentials from a CI user.

**Required GitHub Secrets:**

- `AWS_ASSUME_ROLE` - Production AWS IAM role ARN for GitHub Actions to assume

## Setting Up CI User

Create an IAM user named `dtapline-ci` in each AWS account:

```bash
# In your AWS account
aws iam create-user --user-name dtapline-ci

# Create access key
aws iam create-access-key --user-name dtapline-ci

# Attach policy for Lambda deployment
aws iam attach-user-policy --user-name dtapline-ci \
  --policy-arn arn:aws:iam::aws:policy/AWSLambda_FullAccess
```

Save the access keys in GitHub Secrets.

## Local Development

The API server can also run locally without Lambda:

```bash
cd packages/api

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Start server
pnpm dev  # Runs on http://localhost:3000
```

## Better Auth in Lambda

Better Auth works seamlessly in AWS Lambda:

- ✅ **OAuth flows** (GitHub, Google, etc.) fully supported
- ✅ **Session management** via MongoDB
- ✅ **Stateless execution** - config from environment variables
- ✅ **Connection pooling** - MongoDB connections reused across invocations
- ✅ **CORS** - Properly configured for your frontend

## Notes

- Initial deployment uses a bootstrap Lambda package
- Real code is deployed by GitHub Actions after infrastructure exists
- Lambda uses IAM authentication for MongoDB (no passwords)
- Better Auth callback URLs must match your API Gateway URL
- Create separate GitHub OAuth Apps for dev and production
