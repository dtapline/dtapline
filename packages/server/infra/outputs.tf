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
