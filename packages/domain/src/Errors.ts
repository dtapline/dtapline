import * as Schema from "effect/Schema"
import { DateFromString } from "./DateFromString.js"

// Base error for all dtapline errors
export class DtaplineError extends Schema.TaggedErrorClass<DtaplineError>()(
  "DtaplineError",
  {
    message: Schema.String
  }
) {}

// Project errors
export class ProjectNotFound extends Schema.TaggedErrorClass<ProjectNotFound>()(
  "ProjectNotFound",
  {
    projectId: Schema.String,
    message: Schema.String
  }
) {}

export class ProjectAlreadyExists extends Schema.TaggedErrorClass<ProjectAlreadyExists>()(
  "ProjectAlreadyExists",
  {
    name: Schema.String,
    message: Schema.String
  }
) {}

// Environment errors
export class EnvironmentNotFound extends Schema.TaggedErrorClass<EnvironmentNotFound>()(
  "EnvironmentNotFound",
  {
    environmentId: Schema.String,
    message: Schema.String
  }
) {}

export class EnvironmentAlreadyExists extends Schema.TaggedErrorClass<EnvironmentAlreadyExists>()(
  "EnvironmentAlreadyExists",
  {
    projectId: Schema.String,
    name: Schema.String,
    message: Schema.String
  }
) {}

export class EnvironmentHasDeployments extends Schema.TaggedErrorClass<EnvironmentHasDeployments>()(
  "EnvironmentHasDeployments",
  {
    environmentId: Schema.String,
    deploymentCount: Schema.Number,
    message: Schema.String
  }
) {}

// Service errors
export class ServiceNotFound extends Schema.TaggedErrorClass<ServiceNotFound>()(
  "ServiceNotFound",
  {
    serviceId: Schema.String,
    message: Schema.String
  }
) {}

export class ServiceAlreadyExists extends Schema.TaggedErrorClass<ServiceAlreadyExists>()(
  "ServiceAlreadyExists",
  {
    projectId: Schema.String,
    name: Schema.String,
    message: Schema.String
  }
) {}

export class ServiceHasDeployments extends Schema.TaggedErrorClass<ServiceHasDeployments>()(
  "ServiceHasDeployments",
  {
    serviceId: Schema.String,
    deploymentCount: Schema.Number,
    message: Schema.String
  }
) {}

// Deployment errors
export class DeploymentNotFound extends Schema.TaggedErrorClass<DeploymentNotFound>()(
  "DeploymentNotFound",
  {
    deploymentId: Schema.String,
    message: Schema.String
  }
) {}

// API Key errors
export class ApiKeyNotFound extends Schema.TaggedErrorClass<ApiKeyNotFound>()(
  "ApiKeyNotFound",
  {
    apiKeyId: Schema.String,
    message: Schema.String
  }
) {}

export class UnauthorizedApiKey extends Schema.TaggedErrorClass<UnauthorizedApiKey>()(
  "UnauthorizedApiKey",
  {
    message: Schema.String
  }
) {}

export class InvalidApiKey extends Schema.TaggedErrorClass<InvalidApiKey>()(
  "InvalidApiKey",
  {
    message: Schema.String
  }
) {}

export class ApiKeyExpired extends Schema.TaggedErrorClass<ApiKeyExpired>()(
  "ApiKeyExpired",
  {
    apiKeyId: Schema.String,
    expiresAt: DateFromString,
    message: Schema.String
  }
) {}

// Database errors
export class DatabaseError extends Schema.TaggedErrorClass<DatabaseError>()(
  "DatabaseError",
  {
    operation: Schema.String,
    cause: Schema.Unknown,
    message: Schema.String
  }
) {}

// Validation errors
export class ValidationError extends Schema.TaggedErrorClass<ValidationError>()(
  "ValidationError",
  {
    field: Schema.String,
    message: Schema.String
  }
) {}

// Authorization errors
export class Unauthorized extends Schema.TaggedErrorClass<Unauthorized>()(
  "Unauthorized",
  {
    message: Schema.String
  }
) {}

export class Forbidden extends Schema.TaggedErrorClass<Forbidden>()(
  "Forbidden",
  {
    resource: Schema.String,
    message: Schema.String
  }
) {}

// Plan limit errors
export class PlanLimitExceeded extends Schema.TaggedErrorClass<PlanLimitExceeded>()(
  "PlanLimitExceeded",
  {
    role: Schema.String,
    resource: Schema.String,
    limit: Schema.Number,
    message: Schema.String
  }
) {}
