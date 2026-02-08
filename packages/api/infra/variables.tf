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
