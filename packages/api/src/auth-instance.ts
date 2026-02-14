import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { MongoClient } from "mongodb"

/**
 * Standalone Better Auth instance for use outside of Effect context
 *
 * This is used by the Node.js HTTP server to handle /api/auth/* routes
 * before they reach the Effect HTTP pipeline.
 */

const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/dtapline"
const client = new MongoClient(mongoUri)

// Connect the client
await client.connect()

const db = client.db()

export const auth = betterAuth({
  database: mongodbAdapter(db, { client }),
  baseURL: process.env.AUTH_URL || "http://localhost:3000",
  secret: process.env.AUTH_SECRET || "development-secret-please-change-in-production",
  trustedOrigins: (process.env.CORS_ORIGINS?.split(",").map((s) => s.trim()) || [
    "http://localhost:5173",
    "http://localhost:3000"
  ]),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false // Set to true in production with email service
  },

  socialProviders: process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET
      }
    }
    : {},

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: process.env.SELF_HOSTED === "true" ? "proUser" : "freeUser",
        required: true
      }
    }
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60 // 5 minutes
    }
  }
})
