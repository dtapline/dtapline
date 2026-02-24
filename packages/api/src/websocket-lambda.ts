/**
 * AWS Lambda handler for WebSocket connections
 *
 * This Lambda handles WebSocket API Gateway events:
 * - $connect: Validates session token and stores connection in DynamoDB
 * - $disconnect: Removes connection from DynamoDB
 * - $default: Logs and ignores
 *
 * Environment variables required:
 * - WS_CONNECTIONS_TABLE: DynamoDB table name for storing connections
 * - AUTH_SECRET: Better Auth secret (for session validation)
 * - AUTH_URL: Better Auth base URL (for session validation)
 * - MONGODB_URI: MongoDB connection string (for session validation)
 */
import { LambdaHandler } from "@effect-aws/lambda"
import { ConnectionsStoreLive } from "./Websocket/context.js"
import { handler as wsHandler } from "./Websocket/handler.js"

export const handler = LambdaHandler.make({
  handler: wsHandler,
  layer: ConnectionsStoreLive
})
