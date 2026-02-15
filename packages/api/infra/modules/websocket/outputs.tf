output "websocket_api_url" {
  description = "WebSocket API Gateway URL (wss://...)"
  value       = "${aws_apigatewayv2_api.websocket.api_endpoint}/default"
}

output "websocket_api_execution_arn" {
  description = "WebSocket API Gateway execution ARN"
  value       = aws_apigatewayv2_api.websocket.execution_arn
}

output "connections_table_name" {
  description = "DynamoDB connections table name"
  value       = aws_dynamodb_table.ws_connections.name
}

output "connections_table_arn" {
  description = "DynamoDB connections table ARN"
  value       = aws_dynamodb_table.ws_connections.arn
}
