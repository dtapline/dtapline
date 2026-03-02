import { Schema } from "effect"
import { UserId } from "./User.js"

// Branded type for Environment ID
export class EnvironmentId extends Schema.String.pipe(Schema.brand("EnvironmentId")) {}

// Environment schema - now global per user/tenant instead of per-project
export class Environment extends Schema.Class<Environment>("Environment")({
  id: EnvironmentId,
  userId: UserId, // Changed from projectId to userId for global environments
  slug: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50)), // e.g., "production"
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)), // e.g., "Production"
  color: Schema.optional(Schema.String.pipe(Schema.pattern(/^#[0-9A-Fa-f]{6}$/))), // Hex color
  order: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  archived: Schema.Boolean,
  createdAt: Schema.Date
}) {}

// Create environment input
export class CreateEnvironmentInput extends Schema.Struct({
  slug: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50)),
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  color: Schema.optional(Schema.String.pipe(Schema.pattern(/^#[0-9A-Fa-f]{6}$/))),
  order: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)))
}) {}

// Update environment input
// Note: order is not included - use the dedicated reorder endpoint for atomic ordering
export class UpdateEnvironmentInput extends Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100))),
  color: Schema.optional(Schema.String.pipe(Schema.pattern(/^#[0-9A-Fa-f]{6}$/)))
}) {}
