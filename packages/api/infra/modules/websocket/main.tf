# ============================================================================
# WebSocket Infrastructure
# DynamoDB connections table + WebSocket handler Lambda + API Gateway v2 WebSocket
# ============================================================================

# ----------------------------------------------------------------------------
# DynamoDB Connections Table
# ----------------------------------------------------------------------------

resource "aws_dynamodb_table" "ws_connections" {
  name         = "${var.service_name}-ws-connections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connectionId"

  attribute {
    name = "connectionId"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name = "${var.service_name}-ws-connections"
  }
}

# ----------------------------------------------------------------------------
# WebSocket Handler Lambda
# ----------------------------------------------------------------------------

resource "aws_iam_role" "ws_lambda" {
  name               = "${var.service_name}-ws-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.ws_lambda_assume_role.json
}

data "aws_iam_policy_document" "ws_lambda_assume_role" {
  statement {
    sid    = "LambdaAssumeRole"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

# CloudWatch Logs policy
resource "aws_iam_role_policy_attachment" "ws_lambda_logs" {
  role       = aws_iam_role.ws_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB access for connection management (put/delete)
resource "aws_iam_role_policy" "ws_lambda_dynamodb" {
  name   = "ws-connections-dynamodb"
  role   = aws_iam_role.ws_lambda.id
  policy = data.aws_iam_policy_document.ws_lambda_dynamodb.json
}

data "aws_iam_policy_document" "ws_lambda_dynamodb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:DeleteItem"
    ]
    resources = [aws_dynamodb_table.ws_connections.arn]
  }
}

# Create deployment package from dist folder
data "archive_file" "ws_lambda" {
  type        = "zip"
  source_dir  = var.ws_lambda_source_dir
  output_path = "${path.root}/.terraform/.deployment/${var.service_name}-ws-handler.zip"
}

resource "aws_lambda_function" "ws_handler" {
  function_name = "${var.service_name}-ws-handler"
  role          = aws_iam_role.ws_lambda.arn

  filename         = data.archive_file.ws_lambda.output_path
  source_code_hash = data.archive_file.ws_lambda.output_base64sha256

  handler = "index.handler"
  runtime = "nodejs20.x"

  timeout     = 10
  memory_size = 256

  environment {
    variables = merge(var.ws_lambda_env_vars, {
      WS_CONNECTIONS_TABLE = aws_dynamodb_table.ws_connections.name
    })
  }
}

resource "aws_cloudwatch_log_group" "ws_lambda" {
  name              = "/aws/lambda/${var.service_name}-ws-handler"
  retention_in_days = 7
}

# ----------------------------------------------------------------------------
# API Gateway v2 WebSocket API
# ----------------------------------------------------------------------------

resource "aws_apigatewayv2_api" "websocket" {
  name                       = "${var.service_name}-ws"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

resource "aws_apigatewayv2_stage" "websocket" {
  api_id      = aws_apigatewayv2_api.websocket.id
  name        = "default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.ws_api.arn
    format = jsonencode({
      requestId    = "$context.requestId"
      ip           = "$context.identity.sourceIp"
      routeKey     = "$context.routeKey"
      status       = "$context.status"
      connectionId = "$context.connectionId"
      eventType    = "$context.eventType"
    })
  }
}

resource "aws_cloudwatch_log_group" "ws_api" {
  name              = "/aws/apigateway/${var.service_name}-ws-access-logs"
  retention_in_days = 7
}

# Lambda integration
resource "aws_apigatewayv2_integration" "websocket" {
  api_id = aws_apigatewayv2_api.websocket.id

  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.ws_handler.invoke_arn
}

# Routes: $connect, $disconnect, $default
resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.websocket.id}"
}

resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.websocket.id}"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.websocket.id}"
}

# Allow API Gateway to invoke the Lambda
resource "aws_lambda_permission" "ws_api_gateway" {
  statement_id  = "AllowWebSocketAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ws_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}


