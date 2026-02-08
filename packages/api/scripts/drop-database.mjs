#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * Helper script to drop the CloudMatrix database
 * Use with caution - this will delete all data!
 */

import { config } from "dotenv"
import { MongoClient } from "mongodb"

config()

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
const DB_NAME = MONGODB_URI.split("/").pop()?.split("?")[0] || "dtapline"

console.log("⚠️  WARNING: This will delete ALL data in the database!")
console.log(`📍 URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, "//<credentials>@")}`)
console.log(`🗑️  Database: ${DB_NAME}`)

const client = new MongoClient(MONGODB_URI, {
  serverSelectionTimeoutMS: 3000
})

try {
  await client.connect()
  await client.db(DB_NAME).dropDatabase()
  console.log("✅ Database dropped successfully!")
  await client.close()
  process.exit(0)
} catch (error) {
  console.error("❌ Failed to drop database:")
  console.error(error.message)
  await client.close()
  process.exit(1)
}
