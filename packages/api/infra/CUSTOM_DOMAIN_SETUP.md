# Custom Domain Setup Guide

This guide walks you through setting up custom domains for the Dtapline API with **automatic certificate creation** and DNS managed in Netlify.

## Overview

- **Production**: `api.dtapline.com`
- **Development**: `development--api.dtapline.com` (optional)
- **Certificate**: Automatically created by Terraform (no manual ACM setup!)

## Architecture

```
User Browser
    ↓
Netlify DNS (CNAME: api.dtapline.com → d-abc123.execute-api.eu-central-1.amazonaws.com)
    ↓
AWS API Gateway Custom Domain (with auto-created ACM certificate)
    ↓
AWS Lambda (Dtapline API)
```

## Quick Start (TL;DR)

```bash
# 1. Configure domain in terraform.tfvars
custom_domain_name = "api.dtapline.com"

# 2. Apply Terraform
terraform apply

# 3. Add certificate validation CNAME to Netlify (from output)
terraform output certificate_validation_records
# Enter in Netlify: _abc123.api (NOT _abc123.api.dtapline.com)

# 4. Wait for certificate validation (5-15 min)
terraform output certificate_status  # Should show "ISSUED"

# 5. Add API CNAME to Netlify (from output)
terraform output api_gateway_target_domain
# Enter in Netlify: api (NOT api.dtapline.com)

# 6. Test
curl https://api.dtapline.com/health
```

**⚠️ CRITICAL:** When adding DNS records in Netlify, ONLY enter the subdomain part (everything before `.dtapline.com`). Netlify automatically appends your domain!

| Terraform Shows | Enter in Netlify | ❌ Don't Enter |
|----------------|------------------|---------------|
| `_abc123.api.dtapline.com` | `_abc123.api` | ~~`_abc123.api.dtapline.com`~~ |
| `api.dtapline.com` | `api` | ~~`api.dtapline.com`~~ |


## Detailed Step-by-Step Setup

### Step 1: Configure Terraform Variable

Edit `terraform.tfvars` and set your custom domain:

**For Production** (`dtapline-api-prd`):
```hcl
stage = "prd"

custom_domain_name = "api.dtapline.com"
auth_url           = "https://api.dtapline.com"
cors_origins       = "https://dtapline.com"
```

**For Development** (`dtapline-api-dev` - optional):
```hcl
stage = "dev"

# Option 1: Use custom subdomain
custom_domain_name = "development--api.dtapline.com"
auth_url           = "https://development--api.dtapline.com"

# Option 2: Skip custom domain for dev (simpler)
# Leave custom_domain_name empty and use API Gateway URL
```

### Step 2: Run Terraform Apply

```bash
cd packages/api/infra

# Set workspace (dev or prd)
export TF_WORKSPACE=dtapline-api-prd

# Initialize (first time only)
terraform init

# Apply changes
terraform apply
```

Terraform will:
- ✅ Create ACM certificate for your domain
- ✅ Create API Gateway custom domain configuration
- ⏳ Wait for certificate validation (requires DNS records)

The apply will complete, but the certificate status will be **PENDING_VALIDATION** until you add DNS records.

### Step 3: Get Certificate Validation Records

After `terraform apply`, get the DNS validation records:

```bash
terraform output certificate_validation_records
```

Example output:
```json
{
  "api.dtapline.com" = {
    "name"  = "_abc123def456.api.dtapline.com"
    "type"  = "CNAME"
    "value" = "_xyz789.acm-validations.aws."
  }
}
```

### Step 4: Add Validation CNAME to Netlify DNS

1. **Go to Netlify**: Site Settings → Domain Management → DNS

2. **Click "Add new record"**

3. **Configure the CNAME record**:
   - **Record Type**: CNAME
   - **Name**: `_abc123def456.development--api` (remove `.dtapline.com` from the name)
   - **Value**: `_xyz789.acm-validations.aws.`
   - **TTL**: 3600 (1 hour)

4. **Click "Save"**

**⚠️ CRITICAL - Common Mistake:**

Netlify automatically appends `.dtapline.com` to all DNS records. You must ONLY enter the subdomain part in the Name field.

| What Terraform Shows | What to Enter in Netlify | What Gets Created |
|---------------------|-------------------------|-------------------|
| `_abc123.development--api.dtapline.com` | `_abc123.development--api` | `_abc123.development--api.dtapline.com` ✅ |

**DO NOT enter:**
- ❌ `_abc123.development--api.dtapline.com` (creates `_abc123.development--api.dtapline.com.dtapline.com`)
- ❌ Full domain name with suffix

