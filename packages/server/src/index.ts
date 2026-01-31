/**
 * API Keys API Group implementation
 * Handles listing, creating, and revoking API keys
 */
export * as ApiKeysGroup from "./Api/ApiKeysGroup.js"

/**
 * Complete CloudMatrix API implementation
 * Combines all API groups into a single HTTP API layer
 */
export * as CloudMatrixApiLive from "./Api/CloudMatrixApiLive.js"

/**
 * Webhook API Group implementation
 * Handles deployment webhooks with API key authentication
 */
export * as DeploymentsWebhookGroup from "./Api/DeploymentsWebhookGroup.js"

/**
 * Environments API Group implementation
 * Handles CRUD operations for environments, including soft delete (archive) and hard delete
 */
export * as EnvironmentsGroup from "./Api/EnvironmentsGroup.js"

/**
 * Projects API Group implementation
 * Handles CRUD operations for projects, matrix view, deployments list, and environment comparison
 */
export * as ProjectsGroup from "./Api/ProjectsGroup.js"

/**
 * Services API Group implementation
 * Handles CRUD operations for services, including soft delete (archive) and hard delete
 */
export * as ServicesGroup from "./Api/ServicesGroup.js"

/**
 * Version Patterns API Group implementation
 * Handles getting, updating, and testing version extraction patterns
 */
export * as VersionPatternsGroup from "./Api/VersionPatternsGroup.js"

/**
 * Server configuration interface
 */
export * as Config from "./Config.js"

/**
 * Application Layer Composition
 *
 * Layer dependency hierarchy:
 * 1. ServerConfigLive - Configuration from environment
 * 2. MongoDBLive - Database connection (depends on ServerConfigLive)
 * 3. RepositoriesLive - All repositories (depend on MongoDBLive)
 * 4. ServicesLive - Business logic services (depend on RepositoriesLive)
 * 5. CloudMatrixApiLive - HTTP API (depends on ServicesLive + RepositoriesLive)
 */
export * as Layers from "./Layers.js"

/**
 * Service tag for MongoDB database connection
 */
export * as MongoDB from "./MongoDB.js"

/**
 * MongoDB document type for ApiKey
 */
export * as ApiKeysRepository from "./Repositories/ApiKeysRepository.js"

/**
 * MongoDB document type for Deployment
 */
export * as DeploymentsRepository from "./Repositories/DeploymentsRepository.js"

/**
 * MongoDB document type for Environment
 */
export * as EnvironmentsRepository from "./Repositories/EnvironmentsRepository.js"

/**
 * MongoDB document type for Project (stores branded types as strings)
 */
export * as ProjectsRepository from "./Repositories/ProjectsRepository.js"

/**
 * MongoDB document type for Service
 */
export * as ServicesRepository from "./Repositories/ServicesRepository.js"

/**
 * MongoDB document type for VersionPattern
 */
export * as VersionPatternsRepository from "./Repositories/VersionPatternsRepository.js"

/**
 * Service comparison - shows version differences between two environments
 */
export * as ComparisonService from "./Services/ComparisonService.js"

/**
 * Deployment Service
 * Handles webhook processing, auto-creation of environments/services, and version extraction
 */
export * as DeploymentService from "./Services/DeploymentService.js"

/**
 * Matrix cell - represents the deployment state for a specific environment-service pair
 */
export * as MatrixService from "./Services/MatrixService.js"

/**
 * AWS Lambda handler for CloudMatrix API
 *
 * This handler converts the Effect HTTP API into an AWS Lambda function
 * that can be deployed to AWS Lambda and API Gateway.
 *
 * @example Deploy with AWS CDK, SAM, or Serverless Framework:
 * ```yaml
 * # serverless.yml
 * functions:
 *   api:
 *     handler: dist/lambda.handler
 *     events:
 *       - httpApi: '*'
 * ```
 */
export * as lambda from "./lambda.js"

/**
 * Local development server for CloudMatrix API
 *
 * Starts an HTTP server on port 3000 with request logging middleware.
 * All dependencies (MongoDB, repositories, services) are automatically
 * provided by the AppLive layer.
 *
 * @example Run locally:
 * ```bash
 * cd packages/server
 * tsx src/server.ts
 * ```
 *
 * Environment variables required:
 * - MONGODB_URI: MongoDB connection string
 * - DEFAULT_USER_ID: User ID for MVP (defaults to "default-user")
 * - DEFAULT_USER_EMAIL: User email for MVP
 * - DEFAULT_USER_NAME: User name for MVP
 */
export * as server from "./server.js"
