# ============================================================================
# Lambda Function for CloudMatrix API
# ============================================================================

# Lambda execution role
resource "aws_iam_role" "lambda" {
  name               = "cloud-matrix-lambda-role-${var.stage}"
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
  # MongoDB Atlas requires these permissions for IAM authentication
  statement {
    effect = "Allow"
    actions = [
      "sts:GetCallerIdentity"
    ]
    resources = ["*"]
  }
}

# Create deployment package from dist folder
data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = "${path.root}/.terraform/.deployment/${var.function_name}.zip"
}

# Lambda function
resource "aws_lambda_function" "api" {
  function_name = var.function_name
  role          = aws_iam_role.lambda.arn

  # Deployment package from bundled dist folder
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  handler = "index.handler"
  runtime = "nodejs20.x"

  timeout     = 30
  memory_size = 512

  environment {
    variables = var.env_vars
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 7
}
