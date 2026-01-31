# CloudMatrix - Deployment Tracking Dashboard

Visualize and track deployments across environments in a 2D matrix. Effect-TS backend + React UI + CLI for CI/CD integration.

**Tech Stack:** Effect-TS, MongoDB, React 19, TanStack Router, Tailwind CSS  
**Package Manager:** `pnpm` (v9.10.0)

## Quick Start

```bash
# Start backend (requires MongoDB running)
cd packages/server && pnpm dev

# Start frontend
cd packages/ui && pnpm dev

# Test CLI
cd packages/cli && node bin/cloudmatrix.js --help
```

**Prerequisites:** MongoDB running locally or Atlas connection. See [packages/server/README.md](packages/server/README.md) for setup.

## Essential Commands

```bash
pnpm build         # Build all packages
pnpm check         # Type check
pnpm test          # Run all tests
pnpm codegen       # Generate Effect exports (run after adding exports)
```

**Single test:** `pnpm vitest path/to/test.test.ts`

## Critical Rules

1. **ESM imports in Effect packages:** Use `.js` extensions in relative imports

   ```typescript
   import { TodosRepository } from "./TodosRepository.js" // Required!
   ```

2. **Effect error handling:** Never use try/catch. Use `Effect.catchTag` for tagged errors.

3. **Run codegen:** After adding new exports in domain/server packages, run `pnpm codegen`

4. **MongoDB null handling:** MongoDB stores optional fields as `null`, but Effect Schema expects `undefined`

   ```typescript
   // Document interface
   interface Document {
     field?: string | null  // Allow null from MongoDB
   }
   
   // Reading from DB (convert null → undefined)
   const entity = {
     field: doc.field ?? undefined
   }
   
   // Writing to DB (convert undefined → null)
   const document = {
     field: input.field ?? null
   }
   ```
   
   This pattern is applied in all 6 repositories. See any repository for examples.

## Security

- **Gitleaks** runs on pre-push hook automatically to prevent secrets from being committed
- Never commit secrets (API keys, MongoDB URIs, etc.)
- Run `pnpm gitleaks:staged` before committing sensitive changes
- Custom rules defined in [.gitleaks.toml](.gitleaks.toml)

## Detailed Guides

- [Commands Reference](docs/commands.md) - All build, test, lint commands
- [TypeScript Style Guide](docs/typescript-style.md) - Formatting, imports, naming, types
- [Effect Patterns](docs/effect-patterns.md) - Services, errors, schemas, dependency injection
- [React Patterns](docs/react-patterns.md) - Components, styling, TanStack Router
- [Testing Guide](docs/testing.md) - Vitest patterns and structure

## Resources

- [Effect Documentation](https://effect.website/llms.txt)
- [TanStack Router](https://tanstack.com/router)
