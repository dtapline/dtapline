# TypeScript Style Guide

## Formatting (dprint via ESLint)

- **Indent:** 2 spaces
- **Line width:** 120 characters
- **Semicolons:** ASI style (no semicolons)
- **Quotes:** Always double quotes
- **Trailing commas:** Never
- **Arrow functions:** Always use parentheses

## Import Statements

**Order:**
1. External library imports
2. Cross-package imports (`@dtapline/domain`)
3. Internal package imports (`@/` for UI, relative for Effect packages)
4. Type imports (use `import type`)

**Examples:**

```typescript
// Effect packages (domain, api)
import { Effect, Schema } from "effect"
import { HttpApiEndpoint } from "@effect/platform"
import { TodoNotFound } from "@dtapline/domain/TodosApi"
import { TodosRepository } from "./TodosRepository.js"  // .js extension required!
import type { Context } from "@effect/platform"

// UI package
import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ComponentProps } from "react"
```

**Key Rules:**
- Effect packages: `.js` extensions in relative imports (ESM requirement)
- UI package: `@/` for internal imports, no extensions
- Type imports: Always `import type` for type-only imports
- Newline after imports (enforced by ESLint)

## Naming Conventions

**Files:**
- Components/Classes: `PascalCase.tsx` or `TodosRepository.ts`
- Utils/helpers: `camelCase.ts` (e.g., `utils.ts`)
- Tests: `*.test.ts`

**Code:**
- Functions: `camelCase` (e.g., `getById`, `createTodo`)
- Components: `PascalCase` (e.g., `AppSidebar`, `Button`)
- Classes: `PascalCase` (e.g., `TodosRepository`, `Todo`)
- Variables: `camelCase`
- Types/Interfaces: `PascalCase`
- Unused params: Prefix with `_` (e.g., `_ctx`, `_req`)

## Type Definitions

**Array types:** Use `Array<T>` not `T[]` (enforced by ESLint)

**Type imports:** Use `import type` for type-only imports

**Const assertions:** Use `as const` for immutable objects

**Prefer inference:** Avoid explicit types where TypeScript can infer clearly

## Object and Array Handling

- Object shorthand: `{ id }` not `{ id: id }`
- Sort destructured keys (enforced by ESLint)
- No spread in Array.push (restricted by ESLint)
