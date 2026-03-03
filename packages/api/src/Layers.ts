import * as Config from "effect/Config"
import * as Layer from "effect/Layer"
import { DtaplineApiLive } from "./Api/DtaplineApiLive.js"
import { BetterAuthLive } from "./Auth.js"
import { ServerConfigLive } from "./Config.js"
import { MongoClientLive, MongoDBLive } from "./MongoDB.js"
import { ApiKeysRepositoryLive } from "./Repositories/ApiKeysRepository.js"
import { DeploymentsRepositoryLive } from "./Repositories/DeploymentsRepository.js"
import { EnvironmentsRepositoryLive } from "./Repositories/EnvironmentsRepository.js"
import { ProjectsRepositoryLive } from "./Repositories/ProjectsRepository.js"
import { ServicesRepositoryLive } from "./Repositories/ServicesRepository.js"
import { VersionPatternsRepositoryLive } from "./Repositories/VersionPatternsRepository.js"
import { AuthorizationServiceLive } from "./Services/AuthorizationService.js"
import { AuthServiceLive } from "./Services/AuthService.js"
import { BroadcastLive, BroadcastServiceNoop } from "./Services/BroadcastService.js"
import { ComparisonServiceLive } from "./Services/ComparisonService.js"
import { DeploymentServiceLive } from "./Services/DeploymentService.js"
import { MatrixServiceLive } from "./Services/MatrixService.js"
import { DemoUserMiddlewareLive } from "./Utils/DemoUserMiddleware.js"

/**
 * Application Layer Composition
 *
 * Layer dependency hierarchy:
 * 1. ServerConfigLive - Configuration from environment
 * 2. MongoDBLive + MongoClientLive - Database connections
 * 3. BetterAuthLive - Authentication (depends on MongoClientLive)
 * 4. AuthServiceLive - Auth service wrapper (depends on BetterAuthLive)
 * 5. RepositoriesLive - All repositories (depend on MongoDBLive)
 * 6. ServicesLive - Business logic services (depend on RepositoriesLive)
 * 7. DtaplineApiLive - HTTP API (depends on ServicesLive + RepositoriesLive + AuthServiceLive)
 */

/**
 * All repositories combined
 * Provides: ProjectsRepository, EnvironmentsRepository, ServicesRepository,
 *           DeploymentsRepository, ApiKeysRepository, VersionPatternsRepository
 * Requires: MongoDB, ServerConfigService
 *
 * Note: ServicesRepository depends on ProjectsRepository, so we provide it explicitly
 */
export const RepositoriesLive = Layer.mergeAll(
  ProjectsRepositoryLive,
  EnvironmentsRepositoryLive,
  ServicesRepositoryLive.pipe(Layer.provide(ProjectsRepositoryLive)),
  DeploymentsRepositoryLive,
  ApiKeysRepositoryLive,
  VersionPatternsRepositoryLive
).pipe(
  Layer.provide(MongoDBLive),
  Layer.provide(ServerConfigLive)
)

/**
 * All business logic services combined
 * Provides: DeploymentService, MatrixService, ComparisonService
 * Requires: All repositories
 */
export const ServicesLive = Layer.mergeAll(
  DeploymentServiceLive,
  MatrixServiceLive,
  ComparisonServiceLive
).pipe(Layer.provide(RepositoriesLive))

/**
 * Broadcast layer
 * Uses the real AWS implementation when WS_API_URL and WS_CONNECTIONS_TABLE
 * are configured, falls back to noop when not configured (local dev)
 */
const BroadcastLayerLive = Layer.unwrap(
  Config.all([Config.string("WS_API_URL"), Config.string("WS_CONNECTIONS_TABLE")]).pipe(
    Config.map(() => BroadcastLive),
    Config.withDefault(BroadcastServiceNoop)
  ).asEffect()
)

/**
 * Complete application layer ready for HTTP server
 * Provides: Dtapline HTTP API with all dependencies satisfied
 * Requires: Nothing (all dependencies are provided internally)
 *
 * The DtaplineApiLive requires all services, repositories, and auth to be available,
 * so we provide them in the correct dependency order.
 *
 * Note: We provide BetterAuthLive directly (in addition to AuthServiceLive) because
 * the AuthGroup needs direct access to BetterAuthInstance to handle auth requests.
 */
export const AppLive = DtaplineApiLive.pipe(
  Layer.provide(BroadcastLayerLive), // Provide BroadcastService (real or noop)
  Layer.provide(DemoUserMiddlewareLive),
  Layer.provide(AuthorizationServiceLive), // Provide AuthorizationService for authorization
  Layer.provide(AuthServiceLive), // Provide AuthService for authenticated endpoints
  Layer.provide(BetterAuthLive), // Provide Better Auth for AuthGroup and AuthService
  Layer.provide(ServicesLive),
  Layer.provide(RepositoriesLive),
  Layer.provide(MongoClientLive),
  Layer.provide(MongoDBLive),
  Layer.provide(ServerConfigLive)
)
