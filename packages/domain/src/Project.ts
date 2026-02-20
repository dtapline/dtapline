import { Schema, SchemaGetter } from "effect"
import { EnvironmentId } from "./Environment.js"
import { UserId } from "./User.js"

// Branded type for Project ID
export const ProjectId = Schema.String.pipe(Schema.brand("ProjectId"))
export type ProjectId = Schema.Schema.Type<typeof ProjectId>

// Project tier for future monetization
export const ProjectTier = Schema.Literals(["free", "pro", "enterprise"])
export type ProjectTier = Schema.Schema.Type<typeof ProjectTier>

// Project schema
export class Project extends Schema.Class<Project>("Project")({
  id: ProjectId,
  userId: UserId,
  name: Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.check(Schema.isMaxLength(100))),
  description: Schema.optional(Schema.String),
  gitRepoUrl: Schema.optional(Schema.String.pipe(Schema.check(Schema.isPattern(/^https?:\/\/.+/)))),
  selectedEnvironmentIds: Schema.Array(EnvironmentId).pipe(Schema.optional), // Environments enabled for this project
  tier: Schema.optional(ProjectTier).pipe(
    Schema.decodeTo(Schema.toType(ProjectTier), {
      decode: SchemaGetter.withDefault(() => "free" as ProjectTier),
      encode: SchemaGetter.required()
    })
  ),
  createdAt: Schema.Date,
  updatedAt: Schema.Date
}) {}

// Create project input (for API)
export const CreateProjectInput = Schema.Struct({
  name: Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.check(Schema.isMaxLength(100))),
  description: Schema.optional(Schema.String),
  gitRepoUrl: Schema.optional(Schema.String.pipe(Schema.check(Schema.isPattern(/^https?:\/\/.+/))))
})

// Update project input
export const UpdateProjectInput = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.check(Schema.isMinLength(1)), Schema.check(Schema.isMaxLength(100)))),
  description: Schema.optional(Schema.String),
  gitRepoUrl: Schema.optional(Schema.String.pipe(Schema.check(Schema.isPattern(/^https?:\/\/.+/)))),
  selectedEnvironmentIds: Schema.optional(Schema.Array(EnvironmentId))
})
