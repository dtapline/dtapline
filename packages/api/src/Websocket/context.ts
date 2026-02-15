/**
 * DynamoDB connection store context
 *
 * Provides the DynamoDB layer for storing WebSocket connections.
 * Used by both the WebSocket handler Lambda (put/delete)
 * and the broadcast logic in the API Lambda (scan).
 */
import { DynamoDBServiceConfig } from "@effect-aws/client-dynamodb"
import { DynamoDBDocument, DynamoDBStore } from "@effect-aws/dynamodb"
import { Config, Layer } from "effect"

/**
 * DynamoDB connection store layer for the WebSocket handler Lambda
 * Reads table name from WS_CONNECTIONS_TABLE environment variable
 */
export const ConnectionsStoreLive = DynamoDBStore.layerConfig({
  tableName: Config.string("WS_CONNECTIONS_TABLE")
}).pipe(
  Layer.provide(DynamoDBDocument.defaultLayer),
  Layer.provide(
    DynamoDBServiceConfig.setDynamoDBServiceConfig({ logger: true })
  )
)

/**
 * DynamoDB connection store layer for the API Lambda (broadcasting)
 * Same config, but without verbose logging
 */
export const ConnectionsStoreBroadcastLive = DynamoDBStore.layerConfig({
  tableName: Config.string("WS_CONNECTIONS_TABLE")
}).pipe(
  Layer.provide(DynamoDBDocument.defaultLayer)
)
