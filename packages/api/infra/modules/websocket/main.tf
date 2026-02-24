locals {
  function_name = "${var.service_name}-ws-handler-${var.stage}"
}

# ============================================================================
# WebSocket Infrastructure
# DynamoDB connections table + WebSocket handler Lambda + API Gateway v2 WebSocket
# ============================================================================

# ----------------------------------------------------------------------------
# DynamoDB Connections Table
# ----------------------------------------------------------------------------

module "connections_table" {
  source  = "terraform-aws-modules/dynamodb-table/aws"
  version = "5.5.0"

  name     = "${var.service_name}-ws-connections-${var.stage}"
  hash_key = "connectionId"

  billing_mode        = "PROVISIONED"
  read_capacity       = 1
  write_capacity      = 1
  autoscaling_enabled = true

  autoscaling_read = {
    max_capacity = 10
  }

  autoscaling_write = {
    max_capacity = 10
  }

  ttl_attribute_name = "ttl"
  ttl_enabled        = true

  attributes = [{ name = "connectionId", type = "S" }]
}

# ----------------------------------------------------------------------------
# WebSocket Handler Lambda
# ----------------------------------------------------------------------------

resource "aws_iam_role" "lambda" {
  name               = "${var.service_name}-ws-lambda-role-${var.stage}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

data "aws_iam_policy_document" "lambda_assume_role" {
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
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# MongoDB Atlas IAM authentication policy
resource "aws_iam_role_policy" "mongodb_atlas" {
  name   = "mongodb-atlas-access"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.mongodb_atlas.json
}

data "aws_iam_policy_document" "mongodb_atlas" {
  statement {
    effect    = "Allow"
    actions   = ["sts:GetCallerIdentity"]
    resources = ["*"]
  }
}

# DynamoDB access for connection management (put/delete)
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name   = "ws-connections-dynamodb"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_dynamodb.json
}

data "aws_iam_policy_document" "lambda_dynamodb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:DeleteItem"
    ]
    resources = [module.connections_table.dynamodb_table_arn]
  }
}

# Create deployment package from dist folder
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = "${path.root}/.terraform/.deployment/${local.function_name}.zip"
}

locals {
  wsConnectionsTable = element(split("/", module.connections_table.dynamodb_table_arn), 1)
}

resource "aws_lambda_function" "websocket" {
  function_name = local.function_name
  role          = aws_iam_role.lambda.arn

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  handler = "index.handler"
  runtime = "nodejs20.x"

  timeout     = 10
  memory_size = 256

  environment {
    variables = merge(var.env_vars, {
      WS_CONNECTIONS_TABLE = local.wsConnectionsTable
    })
  }
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 7
}
