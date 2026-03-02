---
"@dtapline/cli": minor
---

Refactor CLI to use `@dtapline/domain` as the single source of truth for API schemas via `HttpApiClient.make(DtaplineApi)`.

- Replace hand-written `DeploymentResponse` schema and manual `HttpClientRequest` plumbing in `src/index.ts` with a typed client derived from `DtaplineApi`
- Replace raw `fetch()` calls and local `ProjectsResponse`/`MatrixResponse` interfaces in `src/dashboard/api-client.ts` with `HttpApiClient.make(DtaplineApi)`
- Remove duplicate domain type definitions from `src/dashboard/types.ts`; re-export `Environment`, `Service`, `Deployment`, `Project`, `ProjectMatrix`, `ProjectMatrixData` from the domain package
- Move `@dtapline/domain` from `devDependencies` to `dependencies`
