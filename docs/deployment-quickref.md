# Dtapline Deployment Quick Reference

Quick commands and values for Dtapline deployment.

## Environments

| Environment | AWS Account       | MongoDB Database | Trigger                  |
| ----------- | ----------------- | ---------------- | ------------------------ |
| Development | Your Dev Account  | dtapline-dev     | Push to `main`           |
| Production  | Your Prod Account | dtapline-prd     | Release tag (changesets) |

## Terraform Commands

### Development

```bash
cd packages/api/infra

# Init
terraform init -backend-config=environments/development/backend.tf

# Plan & Apply
terraform plan -var-file=environments/development/terraform.tfvars
terraform apply -var-file=environments/development/terraform.tfvars

# Outputs
terraform output api_gateway_url
terraform output lambda_function_name
```

### Production

```bash
cd packages/api/infra

# Init
terraform init -reconfigure -backend-config=environments/production/backend.tf

# Plan & Apply
terraform plan -var-file=environments/production/terraform.tfvars
terraform apply -var-file=environments/production/terraform.tfvars
```

## GitHub Secrets Required

```
AWS_ASSUME_ROLE               # CI role to assume
DTAPLINE_API_KEY              # From Dtapline UI
TF_API_TOKEN                  # Terraform Cloud token
NETLIFY_AUTH_TOKEN            # Netlify personal access token
NETLIFY_SITE_ID               # Netlify site ID
NPM_TOKEN                     # Already exists
```

## GitHub Variables Required

```
API_GATEWAY_URL_DEVELOPMENT   # From Terraform output
API_GATEWAY_URL_PRODUCTION    # From Terraform output
DTAPLINE_SERVER_URL           # Same as production API Gateway
```

## MongoDB Atlas Configuration

### Connection Strings

```
Development: mongodb+srv://<your-cluster>.mongodb.net/dtapline-dev?authSource=%24external&authMechanism=MONGODB-AWS

Production: mongodb+srv://<your-cluster>.mongodb.net/dtapline-prd?authSource=%24external&authMechanism=MONGODB-AWS
```

### IAM Database Users

**Development**:

- ARN: `arn:aws:iam::<your-dev-account-id>:role/dtapline-lambda-dev`
- Database: `dtapline-dev`
- Role: `readWrite`

**Production**:

- ARN: `arn:aws:iam::<your-prod-account-id>:role/dtapline-lambda-prd`
- Database: `dtapline-prd`
- Role: `readWrite`

## CI User Setup

### Development Account

```bash
aws iam create-user --user-name dtapline-ci
aws iam create-access-key --user-name dtapline-ci

# Save assume role ARN as GitHub variables:
# AWS_ASSUME_ROLE
```

### Production Account

```bash
aws iam create-user --user-name dtapline-ci
aws iam create-access-key --user-name dtapline-ci

# Save assume role ARN as GitHub variables:
# AWS_ASSUME_ROLE
```

## Deployment Flow

### Development Flow

```
1. Push to main
2. GitHub Actions: check.yml runs
3. GitHub Actions: deploy-development.yml runs
   - Builds API → Deploys to Lambda (dev)
   - Builds UI → Deploys to Netlify (dev)
   - Runs CLI → Reports to dtapline
4. Dashboard shows: development/api, development/ui
```

### Production Flow

```
1. Create changeset: pnpm changeset
2. Commit and push
3. Changesets creates "Version Packages" PR
4. Merge PR
5. GitHub Actions: release.yml runs
   - Bumps versions
   - Creates git tag (e.g., v1.0.0)
   - Publishes to NPM
6. Tag triggers deploy-production.yml
   - Deploys to Lambda (prd)
   - Deploys to Netlify (prd)
   - Reports all 3 services to Dtapline
7. Dashboard shows: production/api, production/ui, production/cli
```

## Useful Commands

### Check Lambda Status

```bash
aws lambda get-function --function-name dtapline-api-development
aws lambda get-function --function-name dtapline-api-production
```

### View Lambda Logs

```bash
aws logs tail /aws/lambda/dtapline-api-development --follow
aws logs tail /aws/lambda/dtapline-api-production --follow
```

### Test API Gateway

```bash
curl https://<api-gateway-url>/api/v1/projects
```

### Deploy Lambda Manually

```bash
cd packages/api
pnpm build

# Package
mkdir -p dist-lambda
cp -r dist/* dist-lambda/
cp package.json dist-lambda/
cd dist-lambda
npm install --production
zip -r ../lambda.zip .
cd ..

# Deploy
aws lambda update-function-code \
  --function-name dtapline-api-development \
  --zip-file fileb://lambda.zip
```

## Dashboard Access

**URL Pattern**: `https://<netlify-url>/projects/<project-id>`

Expected view:

```
         api           ui            cli
prd     v1.0.0        v1.0.0        v1.0.0
        ✅            ✅            📦

dev     abc1234       abc1234       -
        ✅            ✅            (not deployed)
```

## File Locations

```
packages/api/infra/
├── main.tf                      # Lambda + API Gateway
├── variables.tf
├── outputs.tf
├── modules/
│   ├── lambda/                  # Lambda module
│   └── api-gateway/            # API Gateway module

.github/workflows/
├── check.yml                    # CI checks
├── snapshot.yml                 # Preview packages
├── release.yml                  # Changesets release
├── deploy-development.yml       # Dev deployment
└── deploy-production.yml        # Prod deployment
```
