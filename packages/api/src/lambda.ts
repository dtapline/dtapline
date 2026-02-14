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
 * CORS middleware is applied to handle preflight OPTIONS requests and
 * add appropriate CORS headers to all responses.
 *
 * @example Deploy with AWS CDK, SAM, or Serverless Framework:
 * ```yaml
 * # serverless.yml
 * functions:
 *   api:
 *     handler: dist/lambda.handler
 *     events:
 *       - httpApi: '*'
 * ```
 */
export const handler = LambdaHandler.fromHttpApi(
  Layer.mergeAll(AppLive, HttpServer.layerContext),
  {
    middleware: HttpMiddleware.cors({
      allowedOrigins: ["*"],
      credentials: true
    })
  }
)
