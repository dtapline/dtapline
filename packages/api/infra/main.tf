terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.28"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  cloud {
    organization = "dtapline"

    workspaces {
      tags = ["dtapline-api"]
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "dtapline"
      Service   = "api"
      Stage     = var.stage
      ManagedBy = "terraform"
    }
  }
}

# ============================================================================
# WebSocket (real-time deployment updates)
# Declared before Lambda so its outputs can be referenced in Lambda env vars
# ============================================================================

module "websocket" {
  source = "./modules/websocket"

  service_name = "dtapline"
  source_dir   = "${path.module}/../dist/ws-lambda"
  stage        = var.stage

  env_vars = {
    AUTH_URL = var.auth_url
  }
}

# ============================================================================
# WebSocket API Gateway
# ============================================================================

module "ws_api_gateway" {
  source = "./modules/ws-api-gateway"

  api_name   = "dtapline-ws-api-${var.stage}"
  lambda_arn = module.websocket.function_arn
}

# ============================================================================
# Lambda Function
# ============================================================================

module "lambda" {
  source = "./modules/lambda"

  function_name = "dtapline-api-${var.stage}"
  source_dir    = "${path.module}/../dist/lambda"
  stage         = var.stage

  env_vars = {
    # MongoDB
    MONGODB_URI = var.mongodb_uri

    # Better Auth (required)
    AUTH_SECRET  = var.auth_secret
    AUTH_URL     = var.auth_url
    CORS_ORIGINS = var.cors_origins

    # GitHub OAuth (optional)
    GITHUB_CLIENT_ID     = var.github_client_id
    GITHUB_CLIENT_SECRET = var.github_client_secret

    # WebSocket broadcasting
    WS_API_URL           = module.ws_api_gateway.api_endpoint
    WS_CONNECTIONS_TABLE = module.websocket.connections_table_name
  }
}

# ============================================================================
# API Gateway
# ============================================================================

module "api_gateway" {
  source = "./modules/api-gateway"

  api_name   = "dtapline-api-${var.stage}"
  lambda_arn = module.lambda.function_arn
}

# ============================================================================
# IAM policies for API Lambda to broadcast via WebSocket
# Defined here (not in websocket module) to avoid circular module dependencies
# ============================================================================

# Allow the API Lambda to scan DynamoDB connections table
resource "aws_iam_role_policy" "api_lambda_ws_dynamodb" {
  name   = "ws-connections-scan"
  role   = module.lambda.role_name
  policy = data.aws_iam_policy_document.api_lambda_ws_dynamodb.json
}

data "aws_iam_policy_document" "api_lambda_ws_dynamodb" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:Scan"
    ]
    resources = [module.websocket.connections_table_arn]
  }
}

# Allow the API Lambda to post messages to WebSocket connections
resource "aws_iam_role_policy" "api_lambda_ws_manage" {
  name   = "ws-manage-connections"
  role   = module.lambda.role_name
  policy = data.aws_iam_policy_document.api_lambda_ws_manage.json
}

data "aws_iam_policy_document" "api_lambda_ws_manage" {
  statement {
    effect = "Allow"
    actions = [
      "execute-api:ManageConnections"
    ]
    resources = ["${module.ws_api_gateway.execution_arn}/*"]
  }
}

# ============================================================================
# ACM Certificate (Optional - for custom domain)
# ============================================================================

resource "aws_acm_certificate" "api" {
  count = var.custom_domain_name != "" ? 1 : 0

  domain_name       = var.custom_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true

    # Prevent accidental deletion of certificate
    # To delete: manually remove this block, then run terraform destroy
    prevent_destroy = true
  }

  tags = {
    Name = "dtapline-api-${var.stage}"
  }
}

# ============================================================================
# Custom Domain (Optional)
# ============================================================================

module "custom_domain" {
  source = "./modules/custom-domain"
  count  = var.custom_domain_name != "" ? 1 : 0

  domain_name     = var.custom_domain_name
  certificate_arn = aws_acm_certificate.api[0].arn
  api_id          = module.api_gateway.api_id
  stage_name      = "$default"

  # Wait for certificate to be issued before creating custom domain
  depends_on = [aws_acm_certificate.api]
}
