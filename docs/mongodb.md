# MongoDB Integration Patterns

## Connection Setup

### Local Development
```bash
# macOS with Homebrew
brew install mongodb-community
brew services start mongodb-community

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### MongoDB Atlas (Cloud)
1. Create cluster at https://www.mongodb.com/cloud/atlas
2. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/dtapline`
3. Add to `packages/api/.env`:
   ```
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dtapline
   ```

### Environment Variables
```bash
# packages/api/.env
MONGODB_URI=mongodb://localhost:27017/dtapline  # Local
# OR
MONGODB_URI=mongodb+srv://...                       # Atlas

PORT=3000
DEFAULT_USER_ID=default-user
```

## The Critical Null Handling Pattern

### The Problem
MongoDB stores optional fields as `null`, but Effect Schema's `optional` type expects `undefined` (or the field to be absent). This causes type errors:

```typescript
// ❌ This will fail!
interface Document {
  field?: string  // Schema expects: undefined or absent
}

// MongoDB returns:
{ field: null }  // Type error: null is not assignable to string | undefined
```

### The Solution
Always handle null ↔ undefined conversions at the MongoDB boundary:

#### 1. Document Interface (Allow `null`)
```typescript
interface ProjectDocument {
  id: string
  name: string
  description?: string | null  // ✅ Allow null from MongoDB
  gitRepoUrl?: string | null   // ✅ Allow null from MongoDB
  createdAt: Date
}
```

#### 2. Reading from DB (Convert `null` → `undefined`)
```typescript
const docToProject = (doc: ProjectDocument): Project => ({
  id: Schema.decodeSync(ProjectId)(doc.id),
  name: doc.name,
  description: doc.description ?? undefined,  // ✅ Convert null to undefined
  gitRepoUrl: doc.gitRepoUrl ?? undefined,    // ✅ Convert null to undefined
  createdAt: doc.createdAt
})
```

#### 3. Writing to DB (Convert `undefined` → `null`)
```typescript
const projectDoc: ProjectDocument = {
  id: crypto.randomUUID(),
  name: input.name,
  description: input.description ?? null,  // ✅ Convert undefined to null
  gitRepoUrl: input.gitRepoUrl ?? null,    // ✅ Convert undefined to null
  createdAt: new Date()
}

yield* Effect.tryPromise({
  try: () => collection.insertOne(projectDoc),
  catch: (error) => new DatabaseError({ message: String(error) })
})
```

### Complete Example
See any repository for the full pattern:
- [ProjectsRepository.ts](../packages/api/src/Repositories/ProjectsRepository.ts)
- [EnvironmentsRepository.ts](../packages/api/src/Repositories/EnvironmentsRepository.ts)
- [ServicesRepository.ts](../packages/api/src/Repositories/ServicesRepository.ts)
- [DeploymentsRepository.ts](../packages/api/src/Repositories/DeploymentsRepository.ts)
- [ApiKeysRepository.ts](../packages/api/src/Repositories/ApiKeysRepository.ts)
- [VersionPatternsRepository.ts](../packages/api/src/Repositories/VersionPatternsRepository.ts)

## Database Schema

### Collections

#### `projects`
```typescript
{
  _id: ObjectId,
  id: string,              // UUID
  userId: string,          // User who owns the project
  name: string,
  description?: string | null,
  gitRepoUrl?: string | null,
  tier: "free" | "pro" | "enterprise",
  createdAt: Date,
  updatedAt: Date
}
```

#### `environments`
```typescript
{
  _id: ObjectId,
  id: string,              // UUID
  projectId: string,       // References projects.id
  name: string,            // e.g., "production"
  displayName: string,     // e.g., "Production"
  color?: string | null,   // Hex color for UI
  order: number,           // Display order (0, 1, 2, ...)
  archived: boolean,
  createdAt: Date
}
```

#### `services`
```typescript
{
  _id: ObjectId,
  id: string,              // UUID
  projectId: string,       // References projects.id
  name: string,            // e.g., "api-gateway"
  displayName: string,     // e.g., "API Gateway"
  repositoryUrl?: string | null,
  archived: boolean,
  createdAt: Date
}
```

#### `deployments`
```typescript
{
  _id: ObjectId,
  id: string,                   // UUID
  projectId: string,            // References projects.id
  environmentId: string,        // References environments.id
  serviceId: string,            // References services.id
  version: string,              // Extracted version (e.g., "1.2.3")
  commitSha: string,
  gitTag?: string | null,
  pullRequestUrl?: string | null,
  deployedBy?: string | null,
  deployedAt: Date,
  status: "success" | "failed" | "in_progress" | "rolled_back",
  buildUrl?: string | null,
  releaseNotes?: string | null,
  metadata?: Record<string, unknown> | null
}
```

