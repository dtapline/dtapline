import { Deployment, DeploymentId } from "@dtapline/domain/Deployment"
import type { CreateDeploymentInput, DeploymentFilters, DeploymentStatus } from "@dtapline/domain/Deployment"
import type { EnvironmentId } from "@dtapline/domain/Environment"
import { DatabaseError, DeploymentNotFound } from "@dtapline/domain/Errors"
import type { ProjectId } from "@dtapline/domain/Project"
import type { ServiceId } from "@dtapline/domain/Service"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as ServiceMap from "effect/ServiceMap"
import type { ObjectId } from "mongodb"
import { createHash } from "node:crypto"
import { MongoDatabase } from "../MongoDB.js"
import { toObjectId } from "../ObjectIdSchema.js"

/**
 * Generate deterministic deployment hash from identifiers
 */
function generateDeploymentHash(
  projectId: string,
  environmentId: string,
  serviceId: string,
  commitSha: string,
  version: string
): string {
  const data = `${projectId}:${environmentId}:${serviceId}:${commitSha}:${version}`
  return createHash("sha256").update(data).digest("hex")
}

/**
 * Status history entry in MongoDB
 */
interface StatusHistoryDocument {
  status: DeploymentStatus
  timestamp: Date
  cicdBuildId?: string | null
  cicdBuildUrl?: string | null
}

/**
 * MongoDB document type for Deployment
 */
interface DeploymentDocument {
  _id: ObjectId
  deploymentHash: string // Deterministic hash for upsert
  projectId: string
  environmentId: string
  serviceId: string
  version: string
  commitSha: string
  gitTag?: string | null
  pullRequestUrl?: string | null
  deployedBy?: string | null
  deployedAt: Date
  status: DeploymentStatus
  statusHistory: Array<StatusHistoryDocument> // Track all status changes
  buildUrl?: string | null
  diffUrl?: string | null
  releaseNotes?: string | null
  metadata?: Record<string, unknown> | null
  cicdPlatform?: string | null
  cicdBuildUrl?: string | null
  cicdBuildId?: string | null
}

/**
 * Current deployment state for matrix view
 */
export interface CurrentDeployment {
  environmentId: string
  serviceId: string
  version: string
  deployedAt: Date
  status: DeploymentStatus
  deployment: Deployment
}

/**
 * Deployments Repository interface
 */
export class DeploymentsRepository extends ServiceMap.Service<DeploymentsRepository, {
  readonly create: (
    projectId: string,
    environmentId: string,
    serviceId: string,
    version: string,
    input: typeof CreateDeploymentInput.Type
  ) => Effect.Effect<Deployment, DatabaseError>

  readonly findById: (
    deploymentId: string
  ) => Effect.Effect<Deployment, DeploymentNotFound | DatabaseError>

  readonly findByFilters: (
    projectId: string,
    filters: typeof DeploymentFilters.Type
  ) => Effect.Effect<ReadonlyArray<Deployment>, DatabaseError>

  readonly getCurrentState: (
    projectId: string
  ) => Effect.Effect<ReadonlyArray<CurrentDeployment>, DatabaseError>

  readonly getLatestForEnvironmentService: (
    environmentId: string,
    serviceId: string
  ) => Effect.Effect<Deployment | null, DatabaseError>

  readonly countByFilters: (
    projectId: string,
    filters: typeof DeploymentFilters.Type
  ) => Effect.Effect<number, DatabaseError>
}>()("DeploymentsRepository") {}

/**
 * Helper to convert MongoDB document to Deployment
 * Handles backward compatibility for old deployments without deploymentHash
 */
