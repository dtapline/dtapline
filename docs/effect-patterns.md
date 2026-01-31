# Effect Patterns

## Domain Models (Effect Schema)

```typescript
// Domain models
export class Todo extends Schema.Class<Todo>("Todo")({
  id: TodoId,
  title: Schema.NonEmptyTrimmedString,
  completed: Schema.Boolean
}) {}

// Branded types
export class TodoId extends Schema.Brand<TodoId>("TodoId")<
  Schema.Schema.Type<typeof Schema.Number>
>(Schema.Number, {}) {}
```

## Error Handling

**Define tagged errors:**
```typescript
export class TodoNotFound extends Schema.TaggedError<TodoNotFound>()(
  "TodoNotFound",
  { id: TodoId }
) {}
```

**Return errors in Effect type:**
```typescript
getById(id: TodoId): Effect.Effect<Todo, TodoNotFound>
```

**Handle specific errors:**
```typescript
Effect.gen(function*() {
  return yield* todosRepo.getById(id)
}).pipe(
  Effect.catchTag("TodoNotFound", () => 
    Effect.succeed(/* fallback */)
  )
)
```

**Critical principles:**
- **Never use try/catch in Effect code**
- Errors are first-class values in Effect types
- Use `Schema.TaggedError` for domain errors
- Use `Effect.catchTag` for specific error handling
- Map errors to HTTP statuses in API definitions

## Effect Composition

**Generator syntax:**
```typescript
Effect.gen(function*() {
  const repo = yield* TodosRepository
  const todo = yield* repo.getById(id)
  return todo
})
```

**Always use `yield*` to unwrap Effect values**

## Services & Dependency Injection

**Service definition:**
```typescript
export class TodosRepository extends Effect.Service<TodosRepository>()(
  "TodosRepository",
  { /* dependencies */ }
) {}
```

**Layer composition:**
```typescript
export const TodosRepositoryLive = Layer.succeed(
  TodosRepository,
  TodosRepository.of({ /* implementation */ })
)
```

## API Definitions

```typescript
HttpApiEndpoint.get("getById", "/todos/:id")
  .addError(TodoNotFound, { status: 404 })
  .setSuccess(Todo)
```

## Workspace Dependencies

Use `workspace:^` for internal dependencies in package.json:
```json
{
  "dependencies": {
    "@cloud-matrix/domain": "workspace:^"
  }
}
```
