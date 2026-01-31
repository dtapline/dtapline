import type { CreateEnvironmentInput, Environment, UpdateEnvironmentInput } from "@cloud-matrix/domain/Environment"
import { EnvironmentId } from "@cloud-matrix/domain/Environment"
import {
  DatabaseError,
  EnvironmentAlreadyExists,
  EnvironmentHasDeployments,
  EnvironmentNotFound
} from "@cloud-matrix/domain/Errors"
import type { UserId } from "@cloud-matrix/domain/User"
import { Context, Effect, Layer, Schema } from "effect"
import type { ObjectId } from "mongodb"
import { MongoDatabase } from "../MongoDB.js"
import { toObjectId } from "../ObjectIdSchema.js"

/**
 * MongoDB document type for Environment
 * Environments are now global per user/tenant instead of per-project
 */
interface EnvironmentDocument {
  _id: ObjectId
  userId: string // Changed from projectId to userId
  name: string
  displayName: string
  color?: string | null
  order: number
  archived: boolean
  createdAt: Date
}

/**
 * Environments Repository interface
 * Environments are now managed globally per user/tenant
 */
export class EnvironmentsRepository extends Context.Tag("EnvironmentsRepository")<
  EnvironmentsRepository,
  {
    readonly create: (
      userId: string,
      input: typeof CreateEnvironmentInput.Type
    ) => Effect.Effect<Environment, EnvironmentAlreadyExists | DatabaseError>

    readonly findById: (
      environmentId: string
    ) => Effect.Effect<Environment, EnvironmentNotFound | DatabaseError>

    readonly findByUserId: (
      userId: string,
      includeArchived?: boolean
    ) => Effect.Effect<ReadonlyArray<Environment>, DatabaseError>

    readonly findByName: (
      userId: string,
      name: string
    ) => Effect.Effect<Environment | null, DatabaseError>

    readonly getOrCreate: (
      userId: string,
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
      userId: string,
      name: string
    ) => Effect.Effect<boolean, DatabaseError>

    readonly getNextOrder: (
      userId: string
    ) => Effect.Effect<number, DatabaseError>
  }
>() {}

/**
 * Helper to convert MongoDB document to Environment
 */
const docToEnvironment = (doc: EnvironmentDocument): any => ({
  id: Schema.decodeSync(EnvironmentId)(doc._id.toHexString()),
  userId: doc.userId as unknown as UserId,
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
      create: (userId, input) =>
        Effect.gen(function*() {
          // Check if environment with same name already exists
          const existsResult = yield* Effect.tryPromise({
            try: () => collection.findOne({ userId, name: input.name }),
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
                projectId: userId, // TODO: Update EnvironmentAlreadyExists error to use userId
                name: input.name,
                message: `Environment with name "${input.name}" already exists for this user`
              })
            )
          }

          // Get next order if not provided
          const order = input.order ?? (yield* Effect.tryPromise({
            try: async () => {
              const result = await collection
                .find({ userId })
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
            userId,
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

      findByUserId: (userId, includeArchived = false) =>
        Effect.gen(function*() {
          const filter: any = { userId }
          if (!includeArchived) {
            filter.archived = false
          }

          const results = yield* Effect.tryPromise({
            try: () => collection.find(filter).sort({ order: 1 }).toArray(),
            catch: (error) =>
              new DatabaseError({
                operation: "find",
                message: "Failed to find environments by user ID",
                cause: error
              })
          })

          return results.map(docToEnvironment)
        }),

      findByName: (userId, name) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () => collection.findOne({ userId, name }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to find environment by name",
                cause: error
              })
          })

          return result ? docToEnvironment(result) : null
        }),

      getOrCreate: (userId, name, displayName) =>
        Effect.gen(function*() {
          // Try to find existing environment
          const existing = yield* Effect.tryPromise({
            try: () => collection.findOne({ userId, name }),
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
            try: () => collection.countDocuments({ userId }),
            catch: (error) =>
              new DatabaseError({
                operation: "countDocuments",
                message: "Failed to count environments",
                cause: error
              })
          })

          const environmentDoc: Omit<EnvironmentDocument, "_id"> = {
            userId,
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

      exists: (userId, name) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () => collection.findOne({ userId, name }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to check if environment exists",
                cause: error
              })
          })

          return result !== null
        }),

      getNextOrder: (userId) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () =>
              collection
                .find({ userId })
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
