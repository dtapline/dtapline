# Dtapline Architecture

## System Overview

```
┌─────────────┐
│   CLI Tool  │ (Azure Pipelines, GitHub Actions, etc.)
└──────┬──────┘
       │ POST /api/v1/deployments
       │ Bearer: API Key
       ↓
┌─────────────┐     ┌──────────────┐
│  React UI   │────→│  HTTP API    │
└─────────────┘     │ (Effect-TS)  │
                    └──────┬───────┘
                           │
                           ↓
                    ┌──────────────┐
                    │   MongoDB    │
                    └──────────────┘
```

## Package Structure

### `packages/domain`
**Shared schemas and types**
- All Effect Schemas (Project, Environment, Service, Deployment, etc.)
- Branded types (ProjectId, EnvironmentId, etc.)
- API endpoint definitions using HttpApiEndpoint
- No dependencies on server/ui packages

### `packages/server`
**HTTP API + MongoDB**
- Effect Platform HTTP server
- 6 repository implementations (Projects, Environments, Services, Deployments, ApiKeys, VersionPatterns)
- 3 services (DeploymentService, ComparisonService, VersionPatternService)
- API key authentication with bcrypt
- Lambda-ready with connection pooling

### `packages/ui`
**React 19 dashboard**
- TanStack Router for file-based routing
- React Query for data fetching
- Tailwind CSS + shadcn/ui components
- DeploymentMatrix component for 2D visualization
- CRUD dialogs for environments/services

### `packages/cli`
**CI/CD integration tool**
- Effect CLI for command parsing
- Reports deployments via webhook endpoint
- Supports API key auth and optional metadata
- Examples for Azure Pipelines, GitHub Actions

## Data Flow

### Deployment Reporting (CLI → API → DB)
1. CLI sends POST to `/api/v1/deployments` with Bearer token
2. Server validates API key and checks `deployments:write` scope
3. DeploymentService processes webhook:
   - Looks up or creates environment by name
   - Looks up or creates service by name
   - Extracts version from gitTag or commitSha using regex pattern
4. Repository saves deployment to MongoDB
5. Matrix view aggregates latest deployment per env/service

### Matrix View (UI → API → DB)
1. UI requests `/api/v1/projects/{id}/matrix`
2. Server queries MongoDB:
   - Fetches all environments (sorted by order)
   - Fetches all services
   - Aggregates latest deployment per environment/service combination
3. Returns nested structure: `{ environments, services, deployments: { [envId]: { [serviceId]: Deployment | null } } }`

### Version Extraction
- Each project has a VersionPattern (regex)
- Default: `v?(\d+\.\d+\.\d+)` (semver)
- Can be customized per service
- Extracts from gitTag first, falls back to commitSha

## Key Services

### DeploymentService
**Processes deployment webhooks**
- `processWebhook(projectId, payload)` - Main entry point
- Validates environment and service exist or creates them
- Extracts version using VersionPatternService
- Stores deployment record

### ComparisonService
**Compares versions across environments**
- `compareEnvironments(projectId, sourceEnv, targetEnv)` - Compares all services
- `compareService(projectId, serviceId, envs)` - Compares one service across envs
- Uses semver-style comparison (1.2.3 > 1.2.2)

### VersionPatternService
**Regex-based version extraction**
- `extractVersion(pattern, text)` - Applies regex to extract version string
- Fallback to full commitSha if no match
- Supports custom patterns per service

## Repository Pattern

All repositories follow the same Effect pattern:

```typescript
// 1. Define interface
export interface MyRepository {
  readonly create: (input: CreateInput) => Effect.Effect<Entity, DatabaseError>
  readonly findById: (id: EntityId) => Effect.Effect<Entity | null, DatabaseError>
}

// 2. Create tag
export const MyRepository = Context.GenericTag<MyRepository>("MyRepository")

// 3. Implement as Layer
export const MyRepositoryLive = Layer.effect(
  MyRepository,
  Effect.gen(function*() {
    const db = yield* MongoDatabase
    
    return MyRepository.of({
      create: (input) => Effect.gen(function*() {
        // Implementation
      }),
      findById: (id) => Effect.gen(function*() {
        // Implementation
      })
    })
  })
)
```

