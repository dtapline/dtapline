import type { ApiKey, ApiKeyScope, CreateApiKeyInput } from "@dtapline/domain/ApiKey"
import { ApiKeyId } from "@dtapline/domain/ApiKey"
import * as Errors from "@dtapline/domain/Errors"
import type { ProjectId } from "@dtapline/domain/Project"
import type { UserId } from "@dtapline/domain/User"
import * as bcrypt from "bcryptjs"
import { Effect, Layer, Schema, ServiceMap } from "effect"
import type { ObjectId } from "mongodb"
import { MongoDatabase } from "../MongoDB.js"
import { toObjectId } from "../ObjectIdSchema.js"

/**
 * MongoDB document type for ApiKey
 */
interface ApiKeyDocument {
  _id: ObjectId
  projectId: string
  userId: string
  keyHash: string
  keyPrefix: string
  name: string
  scopes: Array<ApiKeyScope>
  createdAt: Date
  lastUsedAt?: Date | null
  expiresAt?: Date | null
}

/**
 * API Key with the plain text key (only returned on creation)
 */
export interface ApiKeyWithSecret extends ApiKey {
  plainKey: string
}

/**
 * API Keys Repository interface
 */
export class ApiKeysRepository extends ServiceMap.Service<ApiKeysRepository, {
  readonly generate: (
    projectId: string,
    userId: string,
    input: typeof CreateApiKeyInput.Type
  ) => Effect.Effect<ApiKeyWithSecret, Errors.DatabaseError>

  readonly findById: (
    apiKeyId: string
  ) => Effect.Effect<ApiKey, Errors.ApiKeyNotFound | Errors.DatabaseError>

  readonly findByProjectId: (
    projectId: string
  ) => Effect.Effect<ReadonlyArray<ApiKey>, Errors.DatabaseError>

  readonly validate: (
    plainKey: string
  ) => Effect.Effect<ApiKey, Errors.InvalidApiKey | Errors.ApiKeyExpired | Errors.DatabaseError>

  readonly updateLastUsed: (
    apiKeyId: string
  ) => Effect.Effect<void, Errors.DatabaseError>

  readonly revoke: (
    apiKeyId: string
  ) => Effect.Effect<void, Errors.ApiKeyNotFound | Errors.DatabaseError>
}>()("ApiKeysRepository") {}

/**
 * Helper to convert MongoDB document to ApiKey
 */
const docToApiKey = (doc: ApiKeyDocument): any => ({
  id: Schema.decodeSync(ApiKeyId)(doc._id.toHexString()),
  projectId: doc.projectId as unknown as ProjectId,
  userId: doc.userId as unknown as UserId,
  keyHash: doc.keyHash,
  keyPrefix: doc.keyPrefix,
  name: doc.name,
  scopes: doc.scopes,
  createdAt: doc.createdAt,
  lastUsedAt: doc.lastUsedAt ?? undefined,
  expiresAt: doc.expiresAt ?? undefined
})

/**
 * Generate a secure random API key
 * Format: cm_<32-character-base62-string>
 */
const generateApiKey = (): string => {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
  const randomBytes = crypto.getRandomValues(new Uint8Array(32))
  const key = Array.from(randomBytes)
    .map((byte) => chars[byte % chars.length])
    .join("")
  return `cm_${key}`
}

/**
 * Extract prefix from API key (first 8 characters)
 */
const extractPrefix = (key: string): string => {
  return key.substring(0, 8)
}

/**
 * Live implementation of ApiKeysRepository
 */
