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
 * - MONGODB_URI: MongoDB connection string (for session validation)
 */
import * as LambdaHandler from "@effect-aws/lambda/LambdaHandler"
import * as Layer from "effect/Layer"
import { ServerConfigLive } from "./Config.js"
import { MongoDBLive } from "./MongoDB.js"
import { ConnectionsStoreLive } from "./Websocket/context.js"
import { handler as wsHandler } from "./Websocket/handler.js"

const MongoLive = MongoDBLive.pipe(Layer.provide(ServerConfigLive))

export const handler = LambdaHandler.make({
  handler: wsHandler,
  layer: Layer.merge(ConnectionsStoreLive, MongoLive)
})
