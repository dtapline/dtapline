import { Layer } from "effect"
import { DtaplineApiLive } from "./Api/DtaplineApiLive.js"
import { ServerConfigLive } from "./Config.js"
import { MongoDBLive } from "./MongoDB.js"
import { ApiKeysRepositoryLive } from "./Repositories/ApiKeysRepository.js"
import { DeploymentsRepositoryLive } from "./Repositories/DeploymentsRepository.js"
import { EnvironmentsRepositoryLive } from "./Repositories/EnvironmentsRepository.js"
import { ProjectsRepositoryLive } from "./Repositories/ProjectsRepository.js"
import { ServicesRepositoryLive } from "./Repositories/ServicesRepository.js"
import { VersionPatternsRepositoryLive } from "./Repositories/VersionPatternsRepository.js"
import { ComparisonServiceLive } from "./Services/ComparisonService.js"
import { DeploymentServiceLive } from "./Services/DeploymentService.js"
import { MatrixServiceLive } from "./Services/MatrixService.js"

/**
 * Application Layer Composition
 *
 * Layer dependency hierarchy:
 * 1. ServerConfigLive - Configuration from environment
 * 2. MongoDBLive - Database connection (depends on ServerConfigLive)
 * 3. RepositoriesLive - All repositories (depend on MongoDBLive)
 * 4. ServicesLive - Business logic services (depend on RepositoriesLive)
 * 5. DtaplineApiLive - HTTP API (depends on ServicesLive + RepositoriesLive)
 */

/**
 * All repositories combined
 * Provides: ProjectsRepository, EnvironmentsRepository, ServicesRepository,
 *           DeploymentsRepository, ApiKeysRepository, VersionPatternsRepository
 * Requires: MongoDB, ServerConfigService
 */
export const RepositoriesLive = Layer.mergeAll(
  ProjectsRepositoryLive,
  EnvironmentsRepositoryLive,
  ServicesRepositoryLive,
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
 * Complete application layer ready for HTTP server
 * Provides: Dtapline HTTP API with all dependencies satisfied
 * Requires: Nothing (all dependencies are provided internally)
 *
 * The DtaplineApiLive requires all services and repositories to be available,
 * so we provide them in the correct dependency order.
 */
export const AppLive = DtaplineApiLive.pipe(
  Layer.provide(ServicesLive),
  Layer.provide(RepositoriesLive),
  Layer.provide(ServerConfigLive)
)
