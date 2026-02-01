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
    organization = "cloudmatrix"

    workspaces {
      tags = ["cloud-matrix-server"]
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "cloud-matrix"
      Service   = "server"
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

  function_name = "cloud-matrix-api-${var.stage}"
  source_dir    = "${path.module}/../dist/lambda"
  stage         = var.stage

  env_vars = {
    MONGODB_URI        = var.mongodb_uri
    DEFAULT_USER_ID    = "default-user"
    DEFAULT_USER_EMAIL = "team@cloudmatrix.io"
    DEFAULT_USER_NAME  = "CloudMatrix Team"
  }
}

# ============================================================================
# API Gateway
# ============================================================================

module "api_gateway" {
  source = "./modules/api-gateway"

  api_name   = "cloud-matrix-api-${var.stage}"
  lambda_arn = module.lambda.function_arn
}
