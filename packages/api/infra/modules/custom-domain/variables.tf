variable "domain_name" {
  description = "Custom domain name (e.g., api.dtapline.com)"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of ACM certificate for the domain"
  type        = string
}

variable "api_id" {
  description = "API Gateway API ID"
  type        = string
}

variable "stage_name" {
  description = "API Gateway stage name"
  type        = string
}
