import {
  DatabaseError,
  ServiceAlreadyExists,
  ServiceHasDeployments,
  ServiceNotFound
} from "@cloud-matrix/domain/Errors"
import type { ProjectId } from "@cloud-matrix/domain/Project"
import type { CreateServiceInput, Service, UpdateServiceInput } from "@cloud-matrix/domain/Service"
import { ServiceId } from "@cloud-matrix/domain/Service"
import { Context, Effect, Layer, Schema } from "effect"
import { ObjectId } from "mongodb"
import { MongoDatabase } from "../MongoDB.js"

/**
 * MongoDB document type for Service
 */
interface ServiceDocument {
  _id: ObjectId
  projectId: string
  name: string
  displayName: string
  repositoryUrl?: string | null
  iconUrl?: string | null
  archived: boolean
  createdAt: Date
}

/**
 * Services Repository interface
 */
export class ServicesRepository extends Context.Tag("ServicesRepository")<
  ServicesRepository,
  {
    readonly create: (
      projectId: string,
      input: typeof CreateServiceInput.Type
    ) => Effect.Effect<Service, ServiceAlreadyExists | DatabaseError>

    readonly findById: (
      serviceId: string
    ) => Effect.Effect<Service, ServiceNotFound | DatabaseError>

    readonly findByProjectId: (
      projectId: string,
      includeArchived?: boolean
    ) => Effect.Effect<ReadonlyArray<Service>, DatabaseError>

    readonly findByName: (
      projectId: string,
      name: string
    ) => Effect.Effect<Service | null, DatabaseError>

    readonly getOrCreate: (
      projectId: string,
      name: string,
      displayName?: string,
      repositoryUrl?: string
    ) => Effect.Effect<Service, DatabaseError>

    readonly update: (
      serviceId: string,
      input: typeof UpdateServiceInput.Type
    ) => Effect.Effect<Service, ServiceNotFound | DatabaseError>

    readonly archive: (
      serviceId: string
    ) => Effect.Effect<void, ServiceNotFound | DatabaseError>

    readonly hardDelete: (
      serviceId: string
    ) => Effect.Effect<void, ServiceNotFound | ServiceHasDeployments | DatabaseError>

    readonly exists: (
      projectId: string,
      name: string
    ) => Effect.Effect<boolean, DatabaseError>
  }
>() {}

/**
 * Helper to convert MongoDB document to Service
 */
const docToService = (doc: ServiceDocument): any => ({
  id: Schema.decodeSync(ServiceId)(doc._id.toHexString()),
  projectId: doc.projectId as unknown as ProjectId,
  name: doc.name,
  displayName: doc.displayName,
  repositoryUrl: doc.repositoryUrl ?? undefined,
  iconUrl: doc.iconUrl ?? undefined,
  archived: doc.archived,
  createdAt: doc.createdAt
})

/**
 * Live implementation of ServicesRepository
 */
