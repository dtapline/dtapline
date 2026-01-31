import { Schema } from "effect"
import { ProjectId } from "./Project.js"

// Branded type for Environment ID
export class EnvironmentId extends Schema.String.pipe(Schema.brand("EnvironmentId")) {}

// Environment schema
export class Environment extends Schema.Class<Environment>("Environment")({
  id: EnvironmentId,
  projectId: ProjectId,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50)), // e.g., "production"
  displayName: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)), // e.g., "Production"
  color: Schema.optional(Schema.String.pipe(Schema.pattern(/^#[0-9A-Fa-f]{6}$/))), // Hex color
  order: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)),
  archived: Schema.Boolean,
  createdAt: Schema.DateFromSelf
}) {}

// Create environment input
export class CreateEnvironmentInput extends Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(50)),
  displayName: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  color: Schema.optional(Schema.String.pipe(Schema.pattern(/^#[0-9A-Fa-f]{6}$/))),
  order: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)))
}) {}

// Update environment input
export class UpdateEnvironmentInput extends Schema.Struct({
  displayName: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100))),
  color: Schema.optional(Schema.String.pipe(Schema.pattern(/^#[0-9A-Fa-f]{6}$/))),
  order: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)))
}) {}
