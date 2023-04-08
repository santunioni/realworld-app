terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "santunioni-iac-state"
    region         = "us-east-1"
    dynamodb_table = "santunioni-iac-state-lock"
    key            = "realworld-app/production/lambda.tfstate"
  }
}

variable "ENVIRONMENT" {
  description = "The environment to deploy into"
  type        = string
}

variable "DATABASE_URL" {
  description = "The database url"
  type        = string
}

locals {
  COMMON_TAGS = {
    Environment = var.ENVIRONMENT
    RepoLink    = "https://github.com/santunioni/realworld-app"
  }
  name = "realworld-api-${var.ENVIRONMENT}"
}


provider "aws" {
}

resource "aws_iam_role" "realworld_api_function_role" {
  name               = local.name
  assume_role_policy = <<EOF
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Action": "sts:AssumeRole",
          "Principal": {
            "Service": "lambda.amazonaws.com"
          },
          "Effect": "Allow",
          "Sid": ""
        }
      ]
    }
EOF
  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  ]
  tags     = local.COMMON_TAGS
  provider = aws
}

resource "aws_lambda_function" "realworld_api_function" {
  function_name = local.name
  role          = aws_iam_role.realworld_api_function_role.arn
  tags          = local.COMMON_TAGS
  provider      = aws
  environment {
    variables = {
      DATABASE_URL = var.DATABASE_URL
    }
  }
  filename         = "${path.module}/../../build.zip"
  source_code_hash = filebase64sha256("${path.module}/../../build.zip")
  handler          = "lambda.handler"
  runtime          = "nodejs16.x"
  timeout          = 60 * 5
}

# API Gateway
resource "aws_api_gateway_rest_api" "api" {
  name                     = local.name
  description              = "API for ${local.name}"
  binary_media_types       = ["*/*"]
  minimum_compression_size = 0
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "{proxy+}"
}

# Requests mapping
resource "aws_api_gateway_method" "request_method" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "request_integration" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.request_method.resource_id
  http_method = aws_api_gateway_method.request_method.http_method
  type        = "AWS_PROXY"
  uri         = aws_lambda_function.realworld_api_function.invoke_arn

  # AWS lambdas can only be invoked with the POST method
  integration_http_method = "POST"
}

# OPTIONS are needed for COORS
resource "aws_api_gateway_method" "options_method" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method_response" "options_200" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.options_method.http_method
  status_code = "200"

  response_models = {
    "application/json" = "Empty"
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"      = true
    "method.response.header.Access-Control-Allow-Headers"     = true
    "method.response.header.Access-Control-Allow-Methods"     = true
    "method.response.header.Access-Control-Allow-Credentials" = true
  }

  depends_on = [aws_api_gateway_method.options_method]
}

resource "aws_api_gateway_integration" "options_integration" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.options_method.http_method

  type             = "MOCK"
  content_handling = "CONVERT_TO_TEXT"

  depends_on = [aws_api_gateway_method.options_method]
}

resource "aws_api_gateway_integration_response" "options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.options_method.http_method
  status_code = aws_api_gateway_method_response.options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,DELETE,GET,HEAD,PATCH,POST,PUT'"
  }

  depends_on = [
    aws_api_gateway_method_response.options_200,
    aws_api_gateway_integration.options_integration,
  ]
}

# Deployment
resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  stage_name  = var.ENVIRONMENT

  depends_on = [
    aws_api_gateway_integration.options_integration,
    aws_api_gateway_integration.request_integration,
  ]
}

# API Permissions
resource "aws_lambda_permission" "allow_api_gateway" {
  function_name = aws_lambda_function.realworld_api_function.arn
  statement_id  = "AllowExecutionFromApiGateway"
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_api_gateway_rest_api.api.execution_arn}/*/*/*"

  depends_on = [
    aws_api_gateway_rest_api.api,
    aws_api_gateway_resource.proxy,
  ]
}

output "http_method" {
  value = aws_api_gateway_method.request_method.http_method
}

output "url" {
  value = aws_api_gateway_deployment.deployment.invoke_url
}

output "rest_api_id" {
  value = aws_api_gateway_rest_api.api.id
}