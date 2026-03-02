import * as Schema from "effect/Schema"
import { DateFromString } from "./DateFromString.js"
import { ProjectId } from "./Project.js"

// Branded type for Service ID
export const ServiceId = Schema.String.pipe(Schema.brand("ServiceId"))
export type ServiceId = Schema.Schema.Type<typeof ServiceId>

// Service schema
export class Service extends Schema.Class<Service>("Service")({
  id: ServiceId,
  projectId: ProjectId,
  slug: Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.check(Schema.isMaxLength(50))), // e.g., "api-server"
  name: Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.check(Schema.isMaxLength(100))), // e.g., "API Server"
  repositoryUrl: Schema.optional(Schema.String.check(Schema.isPattern(/^https?:\/\/.+/))),
  iconUrl: Schema.optional(Schema.String.check(Schema.isPattern(/^https?:\/\/.+/))),
  archived: Schema.Boolean,
  createdAt: DateFromString
}) {}

// Create service input
export const CreateServiceInput = Schema.Struct({
  slug: Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.check(Schema.isMaxLength(50))),
  name: Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.check(Schema.isMaxLength(100))),
  repositoryUrl: Schema.optional(Schema.String.check(Schema.isPattern(/^https?:\/\/.+/))),
  iconUrl: Schema.optional(Schema.String.check(Schema.isPattern(/^https?:\/\/.+/)))
})

// Update service input
export const UpdateServiceInput = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.check(Schema.isMaxLength(100)))),
  repositoryUrl: Schema.optional(Schema.String.check(Schema.isPattern(/^https?:\/\/.+/))),
  iconUrl: Schema.optional(Schema.String.check(Schema.isPattern(/^https?:\/\/.+/)))
})
