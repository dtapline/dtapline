import * as Schema from "effect/Schema"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiMiddleware, HttpApiSchema } from "effect/unstable/httpapi"
import { Forbidden } from "effect/unstable/httpapi/HttpApiError"
import { ApiKeyResponse, CreateApiKeyInput } from "./ApiKey.js"
import { CreateDeploymentInput, Deployment, DeploymentFilters, DeploymentId } from "./Deployment.js"
import { CreateEnvironmentInput, Environment, EnvironmentId, UpdateEnvironmentInput } from "./Environment.js"
import * as Errors from "./Errors.js"
import { CreateProjectInput, Project, ProjectId, UpdateProjectInput } from "./Project.js"
import { CreateServiceInput, Service, ServiceId, UpdateServiceInput } from "./Service.js"
import { User } from "./User.js"
import { TestPatternRequest, TestPatternResponse, UpdateVersionPatternInput, VersionPattern } from "./VersionPattern.js"

// Convert branded types to string for path params
const ProjectIdFromString = Schema.String.pipe(Schema.decodeTo(ProjectId))
const EnvironmentIdFromString = Schema.String.pipe(Schema.decodeTo(EnvironmentId))
const ServiceIdFromString = Schema.String.pipe(Schema.decodeTo(ServiceId))
const DeploymentIdFromString = Schema.String.pipe(Schema.decodeTo(DeploymentId))

// ============================================================================
// Webhook API (Public - requires API key)
// ============================================================================

