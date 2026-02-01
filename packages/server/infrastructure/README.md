# Server Infrastructure

Terraform configuration for deploying the CloudMatrix API server to AWS Lambda.

## Structure

```
infrastructure/
└── terraform/
    ├── main.tf                     # Lambda + API Gateway
    ├── variables.tf
    ├── outputs.tf
    ├── modules/
    │   ├── lambda/                 # Lambda function + execution role
    │   └── api-gateway/            # HTTP API Gateway
    └── environments/
        ├── development/            # Dev config (AWS 780689416838)
        └── production/             # Prod config (AWS 127221304765)
```

## Resources Created

- **Lambda Function**: Node.js 20.x runtime for CloudMatrix API
- **Lambda Execution Role**: With MongoDB Atlas IAM permissions
- **API Gateway**: HTTP API (v2) with Lambda proxy integration
- **CloudWatch Log Groups**: For Lambda and API Gateway logs
- **Lambda Alias**: For stable endpoint (`development` or `production`)

## Prerequisites

1. **Terraform Cloud workspaces**:
   - `cloud-matrix-server-development` (tag: `cloud-matrix-server`)
   - `cloud-matrix-server-production` (tag: `cloud-matrix-server`)

2. **MongoDB Atlas**:
   - IAM database users configured
   - Network access allowed from AWS

3. **Bundled Lambda code**:
   - Run `pnpm bundle:lambda` from `packages/server` directory
   - Creates `dist/lambda/index.mjs` (1.5MB minified bundle)

## Deployment

### Bundle Lambda Code

First, bundle the Lambda deployment package:

```bash
cd packages/server
pnpm bundle:lambda
```

This creates a single bundled file with all dependencies using esbuild:

```bash
esbuild src/lambda.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=esm \
  --outfile=dist/lambda/index.mjs \
  --external:@aws-sdk/* \
  --alias:mongodb=mongodb/src \
  --main-fields=module,main \
  --tree-shaking=true \
  --minify \
  --sourcemap
```

**Key features:**
- **`--alias:mongodb=mongodb/src`** - Uses MongoDB's ESM source to avoid CommonJS `require()` issues
- **`--main-fields=module,main`** - Prefers ESM versions of packages
- **`--minify`** - Reduces bundle from 3.3MB to 1.5MB
- **`--tree-shaking=true`** - Removes unused code

### Development

```bash
cd packages/server/infrastructure/terraform

# Set workspace
export TF_WORKSPACE=cloud-matrix-server-development

# Initialize
terraform init

# Deploy
terraform apply -var-file=environments/development/terraform.tfvars

# Get outputs
terraform output api_gateway_url
```

### Production

```bash
cd packages/server/infrastructure/terraform

# Switch workspace
export TF_WORKSPACE=cloud-matrix-server-production

# Initialize
terraform init

# Deploy
terraform apply -var-file=environments/production/terraform.tfvars
```

## Outputs

| Output | Description |
|--------|-------------|
| `api_gateway_url` | API Gateway endpoint URL |
| `lambda_function_name` | Lambda function name |
| `lambda_function_arn` | Lambda function ARN |
| `lambda_role_arn` | Lambda execution role ARN |

## GitHub Actions Integration

The Lambda code is bundled and deployed automatically by GitHub Actions workflows using Terraform.

**Required GitHub Secrets:**
- `AWS_ACCESS_KEY_ID_DEV` - Development AWS access key
- `AWS_SECRET_ACCESS_KEY_DEV` - Development AWS secret key
- `AWS_ACCESS_KEY_ID_PROD` - Production AWS access key
- `AWS_SECRET_ACCESS_KEY_PROD` - Production AWS secret key
- `TF_API_TOKEN` - Terraform Cloud API token

## How It Works

1. **Bundle**: esbuild creates a single ESM file with all dependencies
2. **Archive**: Terraform's `archive_file` data source zips the `dist/lambda` folder
3. **Deploy**: Lambda resource uses the zip file and its hash
4. **Update**: When code changes, hash changes, Lambda updates automatically

No separate `aws lambda update-function-code` needed - Terraform handles everything!

## Troubleshooting

### "Dynamic require of 'timers' is not supported"

This error occurs if you don't use the MongoDB alias. The bundle script must include:
```bash
--alias:mongodb=mongodb/src
```

This tells esbuild to use MongoDB's ESM source instead of the compiled CommonJS version.

### Bundle Size Too Large

The bundle should be ~1.5MB with minification. If it's larger:
- Ensure `--minify` flag is present
- Check that `--external:@aws-sdk/*` is excluding AWS SDK
- Verify tree-shaking is enabled

## Local Development

The server can also run locally without Lambda:

```bash
cd packages/server
pnpm dev  # Runs on http://localhost:3000
```

## Notes

- Lambda uses IAM authentication for MongoDB (no passwords)
- API Gateway automatically creates CORS headers for all origins
- Source maps are generated for debugging production issues
- Bundle process takes ~1.5 seconds
