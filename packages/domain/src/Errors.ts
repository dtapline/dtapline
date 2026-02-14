import { Schema } from "effect"

// Base error for all dtapline errors
export class DtaplineError extends Schema.TaggedError<DtaplineError>()(
  "DtaplineError",
  {
    message: Schema.String
  }
) {}

// Project errors
export class ProjectNotFound extends Schema.TaggedError<ProjectNotFound>()(
  "ProjectNotFound",
  {
    projectId: Schema.String,
    message: Schema.String
  }
) {}

export class ProjectAlreadyExists extends Schema.TaggedError<ProjectAlreadyExists>()(
  "ProjectAlreadyExists",
  {
    name: Schema.String,
    message: Schema.String
  }
) {}

// Environment errors
export class EnvironmentNotFound extends Schema.TaggedError<EnvironmentNotFound>()(
  "EnvironmentNotFound",
  {
    environmentId: Schema.String,
    message: Schema.String
  }
) {}

export class EnvironmentAlreadyExists extends Schema.TaggedError<EnvironmentAlreadyExists>()(
  "EnvironmentAlreadyExists",
  {
    projectId: Schema.String,
    name: Schema.String,
    message: Schema.String
  }
) {}

export class EnvironmentHasDeployments extends Schema.TaggedError<EnvironmentHasDeployments>()(
  "EnvironmentHasDeployments",
  {
    environmentId: Schema.String,
    deploymentCount: Schema.Number,
    message: Schema.String
  }
) {}

// Service errors
export class ServiceNotFound extends Schema.TaggedError<ServiceNotFound>()(
  "ServiceNotFound",
  {
    serviceId: Schema.String,
    message: Schema.String
  }
) {}

export class ServiceAlreadyExists extends Schema.TaggedError<ServiceAlreadyExists>()(
  "ServiceAlreadyExists",
  {
    projectId: Schema.String,
    name: Schema.String,
    message: Schema.String
  }
) {}

export class ServiceHasDeployments extends Schema.TaggedError<ServiceHasDeployments>()(
  "ServiceHasDeployments",
  {
    serviceId: Schema.String,
    deploymentCount: Schema.Number,
    message: Schema.String
  }
) {}

// Deployment errors
export class DeploymentNotFound extends Schema.TaggedError<DeploymentNotFound>()(
  "DeploymentNotFound",
  {
    deploymentId: Schema.String,
    message: Schema.String
  }
) {}

// API Key errors
export class ApiKeyNotFound extends Schema.TaggedError<ApiKeyNotFound>()(
  "ApiKeyNotFound",
  {
    apiKeyId: Schema.String,
    message: Schema.String
  }
) {}

export class UnauthorizedApiKey extends Schema.TaggedError<UnauthorizedApiKey>()(
  "UnauthorizedApiKey",
  {
    message: Schema.String
  }
) {}

export class InvalidApiKey extends Schema.TaggedError<InvalidApiKey>()(
  "InvalidApiKey",
  {
    message: Schema.String
  }
) {}

export class ApiKeyExpired extends Schema.TaggedError<ApiKeyExpired>()(
  "ApiKeyExpired",
  {
    apiKeyId: Schema.String,
    expiresAt: Schema.DateFromSelf,
    message: Schema.String
  }
) {}

// Database errors
export class DatabaseError extends Schema.TaggedError<DatabaseError>()(
  "DatabaseError",
  {
    operation: Schema.String,
    cause: Schema.Unknown,
    message: Schema.String
  }
) {}

// Validation errors
export class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    field: Schema.String,
    message: Schema.String
  }
) {}

// Authorization errors
export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {
    message: Schema.String
  }
) {}

export class Forbidden extends Schema.TaggedError<Forbidden>()(
  "Forbidden",
  {
    resource: Schema.String,
    message: Schema.String
  }
) {}

// Plan limit errors
export class PlanLimitExceeded extends Schema.TaggedError<PlanLimitExceeded>()(
  "PlanLimitExceeded",
  {
    role: Schema.String,
    resource: Schema.String,
    limit: Schema.Number,
    message: Schema.String
  }
) {}
