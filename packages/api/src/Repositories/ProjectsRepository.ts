import { EnvironmentId } from "@dtapline/domain/Environment"
import { DatabaseError, ProjectAlreadyExists, ProjectNotFound } from "@dtapline/domain/Errors"
import type { CreateProjectInput, Project, UpdateProjectInput } from "@dtapline/domain/Project"
import { ProjectId } from "@dtapline/domain/Project"
import type { UserId } from "@dtapline/domain/User"
import { Context, Effect, Layer, Schema } from "effect"
import type { ObjectId } from "mongodb"
import { MongoClientTag, MongoDatabase } from "../MongoDB.js"
import { toObjectId } from "../ObjectIdSchema.js"

/**
 * MongoDB document type for Project (uses native _id)
 */
interface ProjectDocument {
  _id: ObjectId
  userId: string
  name: string
  description?: string | null
  gitRepoUrl?: string | null
  selectedEnvironmentIds?: Array<string> | null // Array of environment IDs enabled for this project
  tier: "free" | "pro" | "enterprise"
  createdAt: Date
  updatedAt: Date
}

/**
 * Projects Repository interface
 */
export class ProjectsRepository extends Context.Tag("ProjectsRepository")<
  ProjectsRepository,
  {
    readonly create: (
      userId: string,
      input: typeof CreateProjectInput.Type
    ) => Effect.Effect<Project, ProjectAlreadyExists | DatabaseError>

    readonly findById: (
      projectId: string
    ) => Effect.Effect<Project, ProjectNotFound | DatabaseError>

    readonly findByUserId: (
      userId: string
    ) => Effect.Effect<ReadonlyArray<Project>, DatabaseError>

    readonly update: (
      projectId: string,
      input: typeof UpdateProjectInput.Type
    ) => Effect.Effect<Project, ProjectNotFound | DatabaseError>

    readonly delete: (
      projectId: string
    ) => Effect.Effect<void, ProjectNotFound | DatabaseError>

    readonly exists: (
      userId: string,
      name: string
    ) => Effect.Effect<boolean, DatabaseError>
  }
>() {}

/**
 * Helper to convert MongoDB document to Project
 */
const docToProject = (doc: ProjectDocument): any => ({
  id: Schema.decodeSync(ProjectId)(doc._id.toHexString()),
  userId: doc.userId as unknown as UserId,
  name: doc.name,
  description: doc.description ?? undefined,
  gitRepoUrl: doc.gitRepoUrl ?? undefined,
  selectedEnvironmentIds: doc.selectedEnvironmentIds
    ? doc.selectedEnvironmentIds.map((id) => Schema.decodeSync(EnvironmentId)(id))
    : undefined,
  tier: doc.tier,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
})

/**
 * Live implementation of ProjectsRepository
 */
