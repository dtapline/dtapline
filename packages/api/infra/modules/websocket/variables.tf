variable "service_name" {
  description = "Service name prefix for all resources (e.g., dtapline-api-dev)"
  type        = string
}

variable "ws_lambda_source_dir" {
  description = "Path to the directory containing bundled WebSocket Lambda code"
  type        = string
}

variable "ws_lambda_env_vars" {
  description = "Environment variables for the WebSocket handler Lambda"
  type        = map(string)
  default     = {}
}
