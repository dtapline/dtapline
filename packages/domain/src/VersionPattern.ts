import { Schema } from "effect"
import { ProjectId } from "./Project.js"

// Branded type for VersionPattern ID
export const VersionPatternId = Schema.String.pipe(Schema.brand("VersionPatternId"))

// Version pattern configuration per project
export class VersionPattern extends Schema.Class<VersionPattern>("VersionPattern")({
  id: VersionPatternId,
  projectId: ProjectId,
  // Default pattern applied to all services
  defaultPattern: Schema.String, // e.g., "v?(\\d+\\.\\d+\\.\\d+)"
  // Per-service pattern overrides
  servicePatterns: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  updatedAt: Schema.Date
}) {}

// Update version pattern input
export const UpdateVersionPatternInput = Schema.Struct({
  defaultPattern: Schema.optional(Schema.String),
  servicePatterns: Schema.optional(Schema.Record(Schema.String, Schema.String))
})

// Test pattern request/response
export const TestPatternRequest = Schema.Struct({
  pattern: Schema.String,
  testTag: Schema.String
})

export const TestPatternResponse = Schema.Struct({
  success: Schema.Boolean,
  extractedVersion: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String)
})
