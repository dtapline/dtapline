import type {
  CreateDeploymentInput,
  Deployment,
  DeploymentFilters,
  DeploymentStatus
} from "@dtapline/domain/Deployment"
import { DeploymentId } from "@dtapline/domain/Deployment"
import type { EnvironmentId } from "@dtapline/domain/Environment"
import { DatabaseError, DeploymentNotFound } from "@dtapline/domain/Errors"
import type { ProjectId } from "@dtapline/domain/Project"
import type { ServiceId } from "@dtapline/domain/Service"
import { Context, Effect, Layer, Schema } from "effect"
import type { ObjectId } from "mongodb"
import { MongoDatabase } from "../MongoDB.js"
import { toObjectId } from "../ObjectIdSchema.js"

/**
 * MongoDB document type for Deployment
 */
interface DeploymentDocument {
  _id: ObjectId
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
  buildUrl?: string | null
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
export class DeploymentsRepository extends Context.Tag("DeploymentsRepository")<
  DeploymentsRepository,
  {
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
  }
>() {}

/**
 * Helper to convert MongoDB document to Deployment
 */
const docToDeployment = (doc: DeploymentDocument): any => ({
  id: Schema.decodeSync(DeploymentId)(doc._id.toHexString()),
  projectId: doc.projectId as unknown as ProjectId,
  environmentId: doc.environmentId as unknown as EnvironmentId,
  serviceId: doc.serviceId as unknown as ServiceId,
  version: doc.version,
  commitSha: doc.commitSha,
  gitTag: doc.gitTag ?? undefined,
  pullRequestUrl: doc.pullRequestUrl ?? undefined,
  deployedBy: doc.deployedBy ?? undefined,
  deployedAt: doc.deployedAt,
  status: doc.status,
  buildUrl: doc.buildUrl ?? undefined,
  releaseNotes: doc.releaseNotes ?? undefined,
  metadata: doc.metadata ?? undefined,
  cicdPlatform: doc.cicdPlatform ?? undefined,
  cicdBuildUrl: doc.cicdBuildUrl ?? undefined,
  cicdBuildId: doc.cicdBuildId ?? undefined
})

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
          const deploymentDoc: Omit<DeploymentDocument, "_id"> = {
            projectId,
            environmentId,
            serviceId,
            version,
            commitSha: input.commitSha,
            gitTag: input.gitTag ?? null,
            pullRequestUrl: input.pullRequestUrl ?? null,
            deployedBy: input.deployedBy ?? null,
            deployedAt: new Date(),
            status: input.status ?? "success",
            buildUrl: input.buildUrl ?? null,
            releaseNotes: input.releaseNotes ?? null,
            metadata: input.metadata ?? null,
            cicdPlatform: input.cicdPlatform ?? null,
            cicdBuildUrl: input.cicdBuildUrl ?? null,
            cicdBuildId: input.cicdBuildId ?? null
          }

          const result = yield* Effect.tryPromise({
            try: () => collection.insertOne(deploymentDoc as any),
            catch: (error) =>
              new DatabaseError({
                operation: "insertOne",
                message: "Failed to create deployment",
                cause: error
              })
          })

          return docToDeployment({ _id: result.insertedId, ...deploymentDoc })
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
