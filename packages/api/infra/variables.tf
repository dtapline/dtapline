variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "eu-central-1"
}

variable "stage" {
  description = "Stage of the deployment (dev or prd)"
  type        = string

  validation {
    condition     = contains(["dev", "prd"], var.stage)
    error_message = "Stage must be either 'dev' or 'prd'."
  }
}

variable "mongodb_uri" {
  description = "MongoDB connection URI with authentication parameters"
  type        = string
  sensitive   = true
}

# ============================================================================
# Better Auth Configuration
# ============================================================================

variable "auth_secret" {
  description = "Secret key for signing JWT tokens and session cookies (generate with: openssl rand -base64 32)"
  type        = string
  sensitive   = true
}

variable "auth_url" {
  description = "Base URL for authentication callbacks (e.g., https://api.dtapline.com for production)"
  type        = string
}

variable "cors_origins" {
  description = "Comma-separated list of allowed CORS origins (e.g., https://dtapline.com)"
  type        = string
}

variable "github_client_id" {
  description = "GitHub OAuth client ID (optional, enables GitHub login)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "github_client_secret" {
  description = "GitHub OAuth client secret (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

# ============================================================================
# Custom Domain Configuration
# ============================================================================

variable "custom_domain_name" {
  description = "Custom domain name for API Gateway (e.g., api.dtapline.com). Leave empty to use default API Gateway URL. Certificate will be created automatically."
  type        = string
  default     = ""
}
