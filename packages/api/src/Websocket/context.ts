/**
 * DynamoDB connection store context
 *
 * Provides the DynamoDB layer for storing WebSocket connections.
 * Used by both the WebSocket handler Lambda (put/delete)
 * and the broadcast logic in the API Lambda (scan).
 */
import { setDynamoDBServiceConfig } from "@effect-aws/client-dynamodb/DynamoDBServiceConfig"
import { DynamoDBDocumentService } from "@effect-aws/dynamodb/DynamoDBDocumentService"
import { DynamoDBStore } from "@effect-aws/dynamodb/DynamoDBStore"
import * as Config from "effect/Config"
import * as Layer from "effect/Layer"

/**
 * DynamoDB connection store layer for the WebSocket handler Lambda
 * Reads table name from WS_CONNECTIONS_TABLE environment variable
 */
export const ConnectionsStoreLive = DynamoDBStore.layerConfig({
  tableName: Config.string("WS_CONNECTIONS_TABLE")
}).pipe(
  Layer.provide(DynamoDBDocumentService.defaultLayer),
  Layer.provide(setDynamoDBServiceConfig({ logger: true }))
)
