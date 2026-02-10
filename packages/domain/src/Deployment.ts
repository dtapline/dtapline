import { Schema } from "effect"
import { EnvironmentId } from "./Environment.js"
import { ProjectId } from "./Project.js"
import { ServiceId } from "./Service.js"

// Branded type for Deployment ID
export class DeploymentId extends Schema.String.pipe(Schema.brand("DeploymentId")) {}

// Deployment status
export const DeploymentStatus = Schema.Literal("success", "failed", "in_progress", "rolled_back")
export type DeploymentStatus = Schema.Schema.Type<typeof DeploymentStatus>

// Status history entry
export const DeploymentStatusHistoryEntry = Schema.Struct({
  status: DeploymentStatus,
  timestamp: Schema.DateFromSelf,
  cicdBuildId: Schema.optional(Schema.String),
  cicdBuildUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/)))
})
export type DeploymentStatusHistoryEntry = Schema.Schema.Type<typeof DeploymentStatusHistoryEntry>

// Deployment schema
export class Deployment extends Schema.Class<Deployment>("Deployment")({
  id: DeploymentId,
  deploymentHash: Schema.String, // Deterministic hash for upsert identity
  projectId: ProjectId,
  environmentId: EnvironmentId,
  serviceId: ServiceId,

  // Version information
  version: Schema.String, // Extracted version or commitSha
  commitSha: Schema.String,
  gitTag: Schema.optional(Schema.String),
  pullRequestUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/))),

  // Metadata
  deployedBy: Schema.optional(Schema.String),
  deployedAt: Schema.DateFromSelf,
  status: DeploymentStatus,

  // Status history - tracks all status changes and retries
  statusHistory: Schema.Array(DeploymentStatusHistoryEntry),

  // Optional rich data
  buildUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/))),
  releaseNotes: Schema.optional(Schema.String),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),

  // CI/CD platform information
  cicdPlatform: Schema.optional(Schema.String),
  cicdBuildUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/))),
  cicdBuildId: Schema.optional(Schema.String)
}) {}

// Create deployment input (webhook payload)
export class CreateDeploymentInput extends Schema.Struct({
  environment: Schema.String.pipe(Schema.minLength(1)),
  service: Schema.String.pipe(Schema.minLength(1)),

  // Version info
  gitTag: Schema.optional(Schema.String),
  commitSha: Schema.String,
  pullRequestUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/))),

  // Optional metadata
  deployedBy: Schema.optional(Schema.String),
  status: Schema.optionalWith(DeploymentStatus, { default: () => "success" as const }),
  buildUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/))),
  releaseNotes: Schema.optional(Schema.String),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),

  // CI/CD platform information
  cicdPlatform: Schema.optional(Schema.String),
  cicdBuildUrl: Schema.optional(Schema.String.pipe(Schema.pattern(/^https?:\/\/.+/))),
  cicdBuildId: Schema.optional(Schema.String)
}) {}

// Query filters for deployment history
export class DeploymentFilters extends Schema.Struct({
  environmentId: Schema.optional(Schema.String),
  serviceId: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String), // Changed from DeploymentStatus to accept string in URL
  from: Schema.optional(Schema.String), // ISO date string
  to: Schema.optional(Schema.String), // ISO date string
  limit: Schema.optionalWith(
    Schema.NumberFromString.pipe(Schema.int(), Schema.greaterThan(0), Schema.lessThanOrEqualTo(500)),
    { default: () => 50 }
  ),
  offset: Schema.optionalWith(Schema.NumberFromString.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0)), {
    default: () => 0
  })
}) {}
