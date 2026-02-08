# Dtapline Server

Backend API server for Dtapline deployment tracking system.

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

**Note:** If using MongoDB Atlas, the `socks` package is automatically installed for SOCKS5 proxy support.

### 2. Set Up MongoDB

Choose one option:

#### Option A: Local MongoDB (Recommended for Development)

```bash
# macOS with Homebrew
brew install mongodb-community
brew services start mongodb-community

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### Option B: MongoDB Atlas (Cloud)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get your connection string

### 3. Configure Environment Variables

```bash
cp .env.example .env
# Edit .env and update MONGODB_URI if needed
```

Default `.env` uses local MongoDB: `mongodb://localhost:27017/dtapline`

### 4. Verify MongoDB Connection

```bash
pnpm check-mongo
```

You should see: `✅ MongoDB is accessible!`

### 5. Start the Server

```bash
pnpm dev
```

The server will start on http://localhost:3000

## Environment Variables

See `.env.example` for all available configuration options:

- `MONGODB_URI` - MongoDB connection string (required)
- `DEFAULT_USER_ID` - User ID for MVP (default: "default-user")
- `DEFAULT_USER_EMAIL` - User email for display
- `DEFAULT_USER_NAME` - User name for display
- `PORT` - Server port (default: 3000)

## Testing the API

```bash
# Health check (if implemented)
curl http://localhost:3000/health

# Create a project
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My First Project"}'

# List projects
curl http://localhost:3000/api/v1/projects
```

## Development

```bash
# Start dev server with auto-reload
pnpm dev

# Run type checking
pnpm check

# Run tests
pnpm test

# Build for production
pnpm build
```

## Troubleshooting

### MongoDB Connection Failed

If you see `❌ Cannot connect to MongoDB`:

1. **Check if MongoDB is running:**
   ```bash
   pnpm check-mongo
   ```

2. **For local MongoDB:**
   ```bash
   # macOS
   brew services list
   brew services start mongodb-community
   
   # Docker
   docker ps
   docker start mongodb
   ```

3. **Check your `.env` file:**
   - Make sure `MONGODB_URI` is set correctly
   - For local: `mongodb://localhost:27017/dtapline`
   - For Atlas: `mongodb+srv://user:pass@cluster.mongodb.net/dtapline`

### Port Already in Use

If port 3000 is already in use, either:
- Stop the other process using port 3000
- Change the `PORT` in `.env`

## API Documentation

The API implements the Dtapline HTTP API specification defined in `@dtapline/domain/Api`.

Main endpoint groups:
- `/api/v1/projects` - Project management
- `/api/v1/projects/:id/environments` - Environment management
- `/api/v1/projects/:id/services` - Service management
- `/api/v1/projects/:id/deployments` - Deployment history
- `/api/v1/projects/:id/matrix` - Deployment matrix view
- `/api/v1/webhooks/deployments` - Webhook for CI/CD integration

## Architecture

- **Effect-TS** - Functional programming and dependency injection
- **MongoDB** - Document database with connection pooling
- **HTTP API Builder** - Type-safe API routing from `@effect/platform`
- **AWS Lambda Ready** - Optimized for serverless deployment

## Deployment

### AWS Lambda

Use the `lambda.ts` handler for AWS Lambda deployment:

```typescript
import { handler } from "./lambda.js"

export { handler }
```

### Traditional Server

The `server.ts` file runs as a standalone Node.js HTTP server.

## License

MIT