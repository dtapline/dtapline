import type { CreateEnvironmentInput, Environment, UpdateEnvironmentInput } from "@cloud-matrix/domain/Environment"
import { EnvironmentId } from "@cloud-matrix/domain/Environment"
import {
  DatabaseError,
  EnvironmentAlreadyExists,
  EnvironmentHasDeployments,
  EnvironmentNotFound
} from "@cloud-matrix/domain/Errors"
import type { ProjectId } from "@cloud-matrix/domain/Project"
import { Context, Effect, Layer, Schema } from "effect"
import type { ObjectId } from "mongodb"
import { MongoDatabase } from "../MongoDB.js"
import { toObjectId } from "../ObjectIdSchema.js"

/**
 * MongoDB document type for Environment
 */
interface EnvironmentDocument {
  _id: ObjectId
  projectId: string
  name: string
  displayName: string
  color?: string | null
  order: number
  archived: boolean
  createdAt: Date
}

/**
 * Environments Repository interface
 */
export class EnvironmentsRepository extends Context.Tag("EnvironmentsRepository")<
  EnvironmentsRepository,
  {
    readonly create: (
      projectId: string,
      input: typeof CreateEnvironmentInput.Type
    ) => Effect.Effect<Environment, EnvironmentAlreadyExists | DatabaseError>

    readonly findById: (
      environmentId: string
    ) => Effect.Effect<Environment, EnvironmentNotFound | DatabaseError>

    readonly findByProjectId: (
      projectId: string,
      includeArchived?: boolean
    ) => Effect.Effect<ReadonlyArray<Environment>, DatabaseError>

    readonly findByName: (
      projectId: string,
      name: string
    ) => Effect.Effect<Environment | null, DatabaseError>

    readonly getOrCreate: (
      projectId: string,
      name: string,
      displayName?: string
    ) => Effect.Effect<Environment, DatabaseError>

    readonly update: (
      environmentId: string,
      input: typeof UpdateEnvironmentInput.Type
    ) => Effect.Effect<Environment, EnvironmentNotFound | DatabaseError>

    readonly archive: (
      environmentId: string
    ) => Effect.Effect<void, EnvironmentNotFound | DatabaseError>

    readonly hardDelete: (
      environmentId: string
    ) => Effect.Effect<void, EnvironmentNotFound | EnvironmentHasDeployments | DatabaseError>

    readonly exists: (
      projectId: string,
      name: string
    ) => Effect.Effect<boolean, DatabaseError>

    readonly getNextOrder: (
      projectId: string
    ) => Effect.Effect<number, DatabaseError>
  }
>() {}

/**
 * Helper to convert MongoDB document to Environment
 */
const docToEnvironment = (doc: EnvironmentDocument): any => ({
  id: Schema.decodeSync(EnvironmentId)(doc._id.toHexString()),
  projectId: doc.projectId as unknown as ProjectId,
  name: doc.name,
  displayName: doc.displayName,
  color: doc.color ?? undefined,
  order: doc.order,
  archived: doc.archived,
  createdAt: doc.createdAt
})

/**
 * Default colors for auto-created environments (cycle through)
 */
const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899" // pink
]

/**
 * Live implementation of EnvironmentsRepository
 */