## Authentication

### API Keys
- Stored hashed with bcrypt (10 rounds)
- Prefix shown for identification (e.g., `cm_abc12`)
- Full key only shown once on creation
- Three scopes:
  - `deployments:write` - Can report deployments
  - `deployments:read` - Can read deployment data
  - `admin` - Full access to project

### Webhook Authentication
```typescript
Authorization: Bearer cm_xxxxxxxxxxxxx
```
- Server validates key against hashed version
- Checks key hasn't expired
- Verifies required scope
- Updates lastUsedAt timestamp

## Database Schema

### Collections
- `projects` - Project metadata
- `environments` - Deployment environments (dev, stg, prd)
- `services` - Services/applications being deployed
- `deployments` - Deployment records (who, what, when, where)
- `apiKeys` - API keys for authentication
- `versionPatterns` - Custom version extraction patterns

### Key Indexes
```javascript
// Deployments - most critical for performance
db.deployments.createIndex({ projectId: 1, environmentId: 1, serviceId: 1 })
db.deployments.createIndex({ projectId: 1, deployedAt: -1 })

// Environments/Services - lookup by name
db.environments.createIndex({ projectId: 1, name: 1 }, { unique: true })
db.services.createIndex({ projectId: 1, name: 1 }, { unique: true })

// API Keys - lookup by prefix for validation
db.apiKeys.createIndex({ projectId: 1 })
```

### Data Relationships
No foreign key constraints (MongoDB doesn't enforce them). Relationships are logical:
- `deployments.projectId` → `projects.id`
- `deployments.environmentId` → `environments.id`
- `deployments.serviceId` → `services.id`
- `apiKeys.projectId` → `projects.id`

### Null Handling Pattern
See [mongodb.md](./mongodb.md) for the critical null ↔ undefined conversion pattern.

## Deployment Options

### Local Development
```bash
# Terminal 1: MongoDB
brew services start mongodb-community

# Terminal 2: Server
cd packages/server && pnpm dev

# Terminal 3: UI
cd packages/ui && pnpm dev
```

### AWS Lambda
Use `packages/server/src/lambda.ts` as handler:
- Connection pooling optimized for Lambda
- Single MongoDB connection reused across invocations
- Cold start: ~500ms, Warm: ~50ms

### Traditional Server
Use `packages/server/src/server.ts`:
- Node.js HTTP server (native `http` module)
- Suitable for Docker containers, VMs, or bare metal
- PM2 or systemd for process management

## Error Handling

All errors are typed using Effect's tagged error pattern:

```typescript
// Domain errors
export class ProjectNotFound extends Data.TaggedError("ProjectNotFound")<{
  message: string
}> {}

// Service layer
yield* Effect.fail(new ProjectNotFound({ message: "Project not found" }))

// API layer
.addError(Errors.ProjectNotFound, { status: 404 })
```

Never use `try/catch` - always use Effect error handling:
- `Effect.catchTag` - Catch specific error types
- `Effect.catchAll` - Catch all errors
- `Effect.orElseSucceed` - Provide fallback value

## Performance Considerations

### Matrix Query Optimization
- Single aggregation query fetches all latest deployments
- Results indexed by environmentId → serviceId for O(1) lookup
- UI caches matrix data with React Query (5 min stale time)

### API Key Validation
- Hashed keys stored in MongoDB
- bcrypt comparison (~50ms per validation)
- Consider Redis cache for high-traffic APIs

### Connection Pooling
- MongoDB connection pool size: 10 (Lambda), 100 (server)
- Reuses connections across requests
- Critical for Lambda performance
