import type { CreateEnvironmentInput, Environment, UpdateEnvironmentInput } from "@dtapline/domain/Environment"
import { EnvironmentId } from "@dtapline/domain/Environment"
import {
  DatabaseError,
  EnvironmentAlreadyExists,
  EnvironmentHasDeployments,
  EnvironmentNotFound
} from "@dtapline/domain/Errors"
import type { UserId } from "@dtapline/domain/User"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as ServiceMap from "effect/ServiceMap"
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
  slug: string
  name: string
  color?: string | null
  order: number
  archived: boolean
  createdAt: Date
}

/**
 * Environments Repository interface
 * Environments are now managed globally per user/tenant
 */
export class EnvironmentsRepository extends ServiceMap.Service<EnvironmentsRepository, {
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
    slug: string
  ) => Effect.Effect<Environment | null, DatabaseError>

  readonly getOrCreate: (
    userId: string,
    slug: string,
    name?: string
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
    slug: string
  ) => Effect.Effect<boolean, DatabaseError>

  readonly getNextOrder: (
    userId: string
  ) => Effect.Effect<number, DatabaseError>

  readonly reorder: (
    environmentId: string,
    newOrder: number
  ) => Effect.Effect<void, EnvironmentNotFound | DatabaseError>
}>()("EnvironmentsRepository") {}

/**
 * Helper to convert MongoDB document to Environment
 */
const docToEnvironment = (doc: EnvironmentDocument): any => ({
  id: Schema.decodeSync(EnvironmentId)(doc._id.toHexString()),
  userId: doc.userId as unknown as UserId,
  slug: doc.slug,
  name: doc.name,
  color: doc.color ?? undefined,
  order: doc.order,
  archived: doc.archived,
  createdAt: doc.createdAt
})

/**
 * Default colors for auto-created environments (cycle through)
 * Uses the dtap logo gradient colors
 */
const DEFAULT_COLORS = [
  "#22D3EE", // cyan (d)
  "#10B981", // green (t)
  "#F59E0B", // yellow (a)
  "#8B5CF6" // purple (p)
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
          // Check if environment with same slug already exists
          const existsResult = yield* Effect.tryPromise({
            try: () => collection.findOne({ userId, slug: input.slug }),
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
                name: input.slug,
                message: `Environment with slug "${input.slug}" already exists for this user`
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
            slug: input.slug,
            name: input.name,
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

      findByName: (userId, slug) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () => collection.findOne({ userId, slug }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to find environment by slug",
                cause: error
              })
          })

          return result ? docToEnvironment(result) : null
        }),

      getOrCreate: (userId, slug, name) =>
        Effect.gen(function*() {
          // Try to find existing environment
          const existing = yield* Effect.tryPromise({
            try: () => collection.findOne({ userId, slug }),
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
            slug,
            name: name ?? slug.charAt(0).toUpperCase() + slug.slice(1),
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

          if (input.name !== undefined) updateFields.name = input.name
          if (input.color !== undefined) updateFields.color = input.color ?? null

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

      exists: (userId, slug) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () => collection.findOne({ userId, slug }),
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
        }),

      reorder: (environmentId, newOrder) =>
        Effect.gen(function*() {
          // 1. Find the environment being moved
          const env = yield* Effect.tryPromise({
            try: () => collection.findOne({ _id: toObjectId(environmentId) }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to find environment for reorder",
                cause: error
              })
          })

          if (!env) {
            return yield* Effect.fail(
              new EnvironmentNotFound({
                environmentId,
                message: `Environment with ID ${environmentId} not found`
              })
            )
          }

          const oldOrder = env.order
          const userId = env.userId

          // If the order hasn't changed, no-op
          if (oldOrder === newOrder) {
            return
          }

          // 2. Get all environments for this user, sorted by order
          const allEnvs = yield* Effect.tryPromise({
            try: () =>
              collection
                .find({ userId, archived: false })
                .sort({ order: 1 })
                .toArray(),
            catch: (error) =>
              new DatabaseError({
                operation: "find",
                message: "Failed to find all environments",
                cause: error
              })
          })

          // 3. Build update operations for bulk write
          const updates: Array<any> = []

          if (newOrder < oldOrder) {
            // Moving up: shift items down between newOrder and oldOrder
            allEnvs.forEach((e) => {
              if (e.order >= newOrder && e.order < oldOrder) {
                updates.push({
                  updateOne: {
                    filter: { _id: e._id },
                    update: { $set: { order: e.order + 1 } }
                  }
                })
              }
            })
          } else if (newOrder > oldOrder) {
            // Moving down: shift items up between oldOrder and newOrder
            allEnvs.forEach((e) => {
              if (e.order > oldOrder && e.order <= newOrder) {
                updates.push({
                  updateOne: {
                    filter: { _id: e._id },
                    update: { $set: { order: e.order - 1 } }
                  }
                })
              }
            })
          }

          // 4. Update the moved environment
          updates.push({
            updateOne: {
              filter: { _id: env._id },
              update: { $set: { order: newOrder } }
            }
          })

          // 5. Execute all updates atomically
          if (updates.length > 0) {
            yield* Effect.tryPromise({
              try: () => collection.bulkWrite(updates),
              catch: (error) =>
                new DatabaseError({
                  operation: "bulkWrite",
                  message: "Failed to reorder environments",
                  cause: error
                })
            })
          }
        })
    }
  })
)
