output "api_gateway_url" {
  description = "API Gateway endpoint URL"
  value       = module.api_gateway.api_endpoint
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = module.lambda.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = module.lambda.function_arn
}

output "lambda_role_arn" {
  description = "Lambda execution role ARN"
  value       = module.lambda.role_arn
}

output "websocket_api_url" {
  description = "WebSocket API Gateway URL (wss://...)"
  value       = module.websocket.websocket_api_url
}

output "websocket_connections_table" {
  description = "DynamoDB table name for WebSocket connections"
  value       = module.websocket.connections_table_name
}

# ============================================================================
# Custom Domain Outputs
# ============================================================================

output "custom_domain_name" {
  description = "Custom domain name (if configured)"
  value       = var.custom_domain_name != "" ? module.custom_domain[0].domain_name : null
}

output "api_gateway_target_domain" {
  description = "API Gateway regional domain name for DNS CNAME record (if custom domain configured)"
  value       = var.custom_domain_name != "" ? module.custom_domain[0].api_gateway_target_domain : null
}

output "api_url" {
  description = "API base URL (custom domain if configured, otherwise API Gateway URL)"
  value       = var.custom_domain_name != "" ? "https://${var.custom_domain_name}" : module.api_gateway.api_endpoint
}

output "certificate_validation_records" {
  description = "DNS records needed to validate the ACM certificate (add these to Netlify DNS)"
  value = var.custom_domain_name != "" ? {
    for dvo in aws_acm_certificate.api[0].domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  } : null
}

output "certificate_arn" {
  description = "ARN of the ACM certificate (if custom domain configured)"
  value       = var.custom_domain_name != "" ? aws_acm_certificate.api[0].arn : null
}

output "certificate_status" {
  description = "Status of the ACM certificate validation"
  value       = var.custom_domain_name != "" ? aws_acm_certificate.api[0].status : null
}
