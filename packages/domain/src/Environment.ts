import * as Schema from "effect/Schema"
import { DateFromString } from "./DateFromString.js"
import { UserId } from "./User.js"

// Branded type for Environment ID
export const EnvironmentId = Schema.String.pipe(Schema.brand("EnvironmentId"))
export type EnvironmentId = Schema.Schema.Type<typeof EnvironmentId>

// Environment schema - now global per user/tenant instead of per-project
export class Environment extends Schema.Class<Environment>("Environment")({
  id: EnvironmentId,
  userId: UserId, // Changed from projectId to userId for global environments
  slug: Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.check(Schema.isMaxLength(50))), // e.g., "production"
  name: Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.check(Schema.isMaxLength(100))), // e.g., "Production"
  color: Schema.optional(Schema.String.pipe(Schema.check(Schema.isPattern(/^#[0-9A-Fa-f]{6}$/)))), // Hex color
  order: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0))),
  archived: Schema.Boolean,
  createdAt: DateFromString
}) {}

// Create environment input
export const CreateEnvironmentInput = Schema.Struct({
  slug: Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.check(Schema.isMaxLength(50))),
  name: Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.check(Schema.isMaxLength(100))),
  color: Schema.optional(Schema.String.pipe(Schema.check(Schema.isPattern(/^#[0-9A-Fa-f]{6}$/)))),
  order: Schema.optional(Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(0))))
})

// Update environment input
// Note: order is not included - use the dedicated reorder endpoint for atomic ordering
export const UpdateEnvironmentInput = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.check(Schema.isMaxLength(100)))),
  color: Schema.optional(Schema.String.pipe(Schema.check(Schema.isPattern(/^#[0-9A-Fa-f]{6}$/))))
})