export const ApiKeysRepositoryLive = Layer.effect(
  ApiKeysRepository,
  Effect.gen(function*() {
    const db = yield* MongoDatabase
    const collection = db.collection<ApiKeyDocument>("api_keys")

    return {
      generate: (projectId, userId, input) =>
        Effect.gen(function*() {
          const plainKey = generateApiKey()
          const keyPrefix = extractPrefix(plainKey)

          // Hash the key using bcrypt
          const keyHash = yield* Effect.tryPromise({
            try: () => bcrypt.hash(plainKey, 10),
            catch: (error) =>
              new Errors.DatabaseError({
                operation: "bcrypt.hash",
                message: "Failed to hash API key",
                cause: error
              })
          })

          const apiKeyDoc: Omit<ApiKeyDocument, "_id"> = {
            projectId,
            userId,
            keyHash,
            keyPrefix,
            name: input.name,
            scopes: (input.scopes ?? ["deployments:write"]) as Array<ApiKeyScope>,
            createdAt: new Date(),
            lastUsedAt: null,
            expiresAt: null
          }

          const result = yield* Effect.tryPromise({
            try: () => collection.insertOne(apiKeyDoc as any),
            catch: (error) =>
              new Errors.DatabaseError({
                operation: "insertOne",
                message: "Failed to create API key",
                cause: error
              })
          })

          const apiKey = docToApiKey({ _id: result.insertedId, ...apiKeyDoc })
          return { ...apiKey, plainKey }
        }),

      findById: (apiKeyId) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () => collection.findOne({ _id: toObjectId(apiKeyId) }),
            catch: (error) =>
              new Errors.DatabaseError({
                operation: "findOne",
                message: "Failed to find API key",
                cause: error
              })
          })

          if (!result) {
            return yield* Effect.fail(
              new Errors.ApiKeyNotFound({
                apiKeyId,
                message: `API key with ID ${apiKeyId} not found`
              })
            )
          }

          return docToApiKey(result)
        }),

      findByProjectId: (projectId) =>
        Effect.gen(function*() {
          const results = yield* Effect.tryPromise({
            try: () => collection.find({ projectId }).sort({ createdAt: -1 }).toArray(),
            catch: (error) =>
              new Errors.DatabaseError({
                operation: "find",
                message: "Failed to find API keys by project ID",
                cause: error
              })
          })

          return results.map(docToApiKey)
        }),

      validate: (plainKey) =>
        Effect.gen(function*() {
          const keyPrefix = extractPrefix(plainKey)

          // Find all API keys with matching prefix
          const candidates = yield* Effect.tryPromise({
            try: () => collection.find({ keyPrefix }).toArray(),
            catch: (error) =>
              new Errors.DatabaseError({
                operation: "find",
                message: "Failed to find API keys by prefix",
                cause: error
              })
          })

          // Try to match against each candidate
          for (const candidate of candidates) {
            const isMatch = yield* Effect.tryPromise({
              try: () => bcrypt.compare(plainKey, candidate.keyHash),
              catch: (error) =>
                new Errors.DatabaseError({
                  operation: "bcrypt.compare",
                  message: "Failed to compare API key hash",
                  cause: error
                })
            })

            if (isMatch) {
              // Check if key is expired
              if (candidate.expiresAt && candidate.expiresAt < new Date()) {
                return yield* Effect.fail(
                  new Errors.ApiKeyExpired({
                    apiKeyId: candidate._id.toHexString(),
                    expiresAt: candidate.expiresAt,
                    message: "API key has expired"
                  })
                )
              }

              return docToApiKey(candidate)
            }
          }

          // No match found
          return yield* Effect.fail(
            new Errors.InvalidApiKey({
              message: "Invalid API key"
            })
          )
        }),

      updateLastUsed: (apiKeyId) =>
        Effect.gen(function*() {
          yield* Effect.tryPromise({
            try: () =>
              collection.updateOne(
                { _id: toObjectId(apiKeyId) },
                { $set: { lastUsedAt: new Date() } }
              ),
            catch: (error) =>
              new Errors.DatabaseError({
                operation: "updateOne",
                message: "Failed to update API key last used timestamp",
                cause: error
              })
          })
        }),

      revoke: (apiKeyId) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () => collection.deleteOne({ _id: toObjectId(apiKeyId) }),
            catch: (error) =>
              new Errors.DatabaseError({
                operation: "deleteOne",
                message: "Failed to revoke API key",
                cause: error
              })
          })

          if (result.deletedCount === 0) {
            return yield* Effect.fail(
              new Errors.ApiKeyNotFound({
                apiKeyId,
                message: `API key with ID ${apiKeyId} not found`
              })
            )
          }
        })
    }
  })
)
