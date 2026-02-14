import { setup as setupMongo, teardown as teardownMongo } from "vitest-mongodb"
import type { GlobalSetupContext } from "vitest/node"

/**
 * Global setup for vitest-mongodb
 *
 * This starts a MongoDB in-memory replica set before all tests
 * and provides the connection URI to tests via inject("mongoUri")
 *
 * Replica set is required for Better Auth transaction support
 */
export async function setup({ provide }: GlobalSetupContext) {
  console.log("Setting up MongoDB in-memory replica set...")

  await setupMongo({
    type: "replSet",
    serverOptions: {
      binary: {
        version: "7.0.24"
      },
      replSet: {
        count: 1,
        storageEngine: "wiredTiger"
      }
    }
  })

  // Provide mongoUri to tests via inject("mongoUri")
  // Type safety provided by vitest.d.ts
  provide("mongoUri", global.__MONGO_URI__)
  console.log(`MongoDB replica set ready at: ${global.__MONGO_URI__}`)
}

/**
 * Global teardown for vitest-mongodb
 *
 * This stops the MongoDB in-memory server after all tests
 */
export async function teardown() {
  console.log("Tearing down MongoDB in-memory server...")
  await teardownMongo()
}
