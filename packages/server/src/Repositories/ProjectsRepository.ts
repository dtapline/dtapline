import { DatabaseError, ProjectAlreadyExists, ProjectNotFound } from "@cloud-matrix/domain/Errors"
import type { CreateProjectInput, Project, UpdateProjectInput } from "@cloud-matrix/domain/Project"
import { ProjectId } from "@cloud-matrix/domain/Project"
import type { UserId } from "@cloud-matrix/domain/User"
import { Context, Effect, Layer, Schema } from "effect"
import type { ObjectId } from "mongodb"
import { MongoDatabase } from "../MongoDB.js"
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
          if (input.description !== undefined) updateFields.description = input.description
          if (input.gitRepoUrl !== undefined) updateFields.gitRepoUrl = input.gitRepoUrl

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
          const result = yield* Effect.tryPromise({
            try: () => collection.deleteOne({ _id: toObjectId(projectId) }),
            catch: (error) =>
              new DatabaseError({
                operation: "deleteOne",
                message: "Failed to delete project",
                cause: error
              })
          })

          if (result.deletedCount === 0) {
            return yield* Effect.fail(
              new ProjectNotFound({
                projectId,
                message: `Project with ID ${projectId} not found`
              })
            )
          }
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
