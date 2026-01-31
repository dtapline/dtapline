import { DatabaseError } from "@cloud-matrix/domain/Errors"
import type { ProjectId } from "@cloud-matrix/domain/Project"
import type { UpdateVersionPatternInput, VersionPattern } from "@cloud-matrix/domain/VersionPattern"
import { VersionPatternId } from "@cloud-matrix/domain/VersionPattern"
import { Context, Effect, Layer, Schema } from "effect"
import { ObjectId } from "mongodb"
import { MongoDatabase } from "../MongoDB.js"

/**
 * MongoDB document type for VersionPattern
 */
interface VersionPatternDocument {
  _id: ObjectId
  projectId: string
  defaultPattern: string
  servicePatterns?: Record<string, string> | null
  updatedAt: Date
}

/**
 * Default version pattern (matches semver with optional 'v' prefix)
 */
const DEFAULT_VERSION_PATTERN = "v?(\\d+\\.\\d+\\.\\d+)"

/**
 * Version Patterns Repository interface
 */
export class VersionPatternsRepository extends Context.Tag("VersionPatternsRepository")<
  VersionPatternsRepository,
  {
    readonly getOrCreate: (
      projectId: string
    ) => Effect.Effect<VersionPattern, DatabaseError>

    readonly update: (
      projectId: string,
      input: typeof UpdateVersionPatternInput.Type
    ) => Effect.Effect<VersionPattern, DatabaseError>

    readonly getPatternForService: (
      projectId: string,
      serviceName: string
    ) => Effect.Effect<string, DatabaseError>

    readonly delete: (
      projectId: string
    ) => Effect.Effect<void, DatabaseError>
  }
>() {}

/**
 * Helper to convert MongoDB document to VersionPattern
 */
const docToVersionPattern = (doc: VersionPatternDocument): any => ({
  id: Schema.decodeSync(VersionPatternId)(doc._id.toHexString()),
  projectId: doc.projectId as unknown as ProjectId,
  defaultPattern: doc.defaultPattern,
  servicePatterns: doc.servicePatterns ?? undefined,
  updatedAt: doc.updatedAt
})

/**
 * Live implementation of VersionPatternsRepository
 */
export const VersionPatternsRepositoryLive = Layer.effect(
  VersionPatternsRepository,
  Effect.gen(function*() {
    const db = yield* MongoDatabase
    const collection = db.collection<VersionPatternDocument>("version_patterns")

    return {
      getOrCreate: (projectId) =>
        Effect.gen(function*() {
          // Try to find existing pattern
          const existing = yield* Effect.tryPromise({
            try: () => collection.findOne({ projectId }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to find version pattern",
                cause: error
              })
          })

          if (existing) {
            return docToVersionPattern(existing)
          }

          // Create default pattern
          const versionPatternDoc: Omit<VersionPatternDocument, "_id"> = {
            projectId,
            defaultPattern: DEFAULT_VERSION_PATTERN,
            servicePatterns: null,
            updatedAt: new Date()
          }

          const result = yield* Effect.tryPromise({
            try: () => collection.insertOne(versionPatternDoc as any),
            catch: (error) =>
              new DatabaseError({
                operation: "insertOne",
                message: "Failed to create default version pattern",
                cause: error
              })
          })

          return docToVersionPattern({ _id: result.insertedId, ...versionPatternDoc })
        }),

      update: (projectId, input) =>
        Effect.gen(function*() {
          const updateFields: Record<string, any> = {
            updatedAt: new Date()
          }

          if (input.defaultPattern !== undefined) {
            updateFields.defaultPattern = input.defaultPattern
          }

          if (input.servicePatterns !== undefined) {
            updateFields.servicePatterns = input.servicePatterns
          }

          // Upsert: update if exists, create if not
          const result = yield* Effect.tryPromise({
            try: () =>
              collection.findOneAndUpdate(
                { projectId },
                { $set: updateFields },
                {
                  returnDocument: "after",
                  upsert: true
                }
              ),
            catch: (error) =>
              new DatabaseError({
                operation: "findOneAndUpdate",
                message: "Failed to update version pattern",
                cause: error
              })
          })

          if (!result) {
            // If upsert created a new document, we need to fetch it
            const created = yield* Effect.tryPromise({
              try: () => collection.findOne({ projectId }),
              catch: (error) =>
                new DatabaseError({
                  operation: "findOne",
                  message: "Failed to find version pattern after upsert",
                  cause: error
                })
            })

            if (!created) {
              return yield* Effect.fail(
                new DatabaseError({
                  operation: "findOne",
                  message: "Version pattern not found after upsert",
                  cause: new Error("Document not found")
                })
              )
            }

            return docToVersionPattern(created)
          }

          return docToVersionPattern(result)
        }),

      getPatternForService: (projectId, serviceName) =>
        Effect.gen(function*() {
          const versionPattern = yield* Effect.tryPromise({
            try: () => collection.findOne({ projectId }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to find version pattern",
                cause: error
              })
          })

          if (!versionPattern) {
            return DEFAULT_VERSION_PATTERN
          }

          // Check if there's a service-specific pattern
          if (
            versionPattern.servicePatterns &&
            versionPattern.servicePatterns[serviceName]
          ) {
            return versionPattern.servicePatterns[serviceName]
          }

          // Fall back to default pattern
          return versionPattern.defaultPattern
        }),

      delete: (projectId) =>
        Effect.gen(function*() {
          yield* Effect.tryPromise({
            try: () => collection.deleteOne({ projectId }),
            catch: (error) =>
              new DatabaseError({
                operation: "deleteOne",
                message: "Failed to delete version pattern",
                cause: error
              })
          })
        })
    }
  })
)
