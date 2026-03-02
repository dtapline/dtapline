import { Schema } from "effect"
import { EnvironmentId } from "./Environment.js"
import { UserId } from "./User.js"

// Branded type for Project ID
export class ProjectId extends Schema.String.pipe(Schema.brand("ProjectId")) {}

// Project tier for future monetization
export const ProjectTier = Schema.Literal("free", "pro", "enterprise")
export type ProjectTier = Schema.Schema.Type<typeof ProjectTier>

// Project schema
export class Project extends Schema.Class<Project>("Project")({
  id: ProjectId,
  userId: UserId,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  description: Schema.optional(Schema.String),
  gitRepoUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/))),
  selectedEnvironmentIds: Schema.Array(EnvironmentId).pipe(Schema.optional), // Environments enabled for this project
  tier: Schema.optionalWith(ProjectTier, { default: () => "free" as const }),
  createdAt: Schema.Date,
  updatedAt: Schema.Date
}) {}

// Create project input (for API)
export class CreateProjectInput extends Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  description: Schema.optional(Schema.String),
  gitRepoUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/)))
}) {}

// Update project input
export class UpdateProjectInput extends Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100))),
  description: Schema.optional(Schema.String),
  gitRepoUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/))),
  selectedEnvironmentIds: Schema.optional(Schema.Array(EnvironmentId))
}) {}