**DO enter:**
- ✅ `_abc123.development--api` (Netlify adds `.dtapline.com` automatically)
- ✅ Everything BEFORE the first `.dtapline.com` in the Terraform output

**Important:** Keep this validation record forever - don't delete it after the certificate is validated!

### Step 5: Wait for Certificate Validation

DNS propagation and certificate validation typically takes 5-15 minutes.

Check the status:

```bash
# Check certificate status
terraform output certificate_status

# Expected: "ISSUED" (when ready)
# or: "PENDING_VALIDATION" (still waiting)
```

You can also check in AWS Console:
- Go to **AWS Certificate Manager** in **eu-central-1** region
- Find your certificate (`dtapline-api-prd` or `dtapline-api-dev`)
- Status should show "Issued"

**Troubleshooting validation delays:**
- Verify DNS record is correct: `dig _abc123def456.api.dtapline.com`
- DNS can take up to 30 minutes for global propagation
- Make sure you removed your domain suffix from the Name field

### Step 6: Get API Gateway Target Domain

Once the certificate is validated, get the CNAME target for your API subdomain:

```bash
terraform output api_gateway_target_domain
```

Example output:
```
d-abc123xyz.execute-api.eu-central-1.amazonaws.com
```

### Step 7: Add API CNAME to Netlify DNS

1. **Go to Netlify**: Site Settings → Domain Management → DNS

2. **Click "Add new record"**

3. **Configure the CNAME record**:
   - **Record Type**: CNAME
   - **Name**: `development--api` (for dev) or `api` (for production)
   - **Value**: `d-abc123xyz.execute-api.eu-central-1.amazonaws.com` (from step 6)
   - **TTL**: 3600 (1 hour)

4. **Click "Save"**

**⚠️ CRITICAL - Same Rule Applies:**

Only enter the subdomain part, NOT the full domain:

| Terraform Output | What to Enter in Netlify | Result |
|------------------|-------------------------|--------|
| `development--api.dtapline.com` | `development--api` | ✅ Correct |
| `api.dtapline.com` | `api` | ✅ Correct |

**DO NOT enter:**
- ❌ `development--api.dtapline.com`
- ❌ `api.dtapline.com`

**DO enter:**
- ✅ `development--api` (for dev)
- ✅ `api` (for production)

### Step 8: Verify Custom Domain

Wait 5-10 minutes for DNS propagation, then test your API:

```bash
# Test the custom domain
curl https://api.dtapline.com/health

# Expected response:
# {"status":"ok"}
```

You can also test DNS resolution:

```bash
# Should show the API Gateway CNAME
dig api.dtapline.com

# Should return 200 OK
curl -I https://api.dtapline.com/health
```

### Step 9: Update Frontend Configuration

Update your UI's environment variables to use the custom domain.

**For production** (`.env.production` or Netlify env vars):
```env
VITE_API_BASE_URL=https://api.dtapline.com
```

**For development** (`.env` or Netlify env vars):
```env
# If using custom domain
VITE_API_BASE_URL=https://development--api.dtapline.com

# Or if using API Gateway URL
VITE_API_BASE_URL=https://xyz123.execute-api.eu-central-1.amazonaws.com
```

You can get the correct URL from Terraform:

```bash
terraform output api_url
```

### Step 10: Update GitHub OAuth (Optional)

If you're using GitHub OAuth, update your OAuth App's callback URL:

1. Go to: https://github.com/settings/developers
2. Click on your OAuth App
3. Update **Authorization callback URL** to:
   - Production: `https://api.dtapline.com/api/auth/callback/github`
   - Development: `https://development--api.dtapline.com/api/auth/callback/github`
4. Click "Update application"

## DNS Records Summary

After complete setup, your Netlify DNS should have these records:

**For Production:**
```
# What you entered in Netlify → What gets created
_abc123.api         → _abc123.api.dtapline.com         CNAME   _xyz789.acm-validations.aws.   3600
api                 → api.dtapline.com                 CNAME   d-abc123.execute-api.eu-central-1.amazonaws.com   3600
```

**For Development:**
```
# What you entered in Netlify → What gets created
_def456.development--api    → _def456.development--api.dtapline.com    CNAME   _uvw890.acm-validations.aws.   3600
development--api            → development--api.dtapline.com            CNAME   d-def456.execute-api.eu-central-1.amazonaws.com   3600
```

**Remember:** In Netlify DNS, you only enter the left column (subdomain part). Netlify automatically appends `.dtapline.com` to create the right column (full domain).

## Troubleshooting

### DNS Record Name Formatting (Most Common Issue!)

**Problem:** Certificate validation fails or DNS doesn't resolve

**Cause:** Entered full domain name instead of subdomain in Netlify

