import { HttpApiBuilder, HttpMiddleware } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { config } from "dotenv"
import { Effect, Layer } from "effect"
import { createServer } from "node:http"
import { AppLive } from "./Layers.js"

// Load environment variables from .env file
config()

/**
 * Local development server for Dtapline API
 *
 * Starts an HTTP API server on port 3000 with request logging middleware.
 * All dependencies (MongoDB, repositories, services, auth) are automatically
 * provided by the AppLive layer.
 *
 * Better Auth is mounted at /api/auth/* for handling authentication requests
 * (sign in, sign up, OAuth callbacks, etc.)
 *
 * @example Run locally:
 * ```bash
 * cd packages/api
 * tsx src/server.ts
 * ```
 *
 * Environment variables required:
 * - MONGODB_URI: MongoDB connection string
 * - AUTH_SECRET: Secret for signing cookies
 * - AUTH_URL: Base URL for auth (e.g. http://localhost:3000)
 * - GITHUB_CLIENT_ID: (optional) GitHub OAuth client ID
 * - GITHUB_CLIENT_SECRET: (optional) GitHub OAuth client secret
 */

// Log startup
console.log("🚀 Starting Dtapline API server...")
console.log(`📍 Server will listen on http://localhost:3000`)
console.log(`🗄️  MongoDB URI: ${process.env.MONGODB_URI?.replace(/\/\/[^:]+:[^@]+@/, "//<credentials>@") || "NOT SET"}`)

// Get allowed CORS origins from environment
const allowedOrigins = process.env.CORS_ORIGINS?.split(",").map((s) => s.trim()) || [
  "http://localhost:5173",
  "http://localhost:3000"
]
console.log(`🌐 CORS enabled for: ${allowedOrigins.join(", ")}`)

const HttpLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(HttpApiBuilder.middlewareCors({ allowedOrigins, credentials: true })),
  Layer.provide(AppLive),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.tapErrorCause((cause) =>
    Effect.sync(() => {
      console.error("\n❌ Server failed to start:")
      console.error(cause)
    })
  ),
  Layer.tap(() => Effect.sync(() => console.log("\n✅ Server is ready and listening on http://localhost:3000\n")))
)

NodeRuntime.runMain(
  Layer.launch(HttpLive)
)
