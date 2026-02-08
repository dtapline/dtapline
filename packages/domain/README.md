# Dtapline Domain Package

Core domain models, schemas, and API definitions for the Dtapline deployment tracking system.

## Overview

This package contains shared types and schemas used by all other packages (`api`, `ui`, `cli`). It defines:

- **Domain Models**: Effect Schema classes for all entities (Project, Environment, Service, Deployment, etc.)
- **Branded Types**: Type-safe IDs (ProjectId, EnvironmentId, etc.)
- **API Definitions**: HTTP endpoint specifications using `@effect/platform`
- **Error Types**: Tagged errors for domain operations

## Key Features

- **Type Safety**: All schemas are validated at runtime using Effect Schema
- **Shared Contracts**: API and UI use the same type definitions
- **Zero Dependencies**: This package has no dependencies on `api`, `ui`, or `cli` packages

## Project Structure

```
src/
├── Errors.ts           # Tagged error definitions
├── Models/             # Domain entities
│   ├── Project.ts
│   ├── Environment.ts
│   ├── Service.ts
│   ├── Deployment.ts
│   ├── ApiKey.ts
│   └── VersionPattern.ts
├── Api.ts              # HTTP API endpoint definitions
└── index.ts            # Public exports
```

## Usage

### Importing from Other Packages

```typescript
// In api, ui, or cli packages
import { Project, ProjectId, DeploymentNotFound } from "@dtapline/domain"
```

### Domain Models

All domain models extend `Schema.Class`:

```typescript
export class Project extends Schema.Class<Project>("Project")({
  id: ProjectId,
  userId: Schema.String,
  name: Schema.NonEmptyTrimmedString,
  description: Schema.optional(Schema.String),
  gitRepoUrl: Schema.optional(Schema.String),
  tier: Schema.Literal("free", "pro", "enterprise"),
  createdAt: Schema.Date,
  updatedAt: Schema.Date
}) {}
```

### Branded Types

IDs are branded for type safety:

```typescript
export class ProjectId extends Schema.Brand<ProjectId>("ProjectId")<
  Schema.Schema.Type<typeof Schema.String>
>(Schema.String, {}) {}

// Usage
const id: ProjectId = Schema.decodeSync(ProjectId)("some-uuid")
```

### Tagged Errors

Errors are first-class values in Effect:

```typescript
export class ProjectNotFound extends Schema.TaggedError<ProjectNotFound>()(
  "ProjectNotFound",
  { projectId: ProjectId }
) {}

// Usage in services
Effect.fail(new ProjectNotFound({ projectId }))
```

### API Definitions

HTTP endpoints are defined using `@effect/platform`:

```typescript
export class ProjectsApi extends HttpApiGroup.make("projects")
  .add(
    HttpApiEndpoint.get("getById", "/projects/:id")
      .addError(ProjectNotFound, { status: 404 })
      .setSuccess(Project)
  )
  .add(
    HttpApiEndpoint.post("create", "/projects")
      .setPayload(CreateProjectInput)
      .setSuccess(Project)
  ) {}
```

## Building

```bash
# Build (from package root)
pnpm build

# Type check
pnpm check

# Run tests
pnpm test
```

## Adding New Models

1. Create a new file in `src/Models/`
2. Define the Schema class:

```typescript
import { Schema } from "effect"

export class MyEntity extends Schema.Class<MyEntity>("MyEntity")({
  id: MyEntityId,
  name: Schema.NonEmptyTrimmedString,
  createdAt: Schema.Date
}) {}

export class MyEntityId extends Schema.Brand<MyEntityId>("MyEntityId")<
  Schema.Schema.Type<typeof Schema.String>
>(Schema.String, {}) {}
```

3. Export from `src/index.ts`
4. Add API endpoints in `src/Api.ts` if needed

## Adding New Errors

1. Add to `src/Errors.ts`:

```typescript
export class MyEntityNotFound extends Schema.TaggedError<MyEntityNotFound>()(
  "MyEntityNotFound",
  { id: MyEntityId }
) {}
```

2. Export from `src/index.ts`
3. Use in API definitions and services

## Best Practices

1. **Keep it Pure**: No business logic in domain package, only data structures
2. **Immutability**: All models are immutable by default
3. **Type Safety**: Use branded types for all IDs
4. **Runtime Validation**: Effect Schema validates data at runtime
5. **Shared Contracts**: UI and API use the same types

## Dependencies

This package depends only on:
- `effect` - Core Effect library
- `@effect/platform` - HTTP API definitions
- `@effect/schema` - Schema definitions and validation

No cross-package dependencies with `api`, `ui`, or `cli`.

## License

MIT
