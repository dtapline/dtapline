variable "service_name" {
  description = "Name of the service (used for naming resources)"
  type        = string
}

variable "source_dir" {
  description = "Path to the directory containing bundled Lambda code"
  type        = string
}

variable "stage" {
  description = "Stage of the deployment (dev or prd)"
  type        = string
}

variable "env_vars" {
  description = "Environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}
