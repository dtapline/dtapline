import { Schema } from "effect"
import { ProjectId } from "./Project.js"

// Branded type for Service ID
export class ServiceId extends Schema.String.pipe(Schema.brand("ServiceId")) {}

// Service schema
export class Service extends Schema.Class<Service>("Service")({
  id: ServiceId,
  projectId: ProjectId,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50)), // e.g., "api-server"
  displayName: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)), // e.g., "API Server"
  repositoryUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/))),
  archived: Schema.Boolean,
  createdAt: Schema.DateFromSelf
}) {}

// Create service input
export class CreateServiceInput extends Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50)),
  displayName: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  repositoryUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/)))
}) {}

// Update service input
export class UpdateServiceInput extends Schema.Struct({
  displayName: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100))),
  repositoryUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/)))
}) {}
