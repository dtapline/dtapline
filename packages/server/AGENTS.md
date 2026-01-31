# Server Package Guidelines

HTTP API server with MongoDB for CloudMatrix deployment tracking.

## Quick Start

```bash
# Install dependencies (from root)
pnpm install

# Set up environment
cp .env.example .env
# Edit .env and set MONGODB_URI

# Check MongoDB connection
pnpm check-mongo

# Start dev server
pnpm dev
```

Server runs on http://localhost:3000

## Environment Variables

Required in `.env`:
```bash
MONGODB_URI=mongodb://localhost:27017/cloudmatrix
PORT=3000
DEFAULT_USER_ID=default-user
DEFAULT_USER_EMAIL=dev@cloudmatrix.io
DEFAULT_USER_NAME=Developer
```

See [README.md](./README.md) for MongoDB setup instructions.

## Project Structure

```
src/
├── Api/              # HTTP endpoint groups
│   ├── ProjectsGroup.ts
│   ├── EnvironmentsGroup.ts
│   ├── ServicesGroup.ts
│   ├── DeploymentsWebhookGroup.ts
│   └── ...
├── Repositories/     # MongoDB data access
│   ├── ProjectsRepository.ts
│   ├── EnvironmentsRepository.ts
│   └── ...
├── Services/         # Business logic
│   ├── DeploymentService.ts
│   ├── ComparisonService.ts
│   └── VersionPatternService.ts
├── Layers.ts         # Dependency injection
├── server.ts         # Traditional Node.js server
└── lambda.ts         # AWS Lambda handler
```

## Adding New Endpoints

1. Define endpoint in `packages/domain/src/Api.ts`
2. Implement handler in appropriate group file
3. See [../../docs/effect-patterns.md](../../docs/effect-patterns.md#api-endpoints)

Example:
```typescript
// In ApiGroup.ts
return handlers.handle("myEndpoint", ({ payload }) =>
  Effect.gen(function*() {
    const repo = yield* MyRepository
    return yield* repo.doSomething(payload)
  })
)
```

## Adding Repositories

Follow the pattern in existing repositories:

```typescript
// 1. Define interface
export interface MyRepository {
  readonly create: (input: CreateInput) => Effect.Effect<Entity, DatabaseError>
}

// 2. Create tag
export const MyRepository = Context.GenericTag<MyRepository>("MyRepository")

// 3. Implement as Layer
export const MyRepositoryLive = Layer.effect(
  MyRepository,
  Effect.gen(function*() {
    const db = yield* MongoDatabase
    const collection = db.collection<MyDocument>("myCollection")
    
    return MyRepository.of({
      create: (input) => Effect.gen(function*() {
        // Remember the null handling pattern!
        const doc: MyDocument = {
          id: crypto.randomUUID(),
          field: input.field ?? null  // ✅ undefined → null
        }
        
        yield* Effect.tryPromise({
          try: () => collection.insertOne(doc),
          catch: (error) => new DatabaseError({ message: String(error) })
        })
        
        return docToEntity(doc)
      })
    })
  })
)
```

## MongoDB Patterns

**Critical:** Always handle null ↔ undefined conversions.

See [../../docs/mongodb.md](../../docs/mongodb.md) for:
- The null handling pattern
- Schema design
- Indexes
- Common queries
- Connection pooling

## Testing

```bash
# Run tests
pnpm test

# Run specific test
pnpm vitest src/Repositories/ProjectsRepository.test.ts

# Watch mode
pnpm vitest --watch
```

## Building

```bash
# Build for production
pnpm build

# Type check
pnpm check

# Generate Effect exports
pnpm codegen
```

## Deployment

### AWS Lambda
Use `src/lambda.ts` as the handler. Optimized for serverless with connection pooling.

### Traditional Server
Use `src/server.ts`. Run with PM2 or systemd.

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build
CMD ["node", "dist/server.js"]
```

## Troubleshooting

### MongoDB Connection Failed
```bash
pnpm check-mongo
```
See [README.md](./README.md#troubleshooting) for solutions.

### Type Errors
If you see: `Type 'null' is not assignable to type 'string | undefined'`
- You forgot the null handling pattern
- See [../../docs/mongodb.md](../../docs/mongodb.md#the-critical-null-handling-pattern)