const docToDeployment = (doc: DeploymentDocument) => {
  // Lazy migration: generate hash for old deployments
  const deploymentHash = doc.deploymentHash ||
    generateDeploymentHash(doc.projectId, doc.environmentId, doc.serviceId, doc.commitSha, doc.version)

  return new Deployment({
    id: Schema.decodeSync(DeploymentId)(doc._id.toHexString()),
    deploymentHash,
    projectId: doc.projectId as unknown as ProjectId,
    environmentId: doc.environmentId as unknown as EnvironmentId,
    serviceId: doc.serviceId as unknown as ServiceId,
    version: doc.version,
    commitSha: doc.commitSha,
    ...(doc.gitTag != null && { gitTag: doc.gitTag }),
    ...(doc.pullRequestUrl != null && { pullRequestUrl: doc.pullRequestUrl }),
    ...(doc.deployedBy != null && { deployedBy: doc.deployedBy }),
    deployedAt: doc.deployedAt,
    status: doc.status,
    // Backward compatibility: empty array for old deployments
    statusHistory: (doc.statusHistory || []).map((entry) => ({
      status: entry.status,
      timestamp: entry.timestamp,
      ...(entry.cicdBuildId != null && { cicdBuildId: entry.cicdBuildId }),
      ...(entry.cicdBuildUrl != null && { cicdBuildUrl: entry.cicdBuildUrl })
    })),
    ...(doc.buildUrl != null && { buildUrl: doc.buildUrl }),
    ...(doc.diffUrl != null && { diffUrl: doc.diffUrl }),
    ...(doc.releaseNotes != null && { releaseNotes: doc.releaseNotes }),
    ...(doc.metadata != null && { metadata: doc.metadata }),
    ...(doc.cicdPlatform != null && { cicdPlatform: doc.cicdPlatform }),
    ...(doc.cicdBuildUrl != null && { cicdBuildUrl: doc.cicdBuildUrl }),
    ...(doc.cicdBuildId != null && { cicdBuildId: doc.cicdBuildId })
  })
}

/**
 * Live implementation of DeploymentsRepository
 */
