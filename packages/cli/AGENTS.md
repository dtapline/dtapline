# CLI Package Guidelines

Command-line tool for reporting deployments from CI/CD pipelines.

## Quick Start

```bash
# Install dependencies (from root)
pnpm install

# Build
pnpm build

# Test locally
node bin/dtapline.js deploy production api-gateway abc123 \
  --api-key YOUR_API_KEY \
  --server-url http://localhost:3000
```

## Installation

### For Local Testing
```bash
cd packages/cli
pnpm build
node bin/dtapline.js --help
```

### For CI/CD (Global Install)
```bash
npm install -g @dtapline/cli
dtapline deploy ...
```

## Usage

### Basic Command
```bash
dtapline deploy <environment> <service> <commitSha> \
  --api-key <api-key> \
  --server-url <url>
```

### With Optional Metadata
```bash
dtapline deploy production api-gateway a1b2c3d \
  --api-key cm_xxxxxxxxxxxxx \
  --server-url http://localhost:3000 \
  --git-tag v1.5.0 \
  --deployed-by "Azure Pipelines" \
  --status success \
  --build-url https://dev.azure.com/.../builds/123 \
  --release-notes "Fixed critical bug"
```

### Using Environment Variable
```bash
export DTAPLINE_API_KEY=cm_xxxxxxxxxxxxx
dtapline deploy production api-gateway abc123
```

## Parameters

### Required
- `environment` - Environment name (e.g., dev, staging, production)
- `service` - Service name (e.g., api-gateway, web-frontend)
- `commitSha` - Git commit SHA
- `--api-key` - API key (or set `DTAPLINE_API_KEY` env var)

### Optional
- `--server-url` - Server URL (default: http://localhost:3000)
- `--deployed-version` - Version for this deployment (e.g., v1.2.3)
- `--git-tag` - Git tag (e.g., v1.2.3)
- `--pr-url` - Pull request URL
- `--deployed-by` - Who/what triggered the deployment
- `--status` - Status: success, failed, in_progress, rolled_back (default: success)
- `--build-url` - Build/CI pipeline URL
- `--release-notes` - Release notes or changelog

## CI/CD Integration

See [../../docs/cli-integration.md](../../docs/cli-integration.md) for detailed examples.

### Azure Pipelines
```yaml
- script: |
    npm install -g @dtapline/cli
    dtapline deploy \
      $(ENVIRONMENT) \
      $(SERVICE_NAME) \
      $(Build.SourceVersion) \
      --api-key $(DTAPLINE_API_KEY) \
      --server-url $(DTAPLINE_SERVER_URL) \
      --git-tag $(Build.SourceBranchName) \
      --deployed-by "Azure DevOps"
  displayName: 'Report Deployment'
```

### GitHub Actions
```yaml
- name: Report Deployment
  env:
    DTAPLINE_API_KEY: ${{ secrets.DTAPLINE_API_KEY }}
  run: |
    npm install -g @dtapline/cli
    dtapline deploy production my-service ${{ github.sha }} \
      --git-tag ${{ github.ref_name }}
```

## Adding Commands

The CLI uses `@effect/cli` for command parsing:

```typescript
// Define command
const myCommand = Command.make(
  "my-command",
  {
    arg1: Args.text({ name: "arg1" }),
    option1: Options.text("option1").pipe(Options.optional)
  },
  (args) =>
    Effect.gen(function*() {
      // Implementation
      yield* Console.log(`Received: ${args.arg1}`)
    })
)

// Add to root command
const rootCommand = Command.make("dtapline").pipe(
  Command.withSubcommands([deployCommand, myCommand])
)
```

### Key Patterns

**Required parameters**: Use `Args` for positional arguments
```typescript
const envArg = Args.text({ name: "environment" })
```

**Optional flags**: Use `Options.optional`
```typescript
const gitTagOption = Options.text("git-tag").pipe(Options.optional)
```

**With defaults**: Use `Options.withDefault`
```typescript
const statusOption = Options.choice("status", ["success", "failed"]).pipe(
  Options.withDefault("success" as const)
)
```

**Extract values**: Optional options return `Option<T>`, check with `Option.isSome`
```typescript
if (Option.isSome(args.gitTag)) {
  const tag = args.gitTag.value  // Extract value
}
```

## Project Structure

```
src/
└── index.ts          # Main CLI entry point

bin/
└── dtapline.js    # Executable wrapper

examples/
└── azure-pipelines.yml  # CI/CD integration example
```

## Building

```bash
# Build TypeScript
pnpm build

# Type check
pnpm check

# Watch mode
pnpm dev
```

Output goes to `dist/`.

## Testing

```bash
# Test help
node bin/dtapline.js --help

# Test deploy command
node bin/dtapline.js deploy production test-service abc123 \
  --api-key test \
  --server-url http://localhost:3000

# Test with invalid params (should show errors)
node bin/dtapline.js deploy
```

## Publishing

```bash
# Update version in package.json
npm version patch

# Publish to npm
npm publish
```

Users install with:
```bash
npm install -g @dtapline/cli
```

## Error Handling

The CLI shows clear errors:

### Invalid API Key
```
❌ Server returned status 401:
{"message":"Invalid API key","_tag":"InvalidApiKey"}
```

### Missing Parameters
```
Expected to find option: '--api-key'
```

### Network Errors
```
❌ Failed to report deployment:
RequestError: Transport error (POST http://localhost:3000/api/v1/deployments)
```

## Troubleshooting

### Command Not Found
After global install, restart terminal or run:
```bash
hash -r  # Refresh PATH cache
```

### API Connection Failed
1. Check server is running: `curl http://localhost:3000/api/v1/projects`
2. Verify API key is valid
3. Check `--server-url` flag matches your server

### Type Errors
Make sure to rebuild after changes:
```bash
pnpm build
```