export const ProjectsRepositoryLive = Layer.effect(
  ProjectsRepository,
  Effect.gen(function*() {
    const db = yield* MongoDatabase
    const client = yield* MongoClientTag
    const collection = db.collection<ProjectDocument>("projects")

    return {
      create: (userId, input) =>
        Effect.gen(function*() {
          // Check if project with same name already exists for this user
          const existsResult = yield* Effect.tryPromise({
            try: () => collection.findOne({ userId, name: input.name }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to check if project exists",
                cause: error
              })
          })

          if (existsResult) {
            return yield* Effect.fail(
              new ProjectAlreadyExists({
                name: input.name,
                message: `Project with name "${input.name}" already exists`
              })
            )
          }

          const now = new Date()
          const projectDoc: Omit<ProjectDocument, "_id"> = {
            userId,
            name: input.name,
            description: input.description ?? null,
            gitRepoUrl: input.gitRepoUrl ?? null,
            selectedEnvironmentIds: null, // Initially no environments selected
            tier: "free" as const,
            createdAt: now,
            updatedAt: now
          }

          const result = yield* Effect.tryPromise({
            try: () => collection.insertOne(projectDoc as any),
            catch: (error) =>
              new DatabaseError({
                operation: "insertOne",
                message: "Failed to create project",
                cause: error
              })
          })

          return docToProject({ _id: result.insertedId, ...projectDoc })
        }),

      findById: (projectId) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () => collection.findOne({ _id: toObjectId(projectId) }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to find project",
                cause: error
              })
          })

          if (!result) {
            return yield* Effect.fail(
              new ProjectNotFound({
                projectId,
                message: `Project with ID ${projectId} not found`
              })
            )
          }

          return docToProject(result)
        }),

      findByUserId: (userId) =>
        Effect.gen(function*() {
          const results = yield* Effect.tryPromise({
            try: () =>
              collection
                .find({ userId })
                .sort({ createdAt: -1 })
                .toArray(),
            catch: (error) =>
              new DatabaseError({
                operation: "find",
                message: "Failed to find projects by user ID",
                cause: error
              })
          })

          return results.map(docToProject)
        }),

      update: (projectId, input) =>
        Effect.gen(function*() {
          const updateFields: Record<string, any> = {
            updatedAt: new Date()
          }

          if (input.name !== undefined) updateFields.name = input.name
          if (input.description !== undefined) updateFields.description = input.description ?? null
          if (input.gitRepoUrl !== undefined) updateFields.gitRepoUrl = input.gitRepoUrl ?? null
          if (input.selectedEnvironmentIds !== undefined) {
            updateFields.selectedEnvironmentIds = input.selectedEnvironmentIds
              ? input.selectedEnvironmentIds.map(String)
              : null
          }

          const result = yield* Effect.tryPromise({
            try: () =>
              collection.findOneAndUpdate(
                { _id: toObjectId(projectId) },
                { $set: updateFields },
                { returnDocument: "after" }
              ),
            catch: (error) =>
              new DatabaseError({
                operation: "findOneAndUpdate",
                message: "Failed to update project",
                cause: error
              })
          })

          if (!result) {
            return yield* Effect.fail(
              new ProjectNotFound({
                projectId,
                message: `Project with ID ${projectId} not found`
              })
            )
          }

          return docToProject(result)
        }),

      delete: (projectId) =>
        Effect.gen(function*() {
          // Acquire MongoDB session with automatic cleanup
          yield* Effect.acquireUseRelease(
            // Acquire: Start a new session
            Effect.sync(() => client.startSession()),
            // Use: Run transaction
            (session) =>
              Effect.tryPromise({
                try: async () => {
                  await session.withTransaction(async () => {
                    // 1. Delete all deployments for this project
                    await db.collection("deployments").deleteMany(
                      { projectId: projectId as string },
                      { session }
                    )

                    // 2. Delete all services for this project
                    await db.collection("services").deleteMany(
                      { projectId: projectId as string },
                      { session }
                    )

                    // 3. Delete all API keys for this project
                    await db.collection("api_keys").deleteMany(
                      { projectId: projectId as string },
                      { session }
                    )

                    // 4. Finally, delete the project itself
                    const result = await collection.deleteOne(
                      { _id: toObjectId(projectId) },
                      { session }
                    )

                    if (result.deletedCount === 0) {
                      throw new Error(`Project with ID ${projectId} not found`)
                    }
                  })
                },
                catch: (error) => {
                  // Check if it's a "not found" error
                  if (error instanceof Error && error.message.includes("not found")) {
                    return new ProjectNotFound({
                      projectId,
                      message: error.message
                    })
                  }
                  return new DatabaseError({
                    operation: "transaction",
                    message: "Failed to delete project and related data",
                    cause: error
                  })
                }
              }),
            // Release: Always end session (even on error/interruption)
            (session) => Effect.promise(() => session.endSession())
          )
        }),

      exists: (userId, name) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () => collection.findOne({ userId, name }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to check if project exists",
                cause: error
              })
          })

          return result !== null
        })
    }
  })
)