export class DeploymentsWebhookGroup extends HttpApiGroup.make("deploymentsWebhook")
  .add(
    HttpApiEndpoint.post("createDeployment", "/api/v1/deployments", {
      payload: CreateDeploymentInput,
      success: Schema.Struct({
        id: DeploymentId,
        version: Schema.String,
        message: Schema.String
      }),
      error: [
        Errors.UnauthorizedApiKey.pipe(HttpApiSchema.status(401)),
        Errors.InvalidApiKey.pipe(HttpApiSchema.status(401)),
        Errors.ApiKeyExpired.pipe(HttpApiSchema.status(401)),
        Errors.ProjectNotFound.pipe(HttpApiSchema.status(404)),
        Errors.PlanLimitExceeded.pipe(HttpApiSchema.status(403)),
        Errors.ValidationError.pipe(HttpApiSchema.status(400)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
{}

// ============================================================================
// Projects API
// ============================================================================

export class ProjectsGroup extends HttpApiGroup.make("projects")
  .add(
    HttpApiEndpoint.get("listProjects", "/api/v1/projects", {
      success: Schema.Struct({
        projects: Schema.Array(Project)
      }),
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.post("createProject", "/api/v1/projects", {
      payload: CreateProjectInput,
      success: Schema.Struct({
        project: Project
      }),
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.Forbidden.pipe(HttpApiSchema.status(403)),
        Errors.PlanLimitExceeded.pipe(HttpApiSchema.status(403)),
        Errors.ProjectAlreadyExists.pipe(HttpApiSchema.status(409)),
        Errors.ValidationError.pipe(HttpApiSchema.status(400)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.get("getProject", "/api/v1/projects/:projectId", {
      params: ({ projectId: ProjectIdFromString }),
      success: Project,
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.ProjectNotFound.pipe(HttpApiSchema.status(404)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.put("updateProject", "/api/v1/projects/:projectId", {
      params: ({ projectId: ProjectIdFromString }),
      payload: UpdateProjectInput,
      success: Schema.Struct({
        project: Project
      }),
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.Forbidden.pipe(HttpApiSchema.status(403)),
        Errors.ProjectNotFound.pipe(HttpApiSchema.status(404)),
        Errors.ValidationError.pipe(HttpApiSchema.status(400)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.delete("deleteProject", "/api/v1/projects/:projectId", {
      params: ({ projectId: ProjectIdFromString }),
      success: Schema.Void,
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.Forbidden.pipe(HttpApiSchema.status(403)),
        Errors.ProjectNotFound.pipe(HttpApiSchema.status(404)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.get("getMatrix", "/api/v1/projects/:projectId/matrix", {
      params: ({ projectId: ProjectIdFromString }),
      success: Schema.Struct({
        environments: Schema.Array(Environment),
        services: Schema.Array(Service),
        deployments: Schema.Record(
          Schema.String,
          Schema.Record(
            Schema.String,
            Schema.NullOr(Deployment)
          )
        )
      }),
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.ProjectNotFound.pipe(HttpApiSchema.status(404)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.get("getDeployments", "/api/v1/projects/:projectId/deployments", {
      params: ({ projectId: ProjectIdFromString }),
      query: DeploymentFilters.fields,
      success: Schema.Struct({
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
            deployedAt: Schema.Date,
            status: Schema.Literals(["success", "failed", "in_progress", "rolled_back"]),
            buildUrl: Schema.optional(Schema.String),
            releaseNotes: Schema.optional(Schema.String),
            metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
            environment: Environment,
            service: Service
          })
        ),
        total: Schema.Number,
        limit: Schema.Number,
        offset: Schema.Number
      }),
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.ProjectNotFound.pipe(HttpApiSchema.status(404)),
        Errors.EnvironmentNotFound.pipe(HttpApiSchema.status(404)),
        Errors.ServiceNotFound.pipe(HttpApiSchema.status(404)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.get("getDeployment", "/api/v1/projects/:projectId/deployments/:deploymentId", {
      params: ({
        projectId: ProjectIdFromString,
        deploymentId: DeploymentIdFromString
      }),
      success: Deployment,
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.DeploymentNotFound.pipe(HttpApiSchema.status(404)),
        Errors.ProjectNotFound.pipe(HttpApiSchema.status(404)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.get("compareEnvironments", "/api/v1/projects/:projectId/compare", {
      params: ({ projectId: ProjectIdFromString }),
      query: {
        env1: EnvironmentIdFromString,
        env2: EnvironmentIdFromString
      },
      success: Schema.Struct({
        env1: Environment,
        env2: Environment,
        differences: Schema.Array(
          Schema.Struct({
            service: Service,
            env1Deployment: Schema.NullOr(
              Schema.Struct({
                version: Schema.String,
                commitSha: Schema.String,
                deployedAt: Schema.Date,
                gitTag: Schema.optional(Schema.String),
                pullRequestUrl: Schema.optional(Schema.String)
              })
            ),
            env2Deployment: Schema.NullOr(
              Schema.Struct({
                version: Schema.String,
                commitSha: Schema.String,
                deployedAt: Schema.Date,
                gitTag: Schema.optional(Schema.String),
                pullRequestUrl: Schema.optional(Schema.String)
              })
            ),
            status: Schema.Literals(["same", "different", "only_in_env1", "only_in_env2"]),
            compareUrl: Schema.optional(Schema.String)
          })
        )
      }),
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.ProjectNotFound.pipe(HttpApiSchema.status(404)),
        Errors.EnvironmentNotFound.pipe(HttpApiSchema.status(404)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
{}

// ============================================================================
// Environments API (Global - per user/tenant, not per project)
// ============================================================================

export class EnvironmentsGroup extends HttpApiGroup.make("environments")
  .add(
    HttpApiEndpoint.get("listEnvironments", "/api/v1/environments", {
      success: Schema.Struct({
        environments: Schema.Array(Environment)
      }),
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.post("createEnvironment", "/api/v1/environments", {
      payload: CreateEnvironmentInput,
      success: Schema.Struct({
        environment: Environment
      }),
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.Forbidden.pipe(HttpApiSchema.status(403)),
        Errors.EnvironmentAlreadyExists.pipe(HttpApiSchema.status(409)),
        Errors.ValidationError.pipe(HttpApiSchema.status(400)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.put("updateEnvironment", "/api/v1/environments/:environmentId", {
      params: { environmentId: EnvironmentIdFromString },
      payload: UpdateEnvironmentInput,
      success: Schema.Struct({
        environment: Environment
      }),
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.Forbidden.pipe(HttpApiSchema.status(403)),
        Errors.EnvironmentNotFound.pipe(HttpApiSchema.status(404)),
        Errors.ValidationError.pipe(HttpApiSchema.status(400)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.delete("archiveEnvironment", "/api/v1/environments/:environmentId", {
      params: { environmentId: EnvironmentIdFromString },
      success: Schema.Void,
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.Forbidden.pipe(HttpApiSchema.status(403)),
        Errors.EnvironmentNotFound.pipe(HttpApiSchema.status(404)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.put("reorderEnvironment", "/api/v1/environments/:environmentId/reorder", {
      params: { environmentId: EnvironmentIdFromString },
      payload: Schema.Struct({
        newOrder: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))
      }),
      success: Schema.Void,
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.Forbidden.pipe(HttpApiSchema.status(403)),
        Errors.EnvironmentNotFound.pipe(HttpApiSchema.status(404)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.delete("deleteEnvironment", "/api/v1/environments/:environmentId/hard", {
      params: { environmentId: EnvironmentIdFromString },
      success: Schema.Void,
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.Forbidden.pipe(HttpApiSchema.status(403)),
        Errors.EnvironmentNotFound.pipe(HttpApiSchema.status(404)),
        Errors.EnvironmentHasDeployments.pipe(HttpApiSchema.status(409)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
{}

// ============================================================================
// Services API
// ============================================================================

export class ServicesGroup extends HttpApiGroup.make("services")
  .add(
    HttpApiEndpoint.get("listServices", "/api/v1/projects/:projectId/services", {
      params: { projectId: ProjectIdFromString },
      success: Schema.Struct({
        services: Schema.Array(Service)
      }),
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.ProjectNotFound.pipe(HttpApiSchema.status(404)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.post("createService", "/api/v1/projects/:projectId/services", {
      params: { projectId: ProjectIdFromString },
      payload: CreateServiceInput,
      success: Schema.Struct({
        service: Service
      }),
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.Forbidden.pipe(HttpApiSchema.status(403)),
        Errors.PlanLimitExceeded.pipe(HttpApiSchema.status(403)),
        Errors.ProjectNotFound.pipe(HttpApiSchema.status(404)),
        Errors.ServiceAlreadyExists.pipe(HttpApiSchema.status(409)),
        Errors.ValidationError.pipe(HttpApiSchema.status(400)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.put("updateService", "/api/v1/projects/:projectId/services/:serviceId", {
      params: {
        projectId: ProjectIdFromString,
        serviceId: ServiceIdFromString
      },
      payload: UpdateServiceInput,
      success: Schema.Struct({
        service: Service
      }),
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.Forbidden.pipe(HttpApiSchema.status(403)),
        Errors.ServiceNotFound.pipe(HttpApiSchema.status(404)),
        Errors.ValidationError.pipe(HttpApiSchema.status(400)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.delete("archiveService", "/api/v1/projects/:projectId/services/:serviceId", {
      params: {
        projectId: ProjectIdFromString,
        serviceId: ServiceIdFromString
      },
      success: Schema.Void,
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.Forbidden.pipe(HttpApiSchema.status(403)),
        Errors.ServiceNotFound.pipe(HttpApiSchema.status(404)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.delete("deleteService", "/api/v1/projects/:projectId/services/:serviceId/hard", {
      params: {
        projectId: ProjectIdFromString,
        serviceId: ServiceIdFromString
      },
      success: Schema.Void,
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.Forbidden.pipe(HttpApiSchema.status(403)),
        Errors.ServiceNotFound.pipe(HttpApiSchema.status(404)),
        Errors.ServiceHasDeployments.pipe(HttpApiSchema.status(409)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
{}

// ============================================================================
// API Keys API
// ============================================================================

export class ApiKeysGroup extends HttpApiGroup.make("apiKeys")
  .add(
    HttpApiEndpoint.get("listApiKeys", "/api/v1/projects/:projectId/api-keys", {
      params: { projectId: ProjectIdFromString },
      success: Schema.Struct({
        apiKeys: Schema.Array(ApiKeyResponse)
      }),
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.ProjectNotFound.pipe(HttpApiSchema.status(404)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.post("createApiKey", "/api/v1/projects/:projectId/api-keys", {
      params: { projectId: ProjectIdFromString },
      payload: CreateApiKeyInput,
      success: ApiKeyResponse,
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.Forbidden.pipe(HttpApiSchema.status(403)),
        Errors.ProjectNotFound.pipe(HttpApiSchema.status(404)),
        Errors.ValidationError.pipe(HttpApiSchema.status(400)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.delete("revokeApiKey", "/api/v1/projects/:projectId/api-keys/:apiKeyId", {
      params: {
        projectId: ProjectIdFromString,
        apiKeyId: Schema.String
      },
      success: Schema.Void,
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.Forbidden.pipe(HttpApiSchema.status(403)),
        Errors.ApiKeyNotFound.pipe(HttpApiSchema.status(404)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
{}

// ============================================================================
// Version Patterns API
// ============================================================================

export class VersionPatternsGroup extends HttpApiGroup.make("versionPatterns")
  .add(
    HttpApiEndpoint.get("getVersionPattern", "/api/v1/projects/:projectId/version-patterns", {
      params: { projectId: ProjectIdFromString },
      success: VersionPattern,
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.ProjectNotFound.pipe(HttpApiSchema.status(404)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.put("updateVersionPattern", "/api/v1/projects/:projectId/version-patterns", {
      params: { projectId: ProjectIdFromString },
      payload: UpdateVersionPatternInput,
      success: VersionPattern,
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.Forbidden.pipe(HttpApiSchema.status(403)),
        Errors.ProjectNotFound.pipe(HttpApiSchema.status(404)),
        Errors.ValidationError.pipe(HttpApiSchema.status(400)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.post("testPattern", "/api/v1/projects/:projectId/version-patterns/test", {
      params: { projectId: ProjectIdFromString },
      payload: TestPatternRequest,
      success: TestPatternResponse,
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.ValidationError.pipe(HttpApiSchema.status(400))
      ]
    })
  )
{}

// ============================================================================
// User API
// ============================================================================

export class UserGroup extends HttpApiGroup.make("user")
  .add(
    HttpApiEndpoint.get("getCurrentUser", "/api/v1/user/me", {
      success: User,
      error: [
        Errors.Unauthorized.pipe(HttpApiSchema.status(401)),
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
{}

// ============================================================================
// Auth API (Better Auth endpoints)
// ============================================================================

/**
 * Auth API Group for Better Auth endpoints
 *
 * All authentication requests (sign in, sign up, OAuth, session management)
 * are handled by Better Auth at /api/auth/*
 *
 * This group uses a catch-all route pattern to forward all requests to Better Auth
 */
export class AuthGroup extends HttpApiGroup.make("auth")
  .add(
    HttpApiEndpoint.get("handleAuth", "/api/auth/*", {
      error: [
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
  .add(
    HttpApiEndpoint.post("handleAuthPost", "/api/auth/*", {
      error: [
        Errors.DatabaseError.pipe(HttpApiSchema.status(500))
      ]
    })
  )
{}

// ============================================================================
// Middlewares
// ============================================================================

/**
 * Middleware that blocks non-GET requests for demo users
 *
 * Demo users can view all data (GET requests) but cannot create, update, or delete
 * anything (POST, PUT, PATCH, DELETE requests).
 *
 * This provides a cleaner authorization approach than checking `requireWriteAccess`
 * in every single endpoint handler.
 */
export class DemoUserMiddleware extends HttpApiMiddleware.Service<DemoUserMiddleware>()("DemoUserMiddleware", {
  error: Forbidden
}) {}

// ============================================================================
// Main API
// ============================================================================

export class DtaplineApi extends HttpApi.make("dtapline-api")
  .add(DeploymentsWebhookGroup)
  .add(AuthGroup)
  .add(ProjectsGroup)
  .add(EnvironmentsGroup)
  .add(ServicesGroup)
  .add(ApiKeysGroup)
  .add(VersionPatternsGroup)
  .add(UserGroup)
  .middleware(DemoUserMiddleware) // Apply demo user middleware to all endpoints
{}
