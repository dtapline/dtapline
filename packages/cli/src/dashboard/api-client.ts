/**
 * HTTP API client for the dashboard TUI
 *
 * Authenticates via Better Auth session cookie.
 * Uses HttpApiClient.make(DtaplineApi) to derive a fully typed client from
 * the shared domain API definition — no hand-written interfaces needed.
 */

import { DtaplineApi } from "@dtapline/domain/Api"
import type { Deployment } from "@dtapline/domain/Deployment"
import type { Environment } from "@dtapline/domain/Environment"
import { ProjectId } from "@dtapline/domain/Project"
import type { Project } from "@dtapline/domain/Project"
import type { Service } from "@dtapline/domain/Service"
import { HttpApiClient, HttpClient, HttpClientRequest } from "@effect/platform"
import { NodeHttpClient } from "@effect/platform-node"
import { Effect, Schema } from "effect"

export { type Deployment, type Environment, type Project, type Service }

export interface ProjectMatrix {
  readonly environments: ReadonlyArray<Environment>
  readonly services: ReadonlyArray<Service>
  readonly deployments: Record<string, Record<string, Deployment | null>>
}

export interface ProjectMatrixData {
  readonly project: Project
  readonly matrix: ProjectMatrix
}

// ============================================================================
// Error types
// ============================================================================

export class AuthExpiredError extends Error {
  readonly _tag = "AuthExpiredError"
  constructor() {
    super("Session expired or unauthorized")
    this.name = "AuthExpiredError"
  }
}

export class ApiError extends Error {
  readonly _tag = "ApiError"
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// ============================================================================
// Client factory
// ============================================================================

/**
 * Build a DtaplineApi client that authenticates via Better Auth session cookie.
 */
function makeSessionClient(serverUrl: string, token: string) {
  return HttpApiClient.make(DtaplineApi, {
    baseUrl: serverUrl,
    transformClient: HttpClient.mapRequest(
      HttpClientRequest.setHeader("Cookie", `better-auth.session_token=${token}`)
    )
  })
}

/**
 * Run an Effect that requires HttpClient with NodeHttpClient.layer provided,
 * translating 401/403 errors into AuthExpiredError and other failures into ApiError.
 */
async function runWithClient<A>(effect: Effect.Effect<A, unknown, HttpClient.HttpClient>): Promise<A> {
  const program = effect.pipe(
    Effect.provide(NodeHttpClient.layer)
  )
  const result = await Effect.runPromise(program as Effect.Effect<A, unknown, never>).catch((err) => {
    // Check for HttpClientError with status 401/403
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 401 || status === 403) {
      throw new AuthExpiredError()
    }
    throw new ApiError(err instanceof Error ? err.message : String(err))
  })
  return result
}

// ============================================================================
// Auth
// ============================================================================

export async function signIn(
  serverUrl: string,
  email: string,
  password: string
): Promise<string> {
  const url = `${serverUrl}/api/auth/sign-in/email`
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new ApiError(
      response.status === 401 ? "Invalid email or password" : `Sign-in failed: ${text}`,
      response.status
    )
  }

  // Extract session token from Set-Cookie header
  const setCookie = response.headers.get("set-cookie") ?? ""
  const match = setCookie.match(/better-auth\.session_token=([^;]+)/)
  if (!match || !match[1]) {
    // Fallback: try to read from response body
    const body = await response.json() as { token?: string }
    if (body.token) return body.token
    throw new ApiError("Could not extract session token from response")
  }

  return decodeURIComponent(match[1])
}

// ============================================================================
// Projects
// ============================================================================

export async function getProjects(
  serverUrl: string,
  token: string
): Promise<ReadonlyArray<Project>> {
  return runWithClient(
    Effect.gen(function*() {
      const client = yield* makeSessionClient(serverUrl, token)
      const result = yield* client.projects.listProjects({})
      return result.projects
    })
  )
}

// ============================================================================
// Matrix
// ============================================================================

export async function getMatrix(
  serverUrl: string,
  token: string,
  projectId: string
): Promise<ProjectMatrix> {
  return runWithClient(
    Effect.gen(function*() {
      const client = yield* makeSessionClient(serverUrl, token)
      return yield* client.projects.getMatrix({
        path: { projectId: Schema.decodeSync(ProjectId)(projectId) }
      })
    })
  )
}
