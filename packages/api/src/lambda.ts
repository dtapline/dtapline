import { LambdaHandler } from "@effect-aws/lambda"
import { HttpMiddleware, HttpServer } from "@effect/platform"
import { Layer } from "effect"
import { AppLive } from "./Layers.js"

/**
 * AWS Lambda handler for Dtapline API
 *
 * This handler converts the Effect HTTP API into an AWS Lambda function
 * that can be deployed to AWS Lambda and API Gateway.
 *
 * Better Auth is fully supported in Lambda with:
 * - OAuth flows (GitHub, Google, etc.)
 * - Session management with MongoDB
 * - Proper CORS configuration from environment
 *
 * Environment variables required:
 * - MONGODB_URI: MongoDB connection string
 * - AUTH_SECRET: Secret for signing cookies
 * - AUTH_URL: Base URL for auth (e.g., https://api.yourdomain.com)
 * - CORS_ORIGINS: Comma-separated list of allowed origins
 * - GITHUB_CLIENT_ID: (optional) GitHub OAuth client ID
 * - GITHUB_CLIENT_SECRET: (optional) GitHub OAuth client secret
 *
 * @example Deploy with AWS CDK, SAM, or Serverless Framework:
 * ```yaml
 * # serverless.yml
 * functions:
 *   api:
 *     handler: dist/lambda.handler
 *     events:
 *       - httpApi: '*'
 *     environment:
 *       MONGODB_URI: ${env:MONGODB_URI}
 *       AUTH_SECRET: ${env:AUTH_SECRET}
 *       AUTH_URL: https://api.yourdomain.com
 *       CORS_ORIGINS: https://yourdomain.com
 *       GITHUB_CLIENT_ID: ${env:GITHUB_CLIENT_ID}
 *       GITHUB_CLIENT_SECRET: ${env:GITHUB_CLIENT_SECRET}
 * ```
 */

// Get CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGINS?.split(",").map((s) => s.trim()) || ["*"]

export const handler = LambdaHandler.fromHttpApi(
  Layer.mergeAll(AppLive, HttpServer.layerContext),
  {
    middleware: HttpMiddleware.cors({
      allowedOrigins: corsOrigins,
      allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
      exposedHeaders: ["Set-Cookie"],
      credentials: true
    })
  }
)
