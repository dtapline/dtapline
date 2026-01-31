# Agent Guidelines for Cloud Matrix

Effect-TS monorepo: domain (Effect core), server (Effect Platform), ui (React + TanStack Router + Tailwind)

**Package manager:** `pnpm` (v9.10.0)

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

## Detailed Guides

- [Commands Reference](docs/commands.md) - All build, test, lint commands
- [TypeScript Style Guide](docs/typescript-style.md) - Formatting, imports, naming, types
- [Effect Patterns](docs/effect-patterns.md) - Services, errors, schemas, dependency injection
- [React Patterns](docs/react-patterns.md) - Components, styling, TanStack Router
- [Testing Guide](docs/testing.md) - Vitest patterns and structure

## Resources

- [Effect Documentation](https://effect.website/llms.txt)
- [TanStack Router](https://tanstack.com/router)
