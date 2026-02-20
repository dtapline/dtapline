import { ProjectNotFound } from "@dtapline/domain/Errors"
import { it } from "@effect/vitest"
import { Cause, Effect, Layer } from "effect"
import { MongoClient } from "mongodb"
import { describe, expect, inject } from "vitest"
import { MongoClientTag, MongoDatabase } from "../src/MongoDB.js"
import { ProjectsRepository, ProjectsRepositoryLive } from "../src/Repositories/ProjectsRepository.js"

/**
 * Integration tests for project cascade deletion
 *
 * Test Coverage:
 * 1. Deleting a project cascades to services, deployments, and API keys
 * 2. Transaction rolls back if project doesn't exist
 * 3. Related records are deleted atomically
 */
describe("Project Cascade Deletion", () => {
  // Helper to create test layers
  const createTestLayers = () =>
    Effect.gen(function*() {
      const mongoUri = inject("mongoUri")
      const client = new MongoClient(mongoUri)
      yield* Effect.promise(() => client.connect())
      const dbName = `test-dtapline-cascade-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
      const db = client.db(dbName)

      const mongoLayer = Layer.mergeAll(
        Layer.succeed(MongoDatabase, db),
        Layer.succeed(MongoClientTag, client)
      )

      return Layer.provideMerge(ProjectsRepositoryLive, mongoLayer)
    }).pipe(Layer.unwrap)

  it.effect("deleting a project cascades to all related records", () =>
    Effect.gen(function*() {
      const projectsRepo = yield* ProjectsRepository
      const db = yield* MongoDatabase

      const userId = `user-${Date.now()}`

      // Create a project
      const project = yield* projectsRepo.create(userId, {
        name: "Test Project",
        description: "Project to be deleted"
      })

      // Manually insert related records into MongoDB to test cascade deletion
      yield* Effect.promise(() =>
        db.collection("services").insertMany([
          {
            projectId: project.id,
            slug: "service-1",
            name: "Service 1",
            archived: false,
            createdAt: new Date()
          },
          {
            projectId: project.id,
            slug: "service-2",
            name: "Service 2",
            archived: false,
            createdAt: new Date()
          }
        ])
      )

      yield* Effect.promise(() =>
        db.collection("deployments").insertMany([
          {
            projectId: project.id,
            deploymentHash: "hash1",
            environmentId: "env-1",
            serviceId: "service-1",
            version: "1.0.0",
            commitSha: "abc123",
            deployedAt: new Date(),
            status: "successful" as const,
            statusHistory: []
          },
          {
            projectId: project.id,
            deploymentHash: "hash2",
            environmentId: "env-2",
            serviceId: "service-2",
            version: "2.0.0",
            commitSha: "def456",
            deployedAt: new Date(),
            status: "successful" as const,
            statusHistory: []
          }
        ])
      )

      yield* Effect.promise(() =>
        db.collection("api_keys").insertMany([
          {
            projectId: project.id,
            userId,
            keyHash: "hash1",
            keyPrefix: "dtap_",
            name: "API Key 1",
            scopes: ["admin"],
            createdAt: new Date()
          },
          {
            projectId: project.id,
            userId,
            keyHash: "hash2",
            keyPrefix: "dtap_",
            name: "API Key 2",
            scopes: ["admin"],
            createdAt: new Date()
          }
        ])
      )

      // Verify all records exist before deletion
      const servicesBefore = yield* Effect.promise(() =>
        db.collection("services").countDocuments({ projectId: project.id })
      )
      expect(servicesBefore).toBe(2)

      const deploymentsBefore = yield* Effect.promise(() =>
        db.collection("deployments").countDocuments({ projectId: project.id })
      )
      expect(deploymentsBefore).toBe(2)

      const apiKeysBefore = yield* Effect.promise(() =>
        db.collection("api_keys").countDocuments({ projectId: project.id })
      )
      expect(apiKeysBefore).toBe(2)

      // Delete the project (should cascade to all related records)
      yield* projectsRepo.delete(project.id)

      // Verify the project no longer exists
      const projectResult = yield* Effect.exit(projectsRepo.findById(project.id))
      expect(projectResult._tag).toBe("Failure")

      // Verify all related records are deleted
      const servicesAfter = yield* Effect.promise(() =>
        db.collection("services").countDocuments({ projectId: project.id })
      )
      expect(servicesAfter).toBe(0)

      const deploymentsAfter = yield* Effect.promise(() =>
        db.collection("deployments").countDocuments({ projectId: project.id })
      )
      expect(deploymentsAfter).toBe(0)

      const apiKeysAfter = yield* Effect.promise(() =>
        db.collection("api_keys").countDocuments({ projectId: project.id })
      )
      expect(apiKeysAfter).toBe(0)
    }).pipe(Effect.provide(createTestLayers())))

  it.effect("deleting a non-existent project fails with ProjectNotFound", () =>
    Effect.gen(function*() {
      const projectsRepo = yield* ProjectsRepository

      const fakeProjectId = "000000000000000000000000" // Valid ObjectId format but doesn't exist

      // Attempt to delete non-existent project
      const result = yield* Effect.exit(projectsRepo.delete(fakeProjectId))

      expect(result._tag).toBe("Failure")
      if (result._tag === "Failure") {
        expect(Cause.squash(result.cause)).toStrictEqual(
          new ProjectNotFound({ projectId: fakeProjectId, message: `Project with ID ${fakeProjectId} not found` })
        )
      }
    }).pipe(Effect.provide(createTestLayers())))
})
