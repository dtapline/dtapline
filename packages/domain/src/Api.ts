import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema } from "effect"
import { ApiKeyResponse, CreateApiKeyInput } from "./ApiKey.js"
import { CreateDeploymentInput, Deployment, DeploymentFilters, DeploymentId } from "./Deployment.js"
import { CreateEnvironmentInput, Environment, EnvironmentId, UpdateEnvironmentInput } from "./Environment.js"
import * as Errors from "./Errors.js"
import { CreateProjectInput, Project, ProjectId, UpdateProjectInput } from "./Project.js"
import { CreateServiceInput, Service, ServiceId, UpdateServiceInput } from "./Service.js"
import { User } from "./User.js"
import { TestPatternRequest, TestPatternResponse, UpdateVersionPatternInput, VersionPattern } from "./VersionPattern.js"

// Convert branded types to string for path params
const ProjectIdFromString = Schema.String.pipe(Schema.compose(ProjectId))
const EnvironmentIdFromString = Schema.String.pipe(Schema.compose(EnvironmentId))
const ServiceIdFromString = Schema.String.pipe(Schema.compose(ServiceId))
const DeploymentIdFromString = Schema.String.pipe(Schema.compose(DeploymentId))

// ============================================================================
// Webhook API (Public - requires API key)
// ============================================================================

