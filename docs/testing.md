# Testing Guide

## Framework

`@effect/vitest` for all packages

## Test Structure

```typescript
import { describe, expect, it } from "@effect/vitest"

describe("TodosRepository", () => {
  it("should create a todo", () => {
    // Arrange
    const todo = { title: "Test", completed: false }
    
    // Act
    const result = createTodo(todo)
    
    // Assert
    expect(result.title).toBe("Test")
  })
})
```

## Location & Naming

- Tests: `packages/*/test/` directory
- Naming: `*.test.ts`

## Configuration

- Shared config: `vitest.shared.ts`
- Package configs: `packages/*/vitest.config.ts`
- Workspace config: `vitest.workspace.ts`
