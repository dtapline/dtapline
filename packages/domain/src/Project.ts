import { Schema } from "effect"
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
  tier: Schema.optionalWith(ProjectTier, { default: () => "free" as const }),
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf
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
  gitRepoUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/)))
}) {}