export const DeploymentsRepositoryLive = Layer.effect(
  DeploymentsRepository,
  Effect.gen(function*() {
    const db = yield* MongoDatabase
    const collection = db.collection<DeploymentDocument>("deployments")

    return {
      create: (projectId, environmentId, serviceId, version, input) =>
        Effect.gen(function*() {
          // Generate deterministic hash for upsert
          const deploymentHash = generateDeploymentHash(projectId, environmentId, serviceId, input.commitSha, version)

          const now = new Date()
          const statusEntry: StatusHistoryDocument = {
            status: input.status ?? "success",
            timestamp: now,
            cicdBuildId: input.cicdBuildId ?? null,
            cicdBuildUrl: input.cicdBuildUrl ?? null
          }

          // Upsert: update if hash exists, insert if not
          const result = yield* Effect.tryPromise({
            try: () =>
              collection.findOneAndUpdate(
                { deploymentHash },
                {
                  $set: {
                    // Update mutable fields
                    status: input.status ?? "success",
                    deployedAt: now,
                    version,
                    commitSha: input.commitSha,
                    gitTag: input.gitTag ?? null,
                    pullRequestUrl: input.pullRequestUrl ?? null,
                    deployedBy: input.deployedBy ?? null,
                    buildUrl: input.buildUrl ?? null,
                    diffUrl: input.diffUrl ?? null,
                    releaseNotes: input.releaseNotes ?? null,
                    metadata: input.metadata ?? null,
                    cicdPlatform: input.cicdPlatform ?? null,
                    cicdBuildUrl: input.cicdBuildUrl ?? null,
                    cicdBuildId: input.cicdBuildId ?? null
                  },
                  $push: {
                    // Append to status history
                    statusHistory: statusEntry
                  },
                  $setOnInsert: {
                    // Only set on first insert
                    deploymentHash,
                    projectId,
                    environmentId,
                    serviceId
                  }
                },
                {
                  upsert: true,
                  returnDocument: "after"
                }
              ),
            catch: (error) =>
              new DatabaseError({
                operation: "findOneAndUpdate",
                message: "Failed to create/update deployment",
                cause: error
              })
          })

          if (!result) {
            return yield* Effect.fail(
              new DatabaseError({
                operation: "findOneAndUpdate",
                message: "Upsert operation returned null",
                cause: new Error("Result was null")
              })
            )
          }

          return docToDeployment(result)
        }),

      findById: (deploymentId) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () => collection.findOne({ _id: toObjectId(deploymentId) }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to find deployment",
                cause: error
              })
          })

          if (!result) {
            return yield* Effect.fail(
              new DeploymentNotFound({
                deploymentId,
                message: `Deployment with ID ${deploymentId} not found`
              })
            )
          }

          return docToDeployment(result)
        }),

      findByFilters: (projectId, filters) =>
        Effect.gen(function*() {
          const query: any = { projectId }

          if (filters.environmentId) {
            query.environmentId = filters.environmentId
          }

          if (filters.serviceId) {
            query.serviceId = filters.serviceId
          }

          if (filters.status) {
            query.status = filters.status
          }

          if (filters.from || filters.to) {
            query.deployedAt = {}
            if (filters.from) {
              query.deployedAt.$gte = new Date(filters.from)
            }
            if (filters.to) {
              query.deployedAt.$lte = new Date(filters.to)
            }
          }

          const results = yield* Effect.tryPromise({
            try: () =>
              collection
                .find(query)
                .sort({ deployedAt: -1 })
                .skip(filters.offset ?? 0)
                .limit(filters.limit ?? 50)
                .toArray(),
            catch: (error) =>
              new DatabaseError({
                operation: "find",
                message: "Failed to find deployments by filters",
                cause: error
              })
          })

          return results.map(docToDeployment)
        }),

      getCurrentState: (projectId) =>
        Effect.gen(function*() {
          // Aggregate to get the latest deployment for each environment-service pair
          const results = yield* Effect.tryPromise({
            try: () =>
              collection
                .aggregate<DeploymentDocument>([
                  { $match: { projectId } },
                  { $sort: { deployedAt: -1 } },
                  {
                    $group: {
                      _id: {
                        environmentId: "$environmentId",
                        serviceId: "$serviceId"
                      },
                      latestDoc: { $first: "$$ROOT" }
                    }
                  },
                  { $replaceRoot: { newRoot: "$latestDoc" } }
                ])
                .toArray(),
            catch: (error) =>
              new DatabaseError({
                operation: "aggregate",
                message: "Failed to get current deployment state",
                cause: error
              })
          })

          return results.map((doc) => ({
            environmentId: doc.environmentId,
            serviceId: doc.serviceId,
            version: doc.version,
            deployedAt: doc.deployedAt,
            status: doc.status,
            deployment: docToDeployment(doc)
          }))
        }),

      getLatestForEnvironmentService: (environmentId, serviceId) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () =>
              collection
                .find({ environmentId, serviceId })
                .sort({ deployedAt: -1 })
                .limit(1)
                .toArray(),
            catch: (error) =>
              new DatabaseError({
                operation: "find",
                message: "Failed to get latest deployment for environment-service",
                cause: error
              })
          })

          return result.length > 0 ? docToDeployment(result[0]) : null
        }),

      countByFilters: (projectId, filters) =>
        Effect.gen(function*() {
          const query: any = { projectId }

          if (filters.environmentId) {
            query.environmentId = filters.environmentId
          }

          if (filters.serviceId) {
            query.serviceId = filters.serviceId
          }

          if (filters.status) {
            query.status = filters.status
          }

          if (filters.from || filters.to) {
            query.deployedAt = {}
            if (filters.from) {
              query.deployedAt.$gte = new Date(filters.from)
            }
            if (filters.to) {
              query.deployedAt.$lte = new Date(filters.to)
            }
          }

          return yield* Effect.tryPromise({
            try: () => collection.countDocuments(query),
            catch: (error) =>
              new DatabaseError({
                operation: "countDocuments",
                message: "Failed to count deployments",
                cause: error
              })
          })
        })
    }
  })
)
