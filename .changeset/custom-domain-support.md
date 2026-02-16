---
"@dtapline/api": minor
---

Add custom domain support for API Gateway with automatic ACM certificate creation

- Add Terraform module for API Gateway custom domains
- Automatically create and validate ACM certificates
- Add certificate deletion protection (prevent_destroy)
- Support for both production (api.dtapline.com) and development (development--api.dtapline.com) domains
- Comprehensive setup documentation with Netlify DNS integration
- Certificate auto-renewal support
- New outputs: certificate_validation_records, certificate_status, api_gateway_target_domain
