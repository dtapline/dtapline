# Server Infrastructure

Terraform configuration for deploying the Dtapline API server to AWS Lambda.

## Structure

```
infra/
├── main.tf                     # Lambda + API Gateway
├── variables.tf
├── outputs.tf
├── modules/
│   ├── lambda/                 # Lambda function + execution role
│   └── api-gateway/            # HTTP API Gateway
└── environments/
   ├── development/            # Dev config (AWS <your-dev-account-id>)
   └── production/             # Prod config (AWS <your-prod-account-id>)
```

## Resources Created

- **Lambda Function**: Node.js 20.x runtime for Dtapline API
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

## Deployment

### Development

```bash
cd packages/server/infrastructure/terraform

# Set workspace
export TF_WORKSPACE=dtapline-api-dev

# Initialize
terraform init

# Deploy
terraform apply -var-file=environments/dev/terraform.tfvars

# Get outputs
terraform output api_gateway_url
```

### Production

```bash
cd packages/server/infra

# Switch workspace
export TF_WORKSPACE=dtapline-api-prd

# Initialize
terraform init

# Deploy
terraform apply -var-file=environments/prd/terraform.tfvars
```

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

- `AWS_ACCESS_KEY_ID_DEV` - Development AWS access key
- `AWS_SECRET_ACCESS_KEY_DEV` - Development AWS secret key
- `AWS_ACCESS_KEY_ID_PROD` - Production AWS access key
- `AWS_SECRET_ACCESS_KEY_PROD` - Production AWS secret key

## Setting Up CI User

Create an IAM user named `cloudmatrix-ci` in each AWS account:

```bash
# Development account (<your-dev-account-id>)
aws iam create-user --user-name cloudmatrix-ci

# Create access key
aws iam create-access-key --user-name cloudmatrix-ci

# Attach policy for Lambda deployment
aws iam attach-user-policy --user-name cloudmatrix-ci \
  --policy-arn arn:aws:iam::aws:policy/AWSLambda_FullAccess
```

Save the access keys in GitHub Secrets.

## Local Development

The server can also run locally without Lambda:

```bash
cd packages/server
pnpm dev  # Runs on http://localhost:3000
```

## Notes

- Initial deployment uses a bootstrap Lambda package
- Real code is deployed by GitHub Actions after infrastructure exists
- Lambda uses IAM authentication for MongoDB (no passwords)
- API Gateway automatically creates CORS headers for all origins
