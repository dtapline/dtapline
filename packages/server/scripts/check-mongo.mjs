#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * Helper script to check if MongoDB is accessible
 * Run this before starting the server to verify MongoDB connection
 */

import { config } from "dotenv"
import { MongoClient } from "mongodb"

config()

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"

console.log("🔍 Checking MongoDB connection...")
console.log(`📍 URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, "//<credentials>@")}`)

const client = new MongoClient(MONGODB_URI, {
  serverSelectionTimeoutMS: 3000
})

try {
  await client.connect()
  await client.db("admin").command({ ping: 1 })
  console.log("✅ MongoDB is accessible!")
  await client.close()
  process.exit(0)
} catch (error) {
  console.error("❌ Cannot connect to MongoDB:")
  console.error(error.message)
  console.log("\n💡 Tips:")
  console.log("  • Make sure MongoDB is running")
  console.log("  • Check MONGODB_URI in your .env file")
  console.log("  • For local MongoDB: brew services start mongodb-community")
  console.log("  • Or use Docker: docker run -d -p 27017:27017 mongo")
  await client.close()
  process.exit(1)
}
