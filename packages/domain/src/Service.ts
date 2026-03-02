import { Schema } from "effect"
import { ProjectId } from "./Project.js"

// Branded type for Service ID
export class ServiceId extends Schema.String.pipe(Schema.brand("ServiceId")) {}

// Service schema
export class Service extends Schema.Class<Service>("Service")({
  id: ServiceId,
  projectId: ProjectId,
  slug: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50)), // e.g., "api-server"
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)), // e.g., "API Server"
  repositoryUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/))),
  iconUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/))),
  archived: Schema.Boolean,
  createdAt: Schema.Date
}) {}

// Create service input
export class CreateServiceInput extends Schema.Struct({
  slug: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50)),
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  repositoryUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/))),
  iconUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/)))
}) {}

// Update service input
export class UpdateServiceInput extends Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100))),
  repositoryUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/))),
  iconUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/)))
}) {}