export class DeploymentsWebhookGroup extends HttpApiGroup.make("deploymentsWebhook")
  .add(
    HttpApiEndpoint.post("createDeployment", "/api/v1/deployments")
      .setPayload(CreateDeploymentInput)
      .addSuccess(
        Schema.Struct({
          id: DeploymentId,
          version: Schema.String,
          message: Schema.String
        })
      )
      .addError(Errors.UnauthorizedApiKey, { status: 401 })
      .addError(Errors.InvalidApiKey, { status: 401 })
      .addError(Errors.ApiKeyExpired, { status: 401 })
      .addError(Errors.ProjectNotFound, { status: 404 })
      .addError(Errors.ValidationError, { status: 400 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
{}

// ============================================================================
// Projects API
// ============================================================================

export class ProjectsGroup extends HttpApiGroup.make("projects")
  .add(
    HttpApiEndpoint.get("listProjects", "/api/v1/projects")
      .addSuccess(
        Schema.Struct({
          projects: Schema.Array(Project)
        })
      )
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.post("createProject", "/api/v1/projects")
      .setPayload(CreateProjectInput)
      .addSuccess(
        Schema.Struct({
          project: Project
        })
      )
      .addError(Errors.ProjectAlreadyExists, { status: 409 })
      .addError(Errors.ValidationError, { status: 400 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.get("getProject", "/api/v1/projects/:projectId")
      .setPath(Schema.Struct({ projectId: ProjectIdFromString }))
      .addSuccess(Project)
      .addError(Errors.ProjectNotFound, { status: 404 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.put("updateProject", "/api/v1/projects/:projectId")
      .setPath(Schema.Struct({ projectId: ProjectIdFromString }))
      .setPayload(UpdateProjectInput)
      .addSuccess(
        Schema.Struct({
          project: Project
        })
      )
      .addError(Errors.ProjectNotFound, { status: 404 })
      .addError(Errors.ValidationError, { status: 400 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.del("deleteProject", "/api/v1/projects/:projectId")
      .setPath(Schema.Struct({ projectId: ProjectIdFromString }))
      .addSuccess(Schema.Void)
      .addError(Errors.ProjectNotFound, { status: 404 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.get("getMatrix", "/api/v1/projects/:projectId/matrix")
      .setPath(Schema.Struct({ projectId: ProjectIdFromString }))
      .addSuccess(
        Schema.Struct({
          environments: Schema.Array(Environment),
          services: Schema.Array(Service),
          deployments: Schema.Record({
            key: Schema.String,
            value: Schema.Record({
              key: Schema.String,
              value: Schema.NullOr(Deployment)
            })
          })
        })
      )
      .addError(Errors.ProjectNotFound, { status: 404 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.get("getDeployments", "/api/v1/projects/:projectId/deployments")
      .setPath(Schema.Struct({ projectId: ProjectIdFromString }))
      .setUrlParams(DeploymentFilters)
      .addSuccess(
        Schema.Struct({
          deployments: Schema.Array(
            Schema.Struct({
              id: DeploymentId,
              projectId: ProjectId,
              environmentId: EnvironmentId,
              serviceId: ServiceId,
              version: Schema.String,
              commitSha: Schema.String,
              gitTag: Schema.optional(Schema.String),
              pullRequestUrl: Schema.optional(Schema.String),
              deployedBy: Schema.optional(Schema.String),
              deployedAt: Schema.DateFromSelf,
              status: Schema.Literal("success", "failed", "in_progress", "rolled_back"),
              buildUrl: Schema.optional(Schema.String),
              releaseNotes: Schema.optional(Schema.String),
              metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
              environment: Environment,
              service: Service
            })
          ),
          total: Schema.Number,
          limit: Schema.Number,
          offset: Schema.Number
        })
      )
      .addError(Errors.ProjectNotFound, { status: 404 })
      .addError(Errors.EnvironmentNotFound, { status: 404 })
      .addError(Errors.ServiceNotFound, { status: 404 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.get("getDeployment", "/api/v1/projects/:projectId/deployments/:deploymentId")
      .setPath(
        Schema.Struct({
          projectId: ProjectIdFromString,
          deploymentId: DeploymentIdFromString
        })
      )
      .addSuccess(Deployment)
      .addError(Errors.DeploymentNotFound, { status: 404 })
      .addError(Errors.ProjectNotFound, { status: 404 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.get("compareEnvironments", "/api/v1/projects/:projectId/compare")
      .setPath(Schema.Struct({ projectId: ProjectIdFromString }))
      .setUrlParams(
        Schema.Struct({
          env1: EnvironmentIdFromString,
          env2: EnvironmentIdFromString
        })
      )
      .addSuccess(
        Schema.Struct({
          env1: Environment,
          env2: Environment,
          differences: Schema.Array(
            Schema.Struct({
              service: Service,
              env1Deployment: Schema.NullOr(
                Schema.Struct({
                  version: Schema.String,
                  commitSha: Schema.String,
                  deployedAt: Schema.DateFromSelf,
                  gitTag: Schema.optional(Schema.String),
                  pullRequestUrl: Schema.optional(Schema.String)
                })
              ),
              env2Deployment: Schema.NullOr(
                Schema.Struct({
                  version: Schema.String,
                  commitSha: Schema.String,
                  deployedAt: Schema.DateFromSelf,
                  gitTag: Schema.optional(Schema.String),
                  pullRequestUrl: Schema.optional(Schema.String)
                })
              ),
              status: Schema.Literal("same", "different", "only_in_env1", "only_in_env2"),
              compareUrl: Schema.optional(Schema.String)
            })
          )
        })
      )
      .addError(Errors.ProjectNotFound, { status: 404 })
      .addError(Errors.EnvironmentNotFound, { status: 404 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
{}

// ============================================================================
// Environments API (Global - per user/tenant, not per project)
// ============================================================================

export class EnvironmentsGroup extends HttpApiGroup.make("environments")
  .add(
    HttpApiEndpoint.get("listEnvironments", "/api/v1/environments")
      .addSuccess(
        Schema.Struct({
          environments: Schema.Array(Environment)
        })
      )
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.post("createEnvironment", "/api/v1/environments")
      .setPayload(CreateEnvironmentInput)
      .addSuccess(
        Schema.Struct({
          environment: Environment
        })
      )
      .addError(Errors.EnvironmentAlreadyExists, { status: 409 })
      .addError(Errors.ValidationError, { status: 400 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.put("updateEnvironment", "/api/v1/environments/:environmentId")
      .setPath(Schema.Struct({
        environmentId: EnvironmentIdFromString
      }))
      .setPayload(UpdateEnvironmentInput)
      .addSuccess(
        Schema.Struct({
          environment: Environment
        })
      )
      .addError(Errors.EnvironmentNotFound, { status: 404 })
      .addError(Errors.ValidationError, { status: 400 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.del("archiveEnvironment", "/api/v1/environments/:environmentId")
      .setPath(Schema.Struct({
        environmentId: EnvironmentIdFromString
      }))
      .addSuccess(Schema.Void)
      .addError(Errors.EnvironmentNotFound, { status: 404 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.put("reorderEnvironment", "/api/v1/environments/:environmentId/reorder")
      .setPath(Schema.Struct({
        environmentId: EnvironmentIdFromString
      }))
      .setPayload(
        Schema.Struct({
          newOrder: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(0))
        })
      )
      .addSuccess(Schema.Void)
      .addError(Errors.EnvironmentNotFound, { status: 404 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.del("deleteEnvironment", "/api/v1/environments/:environmentId/hard")
      .setPath(Schema.Struct({
        environmentId: EnvironmentIdFromString
      }))
      .addSuccess(Schema.Void)
      .addError(Errors.EnvironmentNotFound, { status: 404 })
      .addError(Errors.EnvironmentHasDeployments, { status: 409 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
{}

// ============================================================================
// Services API
// ============================================================================

export class ServicesGroup extends HttpApiGroup.make("services")
  .add(
    HttpApiEndpoint.get("listServices", "/api/v1/projects/:projectId/services")
      .setPath(Schema.Struct({ projectId: ProjectIdFromString }))
      .addSuccess(
        Schema.Struct({
          services: Schema.Array(Service)
        })
      )
      .addError(Errors.ProjectNotFound, { status: 404 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.post("createService", "/api/v1/projects/:projectId/services")
      .setPath(Schema.Struct({ projectId: ProjectIdFromString }))
      .setPayload(CreateServiceInput)
      .addSuccess(
        Schema.Struct({
          service: Service
        })
      )
      .addError(Errors.ProjectNotFound, { status: 404 })
      .addError(Errors.ServiceAlreadyExists, { status: 409 })
      .addError(Errors.ValidationError, { status: 400 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.put("updateService", "/api/v1/projects/:projectId/services/:serviceId")
      .setPath(Schema.Struct({
        projectId: ProjectIdFromString,
        serviceId: ServiceIdFromString
      }))
      .setPayload(UpdateServiceInput)
      .addSuccess(
        Schema.Struct({
          service: Service
        })
      )
      .addError(Errors.ServiceNotFound, { status: 404 })
      .addError(Errors.ValidationError, { status: 400 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.del("archiveService", "/api/v1/projects/:projectId/services/:serviceId")
      .setPath(Schema.Struct({
        projectId: ProjectIdFromString,
        serviceId: ServiceIdFromString
      }))
      .addSuccess(Schema.Void)
      .addError(Errors.ServiceNotFound, { status: 404 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.del("deleteService", "/api/v1/projects/:projectId/services/:serviceId/hard")
      .setPath(Schema.Struct({
        projectId: ProjectIdFromString,
        serviceId: ServiceIdFromString
      }))
      .addSuccess(Schema.Void)
      .addError(Errors.ServiceNotFound, { status: 404 })
      .addError(Errors.ServiceHasDeployments, { status: 409 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
{}

// ============================================================================
// API Keys API
// ============================================================================

export class ApiKeysGroup extends HttpApiGroup.make("apiKeys")
  .add(
    HttpApiEndpoint.get("listApiKeys", "/api/v1/projects/:projectId/api-keys")
      .setPath(Schema.Struct({ projectId: ProjectIdFromString }))
      .addSuccess(
        Schema.Struct({
          apiKeys: Schema.Array(ApiKeyResponse)
        })
      )
      .addError(Errors.ProjectNotFound, { status: 404 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.post("createApiKey", "/api/v1/projects/:projectId/api-keys")
      .setPath(Schema.Struct({ projectId: ProjectIdFromString }))
      .setPayload(CreateApiKeyInput)
      .addSuccess(ApiKeyResponse)
      .addError(Errors.ProjectNotFound, { status: 404 })
      .addError(Errors.ValidationError, { status: 400 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.del("revokeApiKey", "/api/v1/projects/:projectId/api-keys/:apiKeyId")
      .setPath(Schema.Struct({
        projectId: ProjectIdFromString,
        apiKeyId: Schema.String
      }))
      .addSuccess(Schema.Void)
      .addError(Errors.ApiKeyNotFound, { status: 404 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
{}

// ============================================================================
// Version Patterns API
// ============================================================================

export class VersionPatternsGroup extends HttpApiGroup.make("versionPatterns")
  .add(
    HttpApiEndpoint.get("getVersionPattern", "/api/v1/projects/:projectId/version-patterns")
      .setPath(Schema.Struct({ projectId: ProjectIdFromString }))
      .addSuccess(VersionPattern)
      .addError(Errors.ProjectNotFound, { status: 404 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.put("updateVersionPattern", "/api/v1/projects/:projectId/version-patterns")
      .setPath(Schema.Struct({ projectId: ProjectIdFromString }))
      .setPayload(UpdateVersionPatternInput)
      .addSuccess(VersionPattern)
      .addError(Errors.ProjectNotFound, { status: 404 })
      .addError(Errors.ValidationError, { status: 400 })
      .addError(Errors.DatabaseError, { status: 500 })
  )
  .add(
    HttpApiEndpoint.post("testPattern", "/api/v1/projects/:projectId/version-patterns/test")
      .setPath(Schema.Struct({ projectId: ProjectIdFromString }))
      .setPayload(TestPatternRequest)
      .addSuccess(TestPatternResponse)
      .addError(Errors.ValidationError, { status: 400 })
  )
{}

// ============================================================================
// User API
// ============================================================================

export class UserGroup extends HttpApiGroup.make("user")
  .add(
    HttpApiEndpoint.get("getCurrentUser", "/api/v1/user/me")
      .addSuccess(User)
      .addError(Errors.DatabaseError, { status: 500 })
  )
{}

// ============================================================================
// Main API
// ============================================================================

export class DtaplineApi extends HttpApi.make("dtapline-api")
  .add(DeploymentsWebhookGroup)
  .add(ProjectsGroup)
  .add(EnvironmentsGroup)
  .add(ServicesGroup)
  .add(ApiKeysGroup)
  .add(VersionPatternsGroup)
  .add(UserGroup)
{}
