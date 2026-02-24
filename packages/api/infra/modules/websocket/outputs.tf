output "function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.websocket.function_name
}

output "function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.websocket.arn
}

output "connections_table_name" {
  description = "DynamoDB connections table name"
  value       = local.wsConnectionsTable
}

output "connections_table_arn" {
  description = "DynamoDB connections table ARN"
  value       = module.connections_table.dynamodb_table_arn
}

output "role_name" {
  description = "WebSocket Lambda execution role name"
  value       = aws_iam_role.lambda.name
}
