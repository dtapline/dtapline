# Dtapline Deployment - Ready! 🚀

Simple deployment setup for Dtapline self-hosting using Terraform.

## ✅ What's Included

**Infrastructure:**
- ✓ Server infrastructure (Lambda + API Gateway) in `packages/api/infra/`
- ✓ Terraform workspaces: 2 (development, production)
- ✓ Lambda code bundled with esbuild and deployed via Terraform
- ✓ Simple AWS credentials (no OIDC complexity)

**GitHub Actions:**
- ✓ `deploy-development.yml` - Deploy on push to main
- ✓ `deploy-production.yml` - Deploy on release tags
- ✓ Dtapline CLI integration for self-tracking

**Documentation:**
- ✓ `docs/deployment-setup.md` - Complete setup guide
- ✓ `docs/deployment-quickref.md` - Quick reference
- ✓ `packages/api/infra/README.md` - Infrastructure guide

---

## 📋 Quick Setup Checklist

### 1. AWS CI User (10 min)
```bash
# Create CI user in both accounts (optional - can use admin)
aws iam create-user --user-name dtapline-ci
aws iam create-access-key --user-name dtapline-ci
```

### 2. Terraform Cloud (5 min)
- Create workspaces: `dtapline-api-{environment}`
- Add AWS credentials to workspaces

### 3. MongoDB Atlas (10 min)
- Enable IAM authentication
- Create database users (ARNs from Terraform)
- Allow AWS IPs: `0.0.0.0/0`

### 4. Deploy Infrastructure (10 min)
```bash
cd packages/api

# Bundle Lambda code
pnpm bundle:lambda

# Deploy with Terraform
cd infra
terraform init
terraform apply -var-file=terraform.tfvars
```

### 5. Netlify (5 min)
- Create site
- Get auth token and site ID

### 6. Dtapline Project (5 min)
- Start local server or deploy
- Create project
- Generate API key

### 7. GitHub Configuration (10 min)
- Add 7 secrets (AWS keys, TF token, API key, Netlify, NPM)
- Add 2 variables (API Gateway URLs - optional, from Terraform outputs)

### 8. Test (5 min)
```bash
git commit --allow-empty -m "test"
git push origin main
```

**Total: ~60 minutes**

---

## 🔐 GitHub Secrets Needed

| Secret | Purpose |
|--------|---------|
| `AWS_ACCESS_KEY_ID_DEV` | CI user development |
| `AWS_SECRET_ACCESS_KEY_DEV` | CI user development |
| `AWS_ACCESS_KEY_ID_PROD` | CI user production |
| `AWS_SECRET_ACCESS_KEY_PROD` | CI user production |
| `TF_API_TOKEN` | Terraform Cloud API token |
| `DTAPLINE_API_KEY` | Dtapline API key |
| `NETLIFY_AUTH_TOKEN` | Netlify deployment |
| `NETLIFY_SITE_ID` | Netlify site |
| `NPM_TOKEN` | NPM publishing |

---

## 📊 Expected Result

After deployment, Dtapline dashboard shows:

```
         api           ui            cli
prd     v1.0.0        v1.0.0        v1.0.0
        ✅            ✅            📦

dev     abc1234       abc1234       -
        ✅            ✅            (not deployed)
```

**Environments tracked:**
- `development` - Every push to main
- `production` - Release tags only

**Services tracked:**
- `api` - Lambda backend
- `ui` - Netlify frontend
- `cli` - NPM package

---

## 🎯 Deployment Flow

**Development** (continuous):
```
Push to main → Bundle Lambda → Terraform Apply → Dtapline tracks it
```

**Production** (controlled):
```
Create changeset → Merge PR → Tag → Bundle Lambda → Terraform Apply → Dtapline tracks it
```

---

## 🔧 How It Works

1. **Bundle**: `pnpm bundle:lambda` creates `dist/lambda/index.js` (1.4MB minified CommonJS bundle)
   - Uses MongoDB's ESM source via `--alias:mongodb=mongodb/src` to avoid CommonJS compatibility issues
   - Outputs CommonJS (no `--format` flag) to properly handle Node.js built-ins (zlib, timers, etc.)
   - Minified and tree-shaken for optimal size
   - AWS SDK externalized (provided by Lambda runtime)
2. **Archive**: Terraform's `archive_file` data source zips the dist folder
3. **Deploy**: Terraform creates/updates Lambda with the new code
4. **Track**: GitHub Actions reports deployment to Dtapline

**Key advantage:** Terraform manages complete infrastructure including Lambda code - no separate AWS CLI update step needed.

---

## 📚 Documentation

- **Setup Guide**: `docs/deployment-setup.md` - Complete step-by-step
- **Quick Reference**: `docs/deployment-quickref.md` - Commands & config
- **Infrastructure**: `packages/api/infra/README.md` - Terraform details

---

## ✨ Why This Approach?

**Simple & Declarative:**
- ✅ Terraform manages everything (infra + code)
- ✅ No manual Lambda updates via AWS CLI
- ✅ Single bundled file (faster cold starts)
- ✅ Reproducible deployments
- ✅ Standard AWS credentials

**Each Service Owns Its Deployment:**
- Server: Terraform (Lambda)
- UI: GitHub Action (Netlify)
- CLI: Changesets (NPM)

---

## 🚀 Ready to Deploy!

Follow the guide: `docs/deployment-setup.md`

Total setup time: **~60 minutes**