#### `apiKeys`
```typescript
{
  _id: ObjectId,
  id: string,                   // UUID
  projectId: string,            // References projects.id
  keyHash: string,              // bcrypt hash of the key
  keyPrefix: string,            // First 8 chars for display (e.g., "cm_abc12")
  name: string,                 // Human-readable name
  scopes: Array<"deployments:write" | "deployments:read" | "admin">,
  createdAt: Date,
  lastUsedAt?: Date | null,
  expiresAt?: Date | null
}
```

#### `versionPatterns`
```typescript
{
  _id: ObjectId,
  id: string,                   // UUID
  projectId: string,            // References projects.id
  defaultPattern: string,       // Regex pattern (e.g., "v?(\\d+\\.\\d+\\.\\d+)")
  servicePatterns?: Record<string, string> | null,  // Per-service overrides
  updatedAt: Date
}
```

## Indexes

### Critical for Performance
```javascript
// Deployments - queries by project + environment + service
db.deployments.createIndex({ projectId: 1, environmentId: 1, serviceId: 1 })
db.deployments.createIndex({ projectId: 1, deployedAt: -1 })

// Environments/Services - unique name per project
db.environments.createIndex({ projectId: 1, name: 1 }, { unique: true })
db.services.createIndex({ projectId: 1, name: 1 }, { unique: true })

// API Keys - lookup by project
db.apiKeys.createIndex({ projectId: 1 })

// Projects - lookup by user
db.projects.createIndex({ userId: 1 })
```

## Connection Pooling

### For Lambda (packages/api/src/Layers.ts)
```typescript
const MongoClientLive = Layer.scoped(
  MongoClient.Tag,
  Effect.gen(function*() {
    const client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,  // Smaller pool for Lambda
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000
    })
    
    yield* Effect.addFinalizer(() => 
      Effect.promise(() => client.close())
    )
    
    yield* Effect.promise(() => client.connect())
    return client
  })
)
```

### For Traditional Server (same file)
```typescript
const client = new MongoClient(MONGODB_URI, {
  maxPoolSize: 100,  // Larger pool for long-running server
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000
})
```

## Common Queries

### Get Latest Deployment per Environment/Service
```typescript
// This is what the matrix endpoint does
const pipeline = [
  { $match: { projectId } },
  { $sort: { deployedAt: -1 } },
  {
    $group: {
      _id: { environmentId: "$environmentId", serviceId: "$serviceId" },
      latestDeployment: { $first: "$$ROOT" }
    }
  }
]

const results = await deployments.aggregate(pipeline).toArray()
```

### Find Deployments by Date Range
```typescript
const startDate = new Date("2026-01-01")
const endDate = new Date("2026-01-31")

const deployments = yield* Effect.tryPromise({
  try: () =>
    collection
      .find({
        projectId,
        deployedAt: { $gte: startDate, $lte: endDate }
      })
      .sort({ deployedAt: -1 })
      .toArray(),
  catch: (error) => new DatabaseError({ message: String(error) })
})
```

### Get Environment by Name (with Auto-Create)
```typescript
// First try to find existing
const existing = yield* Effect.tryPromise({
  try: () => collection.findOne({ projectId, name }),
  catch: (error) => new DatabaseError({ message: String(error) })
})

if (existing) {
  return docToEnvironment(existing)
}

// Create if not found
const newEnv: EnvironmentDocument = {
  id: crypto.randomUUID(),
  projectId,
  name,
  displayName: name.charAt(0).toUpperCase() + name.slice(1),
  color: null,  // ✅ Use null for optional fields
  order: nextOrder,
  archived: false,
  createdAt: new Date()
}

yield* Effect.tryPromise({
  try: () => collection.insertOne(newEnv),
  catch: (error) => new DatabaseError({ message: String(error) })
})

return docToEnvironment(newEnv)
```

## Error Handling

All MongoDB operations use Effect error handling:

```typescript
yield* Effect.tryPromise({
  try: () => collection.findOne({ id }),
  catch: (error) => new DatabaseError({ 
    message: `Failed to find document: ${String(error)}` 
  })
})
```

Never use try/catch - always wrap in `Effect.tryPromise`:
- `try` - The async operation
- `catch` - Convert JS error to tagged Effect error

## Testing MongoDB Operations

Use in-memory MongoDB for tests:
```typescript
import { MongoMemoryServer } from "mongodb-memory-server"

const mongod = await MongoMemoryServer.create()
const uri = mongod.getUri()

// Use this URI in tests
process.env.MONGODB_URI = uri
```

## Troubleshooting

### Connection Issues
```bash
# Check if MongoDB is running
pnpm --filter @dtapline/api check-mongo

# View MongoDB logs
brew services list
tail -f /usr/local/var/log/mongodb/mongo.log
```

### Type Errors with Optional Fields
If you see: `Type 'null' is not assignable to type 'string | undefined'`
- Check document interface has `| null`
- Check converter uses `?? undefined` when reading
- Check creation uses `?? null` when writing

### Slow Queries
- Add indexes for frequently queried fields
- Use `explain()` to analyze query plans:
  ```javascript
  db.deployments.find({ projectId: "..." }).explain("executionStats")
  ```