export const EnvironmentsRepositoryLive = Layer.effect(
  EnvironmentsRepository,
  Effect.gen(function*() {
    const db = yield* MongoDatabase
    const collection = db.collection<EnvironmentDocument>("environments")

    return {
      create: (projectId, input) =>
        Effect.gen(function*() {
          // Check if environment with same name already exists
          const existsResult = yield* Effect.tryPromise({
            try: () => collection.findOne({ projectId, name: input.name }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to check if environment exists",
                cause: error
              })
          })

          if (existsResult) {
            return yield* Effect.fail(
              new EnvironmentAlreadyExists({
                projectId,
                name: input.name,
                message: `Environment with name "${input.name}" already exists in this project`
              })
            )
          }

          // Get next order if not provided
          const order = input.order ?? (yield* Effect.tryPromise({
            try: async () => {
              const result = await collection
                .find({ projectId })
                .sort({ order: -1 })
                .limit(1)
                .toArray()
              return result.length > 0 ? result[0].order + 1 : 0
            },
            catch: (error) =>
              new DatabaseError({
                operation: "find",
                message: "Failed to get next environment order",
                cause: error
              })
          }))

          const environmentDoc: Omit<EnvironmentDocument, "_id"> = {
            projectId,
            name: input.name,
            displayName: input.displayName,
            color: input.color ?? null,
            order,
            archived: false,
            createdAt: new Date()
          }

          const result = yield* Effect.tryPromise({
            try: () => collection.insertOne(environmentDoc as any),
            catch: (error) =>
              new DatabaseError({
                operation: "insertOne",
                message: "Failed to create environment",
                cause: error
              })
          })

          return docToEnvironment({ _id: result.insertedId, ...environmentDoc })
        }),

      findById: (environmentId) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () => collection.findOne({ _id: toObjectId(environmentId) }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to find environment",
                cause: error
              })
          })

          if (!result) {
            return yield* Effect.fail(
              new EnvironmentNotFound({
                environmentId,
                message: `Environment with ID ${environmentId} not found`
              })
            )
          }

          return docToEnvironment(result)
        }),

      findByProjectId: (projectId, includeArchived = false) =>
        Effect.gen(function*() {
          const filter: any = { projectId }
          if (!includeArchived) {
            filter.archived = false
          }

          const results = yield* Effect.tryPromise({
            try: () => collection.find(filter).sort({ order: 1 }).toArray(),
            catch: (error) =>
              new DatabaseError({
                operation: "find",
                message: "Failed to find environments by project ID",
                cause: error
              })
          })

          return results.map(docToEnvironment)
        }),

      findByName: (projectId, name) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () => collection.findOne({ projectId, name }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to find environment by name",
                cause: error
              })
          })

          return result ? docToEnvironment(result) : null
        }),

      getOrCreate: (projectId, name, displayName) =>
        Effect.gen(function*() {
          // Try to find existing environment
          const existing = yield* Effect.tryPromise({
            try: () => collection.findOne({ projectId, name }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to find environment",
                cause: error
              })
          })

          if (existing) {
            return docToEnvironment(existing)
          }

          // Create new environment with auto-generated values
          const count = yield* Effect.tryPromise({
            try: () => collection.countDocuments({ projectId }),
            catch: (error) =>
              new DatabaseError({
                operation: "countDocuments",
                message: "Failed to count environments",
                cause: error
              })
          })

          const environmentDoc: Omit<EnvironmentDocument, "_id"> = {
            projectId,
            name,
            displayName: displayName ?? name.charAt(0).toUpperCase() + name.slice(1),
            color: DEFAULT_COLORS[count % DEFAULT_COLORS.length],
            order: count,
            archived: false,
            createdAt: new Date()
          }

          const result = yield* Effect.tryPromise({
            try: () => collection.insertOne(environmentDoc as any),
            catch: (error) =>
              new DatabaseError({
                operation: "insertOne",
                message: "Failed to auto-create environment",
                cause: error
              })
          })

          return docToEnvironment({ _id: result.insertedId, ...environmentDoc })
        }),

      update: (environmentId, input) =>
        Effect.gen(function*() {
          const updateFields: Record<string, any> = {}

          if (input.displayName !== undefined) updateFields.displayName = input.displayName
          if (input.color !== undefined) updateFields.color = input.color ?? null
          if (input.order !== undefined) updateFields.order = input.order

          const result = yield* Effect.tryPromise({
            try: () =>
              collection.findOneAndUpdate(
                { _id: toObjectId(environmentId) },
                { $set: updateFields },
                { returnDocument: "after" }
              ),
            catch: (error) =>
              new DatabaseError({
                operation: "findOneAndUpdate",
                message: "Failed to update environment",
                cause: error
              })
          })

          if (!result) {
            return yield* Effect.fail(
              new EnvironmentNotFound({
                environmentId,
                message: `Environment with ID ${environmentId} not found`
              })
            )
          }

          return docToEnvironment(result)
        }),

      archive: (environmentId) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () =>
              collection.findOneAndUpdate(
                { _id: toObjectId(environmentId) },
                { $set: { archived: true } },
                { returnDocument: "after" }
              ),
            catch: (error) =>
              new DatabaseError({
                operation: "findOneAndUpdate",
                message: "Failed to archive environment",
                cause: error
              })
          })

          if (!result) {
            return yield* Effect.fail(
              new EnvironmentNotFound({
                environmentId,
                message: `Environment with ID ${environmentId} not found`
              })
            )
          }
        }),

      hardDelete: (environmentId) =>
        Effect.gen(function*() {
          // Check if environment has any deployments
          const deploymentsCollection = db.collection("deployments")
          const deploymentCount = yield* Effect.tryPromise({
            try: () => deploymentsCollection.countDocuments({ environmentId }),
            catch: (error) =>
              new DatabaseError({
                operation: "countDocuments",
                message: "Failed to count deployments for environment",
                cause: error
              })
          })

          if (deploymentCount > 0) {
            return yield* Effect.fail(
              new EnvironmentHasDeployments({
                environmentId,
                deploymentCount,
                message: `Cannot delete environment with ${deploymentCount} deployment(s). Archive it instead.`
              })
            )
          }

          const result = yield* Effect.tryPromise({
            try: () => collection.deleteOne({ _id: toObjectId(environmentId) }),
            catch: (error) =>
              new DatabaseError({
                operation: "deleteOne",
                message: "Failed to delete environment",
                cause: error
              })
          })

          if (result.deletedCount === 0) {
            return yield* Effect.fail(
              new EnvironmentNotFound({
                environmentId,
                message: `Environment with ID ${environmentId} not found`
              })
            )
          }
        }),

      exists: (projectId, name) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () => collection.findOne({ projectId, name }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to check if environment exists",
                cause: error
              })
          })

          return result !== null
        }),

      getNextOrder: (projectId) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () =>
              collection
                .find({ projectId })
                .sort({ order: -1 })
                .limit(1)
                .toArray(),
            catch: (error) =>
              new DatabaseError({
                operation: "find",
                message: "Failed to get next order",
                cause: error
              })
          })

          return result.length > 0 ? result[0].order + 1 : 0
        })
    }
  })
)
