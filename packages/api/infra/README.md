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
- **ACM Certificate** (optional): Automatically created for custom domain with deletion protection
- **Custom Domain** (optional): API Gateway custom domain with ACM certificate


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

### 3. Custom Domain Setup (Optional but Recommended for Production)

To use a custom domain like `api.dtapline.com` instead of the default API Gateway URL:

#### Step 1: Configure Terraform Variable

Add to `terraform.tfvars`:

```hcl
# Production
custom_domain_name = "api.dtapline.com"

# Development (optional)
custom_domain_name = "development--api.dtapline.com"
```

#### Step 2: Run Terraform Apply

```bash
terraform apply
```

Terraform will:
- ✅ Create an ACM certificate for your domain
- ✅ Output DNS validation records needed
- ⏳ Wait for you to add DNS records (certificate status will be "PENDING_VALIDATION")

#### Step 3: Add Certificate Validation DNS Records to Netlify

After `terraform apply`, get the validation records:

```bash
terraform output certificate_validation_records
```

Example output:
```json
{
  "api.dtapline.com" = {
    "name"  = "_abc123.api.dtapline.com"
    "type"  = "CNAME"
    "value" = "_xyz789.acm-validations.aws."
  }
}
```

In Netlify DNS:
1. Go to: **Site Settings → Domain Management → DNS**
2. Add CNAME record:
   - **Name**: `_abc123.api` (remove `.dtapline.com` from the name)
   - **Type**: CNAME
   - **Value**: `_xyz789.acm-validations.aws.`
   - **TTL**: 3600

**⚠️ IMPORTANT:** Netlify automatically appends your domain (`.dtapline.com`), so you must ONLY enter the subdomain part in the Name field. 

**DO NOT enter:**
- ❌ `_abc123.api.dtapline.com` (wrong - has domain suffix)
- ❌ `_abc123.api.dtapline.com.dtapline.com` (wrong - double domain)

**DO enter:**
- ✅ `_abc123.api` (correct - subdomain only)

#### Step 4: Wait for Certificate Validation

Wait 5-15 minutes, then check status:

```bash
terraform output certificate_status
# Should show: "ISSUED"
```

Once issued, you can proceed to the next step.

#### Step 5: Add API Subdomain CNAME to Netlify

Get the API Gateway target domain:

```bash
terraform output api_gateway_target_domain
# Example: d-abc123xyz.execute-api.eu-central-1.amazonaws.com
```

In Netlify DNS:
1. Add CNAME record:
   - **Name**: `api` (for production) or `development--api` (for dev)
   - **Type**: CNAME
   - **Value**: [paste the target domain from above]
   - **TTL**: 3600

**⚠️ IMPORTANT:** Again, only enter the subdomain part without `.dtapline.com`:
- ✅ Correct: `api` or `development--api`
- ❌ Wrong: `api.dtapline.com` or `development--api.dtapline.com`

#### Step 6: Verify

Wait 5-10 minutes for DNS propagation, then test:

```bash
curl https://api.dtapline.com/health
```

**Important Notes:**
- Certificate is created automatically by Terraform - no manual ACM setup needed
- Keep the validation CNAME record forever (don't delete it)
- For development, custom domain is optional - API Gateway URL works fine

### 4. GitHub OAuth Setup (Optional)

To enable "Sign in with GitHub":

1. Create GitHub OAuth App at https://github.com/settings/developers
2. Configure:
   - **Homepage URL**: Your frontend URL (e.g., `https://dtapline.com`)
   - **Callback URL**: Your API URL + `/api/auth/callback/github` (e.g., `https://api.dtapline.com/api/auth/callback/github`)
3. Add Client ID and Secret to `terraform.tfvars`

**Note:** Create separate OAuth Apps for development and production.

## Environment-Specific Configuration

### Development (`dtapline-api-dev`)

```hcl
stage = "dev"

# Option 1: Use API Gateway URL (simpler, no DNS needed)
auth_url     = "https://xyz123.execute-api.eu-central-1.amazonaws.com"
cors_origins = "http://localhost:5173,https://development--dtapline.netlify.app"

# Option 2: Use custom subdomain (requires DNS setup)
custom_domain_name = "development--api.dtapline.com"
auth_url           = "https://development--api.dtapline.com"
cors_origins       = "http://localhost:5173,https://development--dtapline.netlify.app"
```

### Production (`dtapline-api-prd`)

```hcl
stage = "prd"

# Always use custom domain for production
custom_domain_name = "api.dtapline.com"
auth_url           = "https://api.dtapline.com"
cors_origins       = "https://dtapline.com"
```

**Note:** Certificate is created automatically by Terraform - no need to specify `certificate_arn`.

## Certificate Management

### Certificate Protection

The ACM certificate is protected from accidental deletion with `prevent_destroy = true`. This means:

✅ **Safe from `terraform destroy`** - Certificate won't be deleted
✅ **Safe from variable changes** - Changing `custom_domain_name` won't delete the old certificate
✅ **Safe from accidents** - Prevents costly re-validation cycles

### Why Protection is Important

ACM certificates require DNS validation, which can take 5-30 minutes. Accidentally deleting a certificate would:
- Break your API domain immediately
- Require re-creating the certificate
- Require DNS validation again
- Cause downtime during validation

### Intentionally Deleting a Certificate

If you really need to delete the certificate (e.g., switching to a different domain):

1. **Remove the protection** in `main.tf`:
   ```hcl
   resource "aws_acm_certificate" "api" {
     # ... other config ...
     
     lifecycle {
       create_before_destroy = true
       # prevent_destroy = true  # Comment this out
     }
   }
   ```

2. **Apply the change**:
   ```bash
   terraform apply  # Updates the lifecycle policy
   ```

3. **Destroy the certificate**:
   ```bash
   # Option 1: Remove custom domain (safest)
   # Set custom_domain_name = "" in terraform.tfvars
   terraform apply
   
   # Option 2: Destroy specific resource
   terraform destroy -target=aws_acm_certificate.api
   ```

4. **Re-enable protection** after cleanup (restore the `prevent_destroy` line)

### Certificate Renewal

ACM certificates auto-renew automatically! You don't need to do anything:
- AWS automatically renews certificates before expiration
- Uses the same DNS validation records you added during setup
- No downtime or manual intervention required

**Important:** Keep the validation CNAME record in Netlify DNS forever - it's needed for auto-renewal.

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

| Output                            | Description                                                |
| --------------------------------- | ---------------------------------------------------------- |
| `api_url`                         | Base API URL (custom domain or API Gateway URL)           |
| `api_gateway_url`                 | Default API Gateway endpoint URL                           |
| `custom_domain_name`              | Custom domain name (if configured)                         |
| `api_gateway_target_domain`       | CNAME target for DNS record (if custom domain)             |
| `certificate_validation_records`  | DNS records to add to Netlify for certificate validation  |
| `certificate_arn`                 | ARN of the ACM certificate (if custom domain)              |
| `certificate_status`              | Certificate validation status (ISSUED or PENDING)          |
| `lambda_function_name`            | Lambda function name                                       |
| `lambda_function_arn`             | Lambda function ARN                                        |
| `lambda_role_arn`                 | Lambda execution role ARN                                  |

**Note:** Use `api_url` for your frontend `VITE_API_BASE_URL` configuration.

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
