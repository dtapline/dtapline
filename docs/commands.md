# Commands Reference

## Root Level Commands

```bash
# Build & Check
pnpm build              # Build all packages
pnpm check              # Type check all packages
pnpm check-recursive    # Type check each package individually
pnpm clean              # Clean build artifacts

# Code Quality
pnpm lint               # Lint all packages
pnpm lint-fix           # Auto-fix linting issues

# Testing
pnpm test               # Run all tests (vitest workspace)
pnpm coverage           # Run tests with coverage

# Code Generation
pnpm codegen            # Generate Effect exports/index files
```

## Package-Specific Commands

```bash
# Run in specific package
pnpm --filter @dtapline/domain build
pnpm --filter @dtapline/server test

# Or cd into package
cd packages/domain
pnpm build
pnpm test
pnpm check
```

## Running Single Tests

```bash
# Specific test file
pnpm vitest packages/domain/test/Dummy.test.ts

# Pattern matching
pnpm vitest packages/server/test/TodosRepository.test.ts

# Watch mode
pnpm vitest packages/domain/test/Dummy.test.ts --watch

# Test name pattern
pnpm vitest -t "should create todo"
```

## UI Development

```bash
cd packages/ui
pnpm dev        # Start dev server
pnpm build      # Build for production
pnpm preview    # Preview production build
```
