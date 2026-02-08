#!/usr/bin/env node
/* eslint-disable no-undef */

/**
 * Quick test to verify ObjectId migration works
 */

import { config } from "dotenv"
import { MongoClient, ObjectId } from "mongodb"

config()

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dtapline"

console.log("🧪 Testing ObjectId migration...")

const client = new MongoClient(MONGODB_URI)

try {
  await client.connect()
  const db = client.db()
  const collection = db.collection("projects")

  // Test 1: Insert with _id
  console.log("\n1️⃣ Inserting document...")
  const doc = {
    userId: "test-user",
    name: "Test Project",
    description: "Testing ObjectId",
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const result = await collection.insertOne(doc)
  console.log(`✅ Inserted with _id: ${result.insertedId}`)
  console.log(`   _id type: ${typeof result.insertedId}`)
  console.log(`   _id length: ${result.insertedId.toHexString().length} chars`)

  // Test 2: Find by _id
  console.log("\n2️⃣ Finding by _id...")
  const found = await collection.findOne({ _id: result.insertedId })
  console.log(`✅ Found: ${found.name}`)
  console.log(`   Has 'id' field: ${Object.prototype.hasOwnProperty.call(found, "id")}`)
  console.log(`   Has '_id' field: ${Object.prototype.hasOwnProperty.call(found, "_id")}`)

  // Test 3: Find by string _id (what repos do)
  console.log("\n3️⃣ Finding by string _id...")
  const hexString = result.insertedId.toHexString()
  const foundByString = await collection.findOne({ _id: new ObjectId(hexString) })
  console.log(`✅ Found by string: ${foundByString.name}`)

  // Test 4: Cleanup
  console.log("\n4️⃣ Cleaning up...")
  await collection.deleteOne({ _id: result.insertedId })
  console.log(`✅ Deleted`)

  console.log("\n🎉 All tests passed!")

  await client.close()
  process.exit(0)
} catch (error) {
  console.error("\n❌ Test failed:", error)
  await client.close()
  process.exit(1)
}
