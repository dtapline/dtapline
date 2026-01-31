import { HttpApiBuilder, HttpMiddleware } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer } from "effect"
import { createServer } from "node:http"
import { AppLive } from "./Layers.js"

/**
 * Local development server for CloudMatrix API
 *
 * Starts an HTTP server on port 3000 with request logging middleware.
 * All dependencies (MongoDB, repositories, services) are automatically
 * provided by the AppLive layer.
 *
 * @example Run locally:
 * ```bash
 * cd packages/server
 * tsx src/server.ts
 * ```
 *
 * Environment variables required:
 * - MONGODB_URI: MongoDB connection string
 * - DEFAULT_USER_ID: User ID for MVP (defaults to "default-user")
 * - DEFAULT_USER_EMAIL: User email for MVP
 * - DEFAULT_USER_NAME: User name for MVP
 */
const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(AppLive),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
)

Layer.launch(HttpLive).pipe(
  NodeRuntime.runMain
)
