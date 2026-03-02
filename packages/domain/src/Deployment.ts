import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import { DateFromString } from "./DateFromString.js"
import { EnvironmentId } from "./Environment.js"
import { ProjectId } from "./Project.js"
import { ServiceId } from "./Service.js"

// Branded type for Deployment ID
export const DeploymentId = Schema.String.pipe(Schema.brand("DeploymentId"))

// Deployment status
export const DeploymentStatus = Schema.Literals(["success", "failed", "in_progress", "rolled_back"])
export type DeploymentStatus = Schema.Schema.Type<typeof DeploymentStatus>

// Status history entry
export const DeploymentStatusHistoryEntry = Schema.Struct({
  status: DeploymentStatus,
  timestamp: DateFromString,
  cicdBuildId: Schema.optional(Schema.String),
  cicdBuildUrl: Schema.optional(Schema.String.check(Schema.isPattern(/^https?:\/\/.+/)))
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
  pullRequestUrl: Schema.optional(Schema.String.check(Schema.isPattern(/^https?:\/\/.+/))),

  // Metadata
  deployedBy: Schema.optional(Schema.String),
  deployedAt: DateFromString,
  status: DeploymentStatus,

  // Status history - tracks all status changes and retries
  statusHistory: Schema.Array(DeploymentStatusHistoryEntry),

  // Optional rich data
  buildUrl: Schema.optional(Schema.String.check(Schema.isPattern(/^https?:\/\/.+/))),
  diffUrl: Schema.optional(Schema.String.check(Schema.isPattern(/^https?:\/\/.+/))),
  releaseNotes: Schema.optional(Schema.String),
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),

  // CI/CD platform information
  cicdPlatform: Schema.optional(Schema.String),
  cicdBuildUrl: Schema.optional(Schema.String.check(Schema.isPattern(/^https?:\/\/.+/))),
  cicdBuildId: Schema.optional(Schema.String)
}) {}

// Create deployment input (webhook payload)
export const CreateDeploymentInput = Schema.Struct({
  environment: Schema.String.check(Schema.isMinLength(1)),
  service: Schema.String.check(Schema.isMinLength(1)),

  // Version info
  version: Schema.optional(Schema.String), // Explicit semantic version (e.g., "1.2.3")
  gitTag: Schema.optional(Schema.String),
  commitSha: Schema.String,
  pullRequestUrl: Schema.optional(Schema.String.check(Schema.isPattern(/^https?:\/\/.+/))),

  // Optional metadata
  deployedBy: Schema.optional(Schema.String),
  status: Schema.optional(DeploymentStatus).pipe(
    Schema.decodeTo(Schema.toType(DeploymentStatus), {
      decode: SchemaGetter.withDefault(() => "success" as DeploymentStatus),
      encode: SchemaGetter.required()
    })
  ),
  buildUrl: Schema.optional(Schema.String.check(Schema.isPattern(/^https?:\/\/.+/))),
  diffUrl: Schema.optional(Schema.String.check(Schema.isPattern(/^https?:\/\/.+/))),
  releaseNotes: Schema.optional(Schema.String),
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),

  // CI/CD platform information
  cicdPlatform: Schema.optional(Schema.String),
  cicdBuildUrl: Schema.optional(Schema.String.check(Schema.isPattern(/^https?:\/\/.+/))),
  cicdBuildId: Schema.optional(Schema.String)
})

// Query filters for deployment history
export const DeploymentFilters = Schema.Struct({
  environmentId: Schema.optional(Schema.String),
  serviceId: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String), // Changed from DeploymentStatus to accept string in URL
  from: Schema.optional(Schema.String), // ISO date string
  to: Schema.optional(Schema.String), // ISO date string
  limit: Schema.optional(
    Schema.NumberFromString.pipe(
      Schema.check(Schema.isInt()),
      Schema.check(Schema.isGreaterThan(0)),
      Schema.check(Schema.isLessThanOrEqualTo(500))
    )
  ).pipe(
    Schema.decodeTo(
      Schema.toType(Schema.NumberFromString.pipe(
        Schema.check(Schema.isInt()),
        Schema.check(Schema.isGreaterThan(0)),
        Schema.check(Schema.isLessThanOrEqualTo(500))
      )),
      {
        decode: SchemaGetter.withDefault(() => 50),
        encode: SchemaGetter.required()
      }
    )
  ),
  offset: Schema.optional(
    Schema.NumberFromString.pipe(Schema.check(Schema.isInt()), Schema.check(Schema.isGreaterThanOrEqualTo(0)))
  ).pipe(
    Schema.decodeTo(
      Schema.toType(
        Schema.NumberFromString.pipe(Schema.check(Schema.isInt()), Schema.check(Schema.isGreaterThanOrEqualTo(0)))
      ),
      {
        decode: SchemaGetter.withDefault(() => 0),
        encode: SchemaGetter.required()
      }
    )
  )
})
