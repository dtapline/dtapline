#!/usr/bin/env tsx
/**
 * Seed script for demo user with sample e-commerce microservices data
 *
 * Usage:
 *   cd packages/api
 *   tsx scripts/seed-demo-user.ts
 *
 * Or from root:
 *   cd packages/api && pnpm seed:demo
 */

import { config } from "dotenv"
import { MongoClient } from "mongodb"

config()

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/dtapline"
const DEMO_EMAIL = "demo@dtapline.com"
const DEMO_PASSWORD = "demodemo" // Better Auth requires minimum 8 characters
const AUTH_URL = process.env.AUTH_URL || "http://localhost:3000"

async function seedDemoUser() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log("✓ Connected to MongoDB")

    const db = client.db()

    // 1. Check if demo user exists
    let user = await db.collection("user").findOne({ email: DEMO_EMAIL })

    if (!user) {
      console.log("Creating demo user via Better Auth sign-up...")

      // Use Better Auth API to create user with proper password hashing
      const response = await fetch(`${AUTH_URL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": AUTH_URL
        },
        body: JSON.stringify({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          name: "Demo User"
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to create user via Better Auth: ${error}`)
      }

      console.log(`✓ Created demo user: ${DEMO_EMAIL}`)

      // Fetch the newly created user
      user = await db.collection("user").findOne({ email: DEMO_EMAIL })

      if (!user) {
        throw new Error("User was created but not found in database")
      }

      // Update the role to demoUser
      await db.collection("user").updateOne(
        { _id: user._id },
        { $set: { role: "demoUser" } }
      )
      console.log(`✓ Updated user role to demoUser`)
    } else {
      console.log(`✓ Demo user already exists: ${DEMO_EMAIL}`)
    }

    const userId = user._id.toString()

    // 2. Create demo project
    const project = await db.collection("projects").findOne({
      userId,
      name: "Demo E-Commerce Platform"
    })

    let projectId
    if (!project) {
      console.log("Creating demo project...")
      const result = await db.collection("projects").insertOne({
        userId,
        name: "Demo E-Commerce Platform",
        description: "A sample microservices e-commerce application showcasing deployment tracking",
        gitRepoUrl: "https://github.com/example/ecommerce",
        selectedEnvironmentIds: null,
        tier: "free",
        createdAt: new Date(),
        updatedAt: new Date()
      })
      projectId = result.insertedId.toString()
      console.log(`✓ Created project: Demo E-Commerce Platform`)
    } else {
      projectId = project._id.toString()
      console.log(`✓ Project already exists: Demo E-Commerce Platform`)
    }

    // 3. Create environments (dev, staging, prod)
    const envs = [
      { slug: "dev", name: "Development", color: "#22D3EE" },
      { slug: "staging", name: "Staging", color: "#F59E0B" },
      { slug: "prod", name: "Production", color: "#8B5CF6" }
    ]
    const envIds: Record<string, string> = {}

    for (const [idx, env] of envs.entries()) {
      const existing = await db.collection("environments").findOne({ userId, slug: env.slug })
      if (existing) {
        envIds[env.slug] = existing._id.toString()
        console.log(`✓ Environment already exists: ${env.name}`)
      } else {
        const result = await db.collection("environments").insertOne({
          userId,
          slug: env.slug,
          name: env.name,
          color: env.color,
          order: idx,
          archived: false,
          createdAt: new Date()
        })
        envIds[env.slug] = result.insertedId.toString()
        console.log(`✓ Created environment: ${env.name}`)
      }
    }

    // 4. Create services
    const services = [
      { slug: "web-app", name: "Web App", desc: "React frontend application" },
      { slug: "api-gateway", name: "API Gateway", desc: "Kong API Gateway" },
      { slug: "auth-service", name: "Auth Service", desc: "Authentication & authorization" },
      { slug: "payment-service", name: "Payment Service", desc: "Payment processing (Stripe)" },
      { slug: "inventory-service", name: "Inventory Service", desc: "Product inventory management" },
      { slug: "order-service", name: "Order Service", desc: "Order processing" },
      { slug: "notification-service", name: "Notification Service", desc: "Email & SMS notifications" }
    ]

    const serviceIds: Record<string, string> = {}
    for (const svc of services) {
      const existing = await db.collection("services").findOne({ projectId, slug: svc.slug })
      if (existing) {
        serviceIds[svc.slug] = existing._id.toString()
        console.log(`✓ Service already exists: ${svc.name}`)
      } else {
        const result = await db.collection("services").insertOne({
          projectId,
          slug: svc.slug,
          name: svc.name,
          repositoryUrl: `https://github.com/example/${svc.slug}`,
          iconUrl: null,
          archived: false,
          createdAt: new Date()
        })
        serviceIds[svc.slug] = result.insertedId.toString()
        console.log(`✓ Created service: ${svc.name}`)
      }
    }

    // 5. Create deployments (showing version drift across environments)
    const versions: Record<
      string,
      Record<
        string,
        { version: string; commitSha: string; status: "success" | "failed" | "in_progress" | "rolled_back" }
      >
    > = {
      dev: {
        "web-app": { version: "1.3.0-dev.42", commitSha: "a1b2c3d", status: "success" },
        "api-gateway": { version: "2.1.0-dev.15", commitSha: "e4f5g6h", status: "in_progress" }, // In progress
        "auth-service": { version: "1.5.2", commitSha: "i7j8k9l", status: "success" },
        "payment-service": { version: "3.0.1", commitSha: "m0n1o2p", status: "failed" }, // Failed deployment
        "inventory-service": { version: "2.2.0", commitSha: "q3r4s5t", status: "success" },
        "order-service": { version: "1.8.0-dev.3", commitSha: "u6v7w8x", status: "success" },
        "notification-service": { version: "1.4.1", commitSha: "y9z0a1b", status: "success" }
      },
      staging: {
        "web-app": { version: "1.2.0", commitSha: "c2d3e4f", status: "success" },
        "api-gateway": { version: "2.0.5", commitSha: "g5h6i7j", status: "success" },
        "auth-service": { version: "1.5.1", commitSha: "k8l9m0n", status: "success" },
        "payment-service": { version: "3.0.0", commitSha: "o1p2q3r", status: "success" },
        "inventory-service": { version: "2.1.3", commitSha: "s4t5u6v", status: "in_progress" }, // In progress
        "order-service": { version: "1.7.5", commitSha: "w7x8y9z", status: "success" },
        "notification-service": { version: "1.4.0", commitSha: "a0b1c2d", status: "success" }
      },
      prod: {
        "web-app": { version: "1.1.0", commitSha: "e3f4g5h", status: "success" },
        "api-gateway": { version: "2.0.3", commitSha: "i6j7k8l", status: "success" },
        "auth-service": { version: "1.5.0", commitSha: "m9n0o1p", status: "success" },
        "payment-service": { version: "2.9.1", commitSha: "q2r3s4t", status: "rolled_back" }, // Rolled back
        "inventory-service": { version: "2.1.0", commitSha: "u5v6w7x", status: "success" },
        "order-service": { version: "1.7.0", commitSha: "y8z9a0b", status: "failed" }, // Failed deployment
        "notification-service": { version: "1.3.5", commitSha: "c1d2e3f", status: "success" }
      }
    }

    let deploymentsCreated = 0
    for (const [envSlug, svcVersions] of Object.entries(versions)) {
      for (const [svcSlug, deployment] of Object.entries(svcVersions)) {
        const deploymentHash = `${projectId}-${envIds[envSlug]}-${serviceIds[svcSlug]}`

        const existing = await db.collection("deployments").findOne({ deploymentHash })
        if (!existing) {
          const daysAgo = envSlug === "prod" ? 7 : envSlug === "staging" ? 3 : 0
          const deployedAt = new Date()
          deployedAt.setDate(deployedAt.getDate() - daysAgo)

          // Create status history based on deployment status
          const statusHistory: Array<{ status: string; timestamp: Date; message?: string }> = []

          if (deployment.status === "success") {
            statusHistory.push(
              { status: "in_progress", timestamp: new Date(deployedAt.getTime() - 5 * 60 * 1000) }, // 5 min before
              { status: "success", timestamp: deployedAt }
            )
          } else if (deployment.status === "failed") {
            statusHistory.push(
              { status: "in_progress", timestamp: new Date(deployedAt.getTime() - 3 * 60 * 1000) }, // 3 min before
              { status: "failed", timestamp: deployedAt, message: "Build failed: Test suite returned exit code 1" }
            )
          } else if (deployment.status === "in_progress") {
            statusHistory.push(
              { status: "in_progress", timestamp: deployedAt, message: "Deployment in progress..." }
            )
          } else if (deployment.status === "rolled_back") {
            statusHistory.push(
              { status: "in_progress", timestamp: new Date(deployedAt.getTime() - 10 * 60 * 1000) }, // 10 min before
              { status: "success", timestamp: new Date(deployedAt.getTime() - 5 * 60 * 1000) }, // 5 min before
              { status: "rolled_back", timestamp: deployedAt, message: "Rolled back due to increased error rate" }
            )
          }

          await db.collection("deployments").insertOne({
            deploymentHash,
            projectId,
            environmentId: envIds[envSlug],
            serviceId: serviceIds[svcSlug],
            version: deployment.version,
            commitSha: deployment.commitSha,
            gitTag: `v${deployment.version}`,
            deployedBy: "demo-ci",
            deployedAt,
            status: deployment.status,
            statusHistory,
            buildUrl: `https://github.com/example/${svcSlug}/actions/runs/12345`,
            pullRequestUrl: null,
            releaseNotes: null,
            diffUrl: null,
            metadata: null,
            createdAt: deployedAt
          })
          deploymentsCreated++
        }
      }
    }

    if (deploymentsCreated > 0) {
      console.log(`✓ Created ${deploymentsCreated} deployments`)
    } else {
      console.log(`✓ All deployments already exist`)
    }

    // 6. Create a version pattern for the project
    const patternExists = await db.collection("version_patterns").findOne({ projectId })
    if (!patternExists) {
      await db.collection("version_patterns").insertOne({
        projectId,
        pattern: "v(\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9.]+)?)",
        description: "Extracts semantic versions from git tags (e.g., v1.2.3, v1.2.3-beta.1)",
        createdAt: new Date(),
        updatedAt: new Date()
      })
      console.log(`✓ Created version pattern`)
    } else {
      console.log(`✓ Version pattern already exists`)
    }

    console.log("\n✅ Demo user seeding complete!")
    console.log(`\nDemo credentials:`)
    console.log(`  Email: ${DEMO_EMAIL}`)
    console.log(`  Password: ${DEMO_PASSWORD}`)
    console.log(`\n  URL: http://localhost:5173 (or your deployed URL)`)
  } catch (error) {
    console.error("❌ Error seeding demo user:", error)
    process.exit(1)
  } finally {
    await client.close()
    console.log("\n✓ Disconnected from MongoDB")
  }
}

// Run the seed script
seedDemoUser()