**Symptoms:**
```bash
# DNS lookup fails
dig _abc123.api.dtapline.com
# Returns: NXDOMAIN (not found)

# Or resolves to wrong name with double domain
dig _abc123.api.dtapline.com.dtapline.com
```

**Solution:** Remove `.dtapline.com` from the Name field in Netlify DNS

**Examples of correct vs incorrect:**

| Terraform Output | ❌ WRONG (Don't Enter) | ✅ CORRECT (Enter This) |
|------------------|----------------------|------------------------|
| `_abc.api.dtapline.com` | `_abc.api.dtapline.com` | `_abc.api` |
| `_abc.development--api.dtapline.com` | `_abc.development--api.dtapline.com` | `_abc.development--api` |
| `api.dtapline.com` | `api.dtapline.com` | `api` |
| `development--api.dtapline.com` | `development--api.dtapline.com` | `development--api` |

**The Rule:** Netlify adds `.dtapline.com` automatically. Only enter the part BEFORE `.dtapline.com`.

**How to verify you did it right:**
```bash
# For validation record
dig _abc123.development--api.dtapline.com CNAME
# Should return: _xyz789.acm-validations.aws.

# For API record  
dig development--api.dtapline.com CNAME
# Should return: d-abc123.execute-api.eu-central-1.amazonaws.com
```

**If you already added the wrong record:**
1. Delete the incorrect record in Netlify DNS
2. Add new record with only the subdomain part
3. Wait 5-10 minutes for DNS propagation

### Certificate Validation Stuck at PENDING_VALIDATION

**Symptoms:** `terraform output certificate_status` shows "PENDING_VALIDATION" for more than 30 minutes

**Solutions:**
1. **Check DNS record**: `dig _abc123.api.dtapline.com CNAME`
   - Should return the validation target
   - If not found, DNS record is incorrect or not propagated

2. **Verify record in Netlify**:
   - Go to Netlify DNS settings
   - Ensure the validation CNAME exists
   - Name should be `_abc123.api` (not the full domain)

3. **Check AWS Certificate Manager**:
   - Go to ACM in eu-central-1 region
   - Click on the certificate
   - Verify the validation record matches what you added

4. **Wait longer**: DNS can take up to 48 hours (though usually 5-15 minutes)

### Custom Domain Not Resolving

**Symptoms:** `curl https://api.dtapline.com` fails or times out

**Solutions:**
1. **Check certificate is validated**:
   ```bash
   terraform output certificate_status  # Must be "ISSUED"
   ```

2. **Check DNS propagation**:
   ```bash
   dig api.dtapline.com
   # Should show CNAME to d-abc123.execute-api.eu-central-1.amazonaws.com
   ```

3. **Verify CNAME target**:
   ```bash
   terraform output api_gateway_target_domain
   # Compare with what's in Netlify DNS
   ```

4. **Check API Gateway**:
   - Go to API Gateway in AWS Console
   - Navigate to Custom domain names
   - Verify `api.dtapline.com` exists and is mapped to your API

5. **Wait for DNS**: Can take 5-15 minutes for global propagation

### SSL Certificate Errors

**Symptoms:** Browser shows "SSL certificate error" or "NET::ERR_CERT_AUTHORITY_INVALID"

**Solutions:**
1. **Certificate must be validated**: Check `certificate_status` output
2. **Domain mismatch**: Certificate domain must exactly match custom_domain_name
3. **Wait for propagation**: SSL can take a few minutes after DNS propagates
4. **Check ACM region**: Certificate must be in eu-central-1 (same as API Gateway)

### CORS Errors in Browser

**Symptoms:** Browser console shows CORS errors when calling API

**Solutions:**
1. **Update cors_origins** in `terraform.tfvars`:
   ```hcl
   cors_origins = "https://dtapline.com,https://api.dtapline.com"
   ```

2. **Re-deploy**:
   ```bash
   terraform apply
   ```

3. **Verify** the environment variable in Lambda:
   - Go to Lambda in AWS Console
   - Click on your function
   - Check Configuration → Environment variables
   - Ensure CORS_ORIGINS includes your frontend URL

### Terraform Errors

**Error:** `Error: creating API Gateway Domain Name: BadRequestException: The provided certificate is not valid`

**Solution:** Wait for certificate validation to complete before custom domain is created. Run `terraform apply` again after validation.

**Error:** `Error: creating API Gateway API Mapping: ConflictException: Domain name already exists`

**Solution:** Custom domain is already configured. If you need to recreate it:
```bash
terraform destroy -target=module.custom_domain
terraform apply
```

## Best Practices

1. ✅ **Production**: Always use custom domain (`api.dtapline.com`)
2. ✅ **Development**: Custom domain optional - API Gateway URL is simpler
3. ✅ **Certificate validation**: Keep validation CNAME record forever
4. ✅ **DNS TTL**: Use 3600 (1 hour) for API CNAME records
5. ✅ **GitHub OAuth**: Use separate OAuth Apps for dev and production
6. ✅ **Environment variables**: Update CORS origins after domain changes
7. ✅ **Testing**: Always test HTTPS after DNS changes

## Removing Custom Domain

To remove custom domain and revert to API Gateway URL:

1. **Update terraform.tfvars**:
   ```hcl
   custom_domain_name = ""
   auth_url           = "https://xyz123.execute-api.eu-central-1.amazonaws.com"
   ```

2. **Apply changes**:
   ```bash
   terraform apply
   ```
   
   This will:
   - ✅ Remove the custom domain mapping from API Gateway
   - ✅ Keep the ACM certificate (protected from deletion)
   - ✅ Switch API back to default API Gateway URL

3. **Update frontend** to use API Gateway URL

4. **(Optional) Remove DNS records** from Netlify:
   - You can keep them - they won't hurt anything
   - Or delete the API CNAME (but keep validation CNAME for future use)

## Certificate Management

### Certificate Protection

The ACM certificate has **deletion protection** enabled (`prevent_destroy = true`). This means:

✅ **Cannot be deleted accidentally** with `terraform destroy`
✅ **Protected from mistakes** - Prevents costly re-validation
✅ **Persists across changes** - Safe even if you change `custom_domain_name`

### Why This Matters

ACM certificates require DNS validation (5-30 minutes). Accidentally deleting one would:
- 🔴 Break your API domain immediately
- 🔴 Require DNS validation again
- 🔴 Cause downtime
- 🔴 Lose validation history

### Automatic Certificate Renewal

ACM certificates **auto-renew automatically**! 

✅ AWS renews certificates ~60 days before expiration
✅ Uses the same DNS validation CNAME you added during setup
✅ Zero downtime, zero manual work
✅ Renewal happens every ~13 months

**Critical:** Keep the validation CNAME record in Netlify DNS **forever** - it's required for auto-renewal!

### Intentionally Deleting a Certificate

Only needed if you're permanently switching domains or shutting down the API.

**Step 1: Remove deletion protection** in `packages/api/infra/main.tf`:

```hcl
resource "aws_acm_certificate" "api" {
  # ... other config ...
  
  lifecycle {
    create_before_destroy = true
    # prevent_destroy = true  # ← Comment out this line
  }
}
```

**Step 2: Apply the change:**

```bash
terraform apply  # Updates the lifecycle policy
```

**Step 3: Remove custom domain:**

```hcl
# In terraform.tfvars
custom_domain_name = ""
```

```bash
terraform apply  # This will now delete the certificate
```

**Step 4: Re-enable protection** (if you'll use certificates again in the future):

Restore the `prevent_destroy = true` line in `main.tf` and commit.

### Certificate Status Monitoring

Check your certificate status anytime:

```bash
# Certificate validation status
terraform output certificate_status
# Possible values: PENDING_VALIDATION, ISSUED, EXPIRED, VALIDATION_TIMED_OUT

# Certificate ARN
terraform output certificate_arn

# Check in AWS Console
# Go to: AWS Certificate Manager (ACM) → eu-central-1 region
# Find: dtapline-api-prd or dtapline-api-dev
```

### Switching Domains

If you need to change your domain (e.g., `api.dtapline.com` → `api.newdomain.com`):

**Option 1: Create new certificate (recommended)**

1. Update `custom_domain_name` in `terraform.tfvars`
2. Run `terraform apply`
3. Terraform will create a new certificate
4. Add new DNS validation records
5. Old certificate remains (safe to delete later)

**Option 2: Delete old certificate first**

1. Remove custom domain: `custom_domain_name = ""`
2. Follow certificate deletion steps above
3. Set new domain: `custom_domain_name = "api.newdomain.com"`
4. Run `terraform apply`
5. Add DNS validation records for new domain

## Automated Setup (CI/CD)

For automated deployments in GitHub Actions, the custom domain setup only needs to be done once manually. After that:

- Certificate persists across deployments
- DNS records remain unchanged
- Only Lambda code is updated by CI/CD

The GitHub Actions workflows don't need any changes - they work with both custom domains and API Gateway URLs.

## Additional Resources

- [AWS ACM Documentation](https://docs.aws.amazon.com/acm/)
- [API Gateway Custom Domain Names](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html)
- [Netlify DNS Documentation](https://docs.netlify.com/domains-https/netlify-dns/)

