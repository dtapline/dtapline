terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
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