export const ServicesRepositoryLive = Layer.effect(
  ServicesRepository,
  Effect.gen(function*() {
    const db = yield* MongoDatabase
    const collection = db.collection<ServiceDocument>("services")

    return {
      create: (projectId, input) =>
        Effect.gen(function*() {
          // Check if service with same name already exists
          const existsResult = yield* Effect.tryPromise({
            try: () => collection.findOne({ projectId, name: input.name }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to check if service exists",
                cause: error
              })
          })

          if (existsResult) {
            return yield* Effect.fail(
              new ServiceAlreadyExists({
                projectId,
                name: input.name,
                message: `Service with name "${input.name}" already exists in this project`
              })
            )
          }

          const serviceDoc: Omit<ServiceDocument, "_id"> = {
            projectId,
            name: input.name,
            displayName: input.displayName,
            repositoryUrl: input.repositoryUrl ?? null,
            iconUrl: input.iconUrl ?? null,
            archived: false,
            createdAt: new Date()
          }

          const result = yield* Effect.tryPromise({
            try: () => collection.insertOne(serviceDoc as any),
            catch: (error) =>
              new DatabaseError({
                operation: "insertOne",
                message: "Failed to create service",
                cause: error
              })
          })

          return docToService({ _id: result.insertedId, ...serviceDoc })
        }),

      findById: (serviceId) =>
        Effect.gen(function*() {
          if (!ObjectId.isValid(serviceId)) {
            return yield* Effect.fail(
              new ServiceNotFound({
                serviceId,
                message: `Invalid service ID format: ${serviceId}`
              })
            )
          }

          const result = yield* Effect.tryPromise({
            try: () => collection.findOne({ _id: new ObjectId(serviceId) }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to find service",
                cause: error
              })
          })

          if (!result) {
            return yield* Effect.fail(
              new ServiceNotFound({
                serviceId,
                message: `Service with ID ${serviceId} not found`
              })
            )
          }

          return docToService(result)
        }),

      findByProjectId: (projectId, includeArchived = false) =>
        Effect.gen(function*() {
          const filter: any = { projectId }
          if (!includeArchived) {
            filter.archived = false
          }

          const results = yield* Effect.tryPromise({
            try: () => collection.find(filter).sort({ name: 1 }).toArray(),
            catch: (error) =>
              new DatabaseError({
                operation: "find",
                message: "Failed to find services by project ID",
                cause: error
              })
          })

          return results.map(docToService)
        }),

      findByName: (projectId, name) =>
        Effect.gen(function*() {
          const result = yield* Effect.tryPromise({
            try: () => collection.findOne({ projectId, name }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to find service by name",
                cause: error
              })
          })

          return result ? docToService(result) : null
        }),

      getOrCreate: (projectId, name, displayName, repositoryUrl) =>
        Effect.gen(function*() {
          // Try to find existing service
          const existing = yield* Effect.tryPromise({
            try: () => collection.findOne({ projectId, name }),
            catch: (error) =>
              new DatabaseError({
                operation: "findOne",
                message: "Failed to find service",
                cause: error
              })
          })

          if (existing) {
            return docToService(existing)
          }

          // Create new service with auto-generated display name if needed
          const serviceDoc: Omit<ServiceDocument, "_id"> = {
            projectId,
            name,
            displayName: displayName ?? name.charAt(0).toUpperCase() + name.slice(1),
            repositoryUrl: repositoryUrl ?? null,
            iconUrl: null,
            archived: false,
            createdAt: new Date()
          }

          const result = yield* Effect.tryPromise({
            try: () => collection.insertOne(serviceDoc as any),
            catch: (error) =>
              new DatabaseError({
                operation: "insertOne",
                message: "Failed to auto-create service",
                cause: error
              })
          })

          return docToService({ _id: result.insertedId, ...serviceDoc })
        }),

      update: (serviceId, input) =>
        Effect.gen(function*() {
          if (!ObjectId.isValid(serviceId)) {
            return yield* Effect.fail(
              new ServiceNotFound({
                serviceId,
                message: `Invalid service ID format: ${serviceId}`
              })
            )
          }

          const updateFields: Record<string, any> = {}

          if (input.displayName !== undefined) updateFields.displayName = input.displayName
          if (input.repositoryUrl !== undefined) updateFields.repositoryUrl = input.repositoryUrl ?? null
          if (input.iconUrl !== undefined) updateFields.iconUrl = input.iconUrl ?? null

          const result = yield* Effect.tryPromise({
            try: () =>
              collection.findOneAndUpdate(
                { _id: new ObjectId(serviceId) },
                { $set: updateFields },
                { returnDocument: "after" }
              ),
            catch: (error) =>
              new DatabaseError({
                operation: "findOneAndUpdate",
                message: "Failed to update service",
                cause: error
              })
          })

          if (!result) {
            return yield* Effect.fail(
              new ServiceNotFound({
                serviceId,
                message: `Service with ID ${serviceId} not found`
              })
            )
          }

          return docToService(result)
        }),

      archive: (serviceId) =>
        Effect.gen(function*() {
          if (!ObjectId.isValid(serviceId)) {
            return yield* Effect.fail(
              new ServiceNotFound({
                serviceId,
                message: `Invalid service ID format: ${serviceId}`
              })
            )
          }

          const result = yield* Effect.tryPromise({
            try: () =>
              collection.findOneAndUpdate(
                { _id: new ObjectId(serviceId) },
                { $set: { archived: true } },
                { returnDocument: "after" }
              ),
            catch: (error) =>
              new DatabaseError({
                operation: "findOneAndUpdate",
                message: "Failed to archive service",
                cause: error
              })
          })

          if (!result) {
            return yield* Effect.fail(
              new ServiceNotFound({
                serviceId,
                message: `Service with ID ${serviceId} not found`
              })
            )
          }
        }),

      hardDelete: (serviceId) =>
        Effect.gen(function*() {
          if (!ObjectId.isValid(serviceId)) {
            return yield* Effect.fail(
              new ServiceNotFound({
                serviceId,
                message: `Invalid service ID format: ${serviceId}`
              })
            )
          }

          // Check if service has any deployments
          const deploymentsCollection = db.collection("deployments")
          const deploymentCount = yield* Effect.tryPromise({
            try: () => deploymentsCollection.countDocuments({ serviceId }),
            catch: (error) =>
              new DatabaseError({
                operation: "countDocuments",
                message: "Failed to count deployments for service",
                cause: error
              })
          })

          if (deploymentCount > 0) {
            return yield* Effect.fail(
              new ServiceHasDeployments({
                serviceId,
                deploymentCount,
                message: `Cannot delete service with ${deploymentCount} deployment(s). Archive it instead.`
              })
            )
          }

          const result = yield* Effect.tryPromise({
            try: () => collection.deleteOne({ _id: new ObjectId(serviceId) }),
            catch: (error) =>
              new DatabaseError({
                operation: "deleteOne",
                message: "Failed to delete service",
                cause: error
              })
          })

          if (result.deletedCount === 0) {
            return yield* Effect.fail(
              new ServiceNotFound({
                serviceId,
                message: `Service with ID ${serviceId} not found`
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
                message: "Failed to check if service exists",
                cause: error
              })
          })

          return result !== null
        })
    }
  })
)
