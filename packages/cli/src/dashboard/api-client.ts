/**
 * HTTP API client for the dashboard TUI
 *
 * Authenticates via Better Auth session cookie.
 * Fetches projects list and per-project deployment matrices.
 */

import type { Deployment, Environment, Project, ProjectMatrix, Service } from "./types.js"

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

async function apiFetch<T>(
  serverUrl: string,
  token: string,
  path: string
): Promise<T> {
  const url = `${serverUrl}${path}`
  const response = await fetch(url, {
    headers: {
      "Cookie": `better-auth.session_token=${token}`,
      "Content-Type": "application/json"
    }
  })

  if (response.status === 401 || response.status === 403) {
    throw new AuthExpiredError()
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new ApiError(`HTTP ${response.status}: ${text}`, response.status)
  }

  return response.json() as Promise<T>
}

interface ProjectsResponse {
  projects: Array<{
    id: string
    name: string
    description?: string | null
  }>
}

interface MatrixResponse {
  environments: Array<{
    id: string
    name: string
    slug: string
    color: string
    order: number
  }>
  services: Array<{
    id: string
    name: string
    slug: string
    repositoryUrl?: string | null
  }>
  deployments: Record<
    string,
    Record<
      string,
      {
        id: string
        version: string
        status: string
        deployedAt: string
        environmentId: string
        serviceId: string
      } | null
    >
  >
}

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

export async function getProjects(
  serverUrl: string,
  token: string
): Promise<ReadonlyArray<Project>> {
  const data = await apiFetch<ProjectsResponse>(serverUrl, token, "/api/v1/projects")
  return data.projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null
  }))
}

export async function getMatrix(
  serverUrl: string,
  token: string,
  projectId: string
): Promise<ProjectMatrix> {
  const data = await apiFetch<MatrixResponse>(
    serverUrl,
    token,
    `/api/v1/projects/${projectId}/matrix`
  )

  const environments: ReadonlyArray<Environment> = data.environments.map((e) => ({
    id: e.id,
    name: e.name,
    slug: e.slug,
    color: e.color,
    order: e.order
  }))

  const services: ReadonlyArray<Service> = data.services.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    repositoryUrl: s.repositoryUrl ?? null
  }))

  const deployments: Record<string, Record<string, Deployment | null>> = {}
  for (const [envId, serviceMap] of Object.entries(data.deployments)) {
    deployments[envId] = {}
    for (const [serviceId, dep] of Object.entries(serviceMap)) {
      if (dep === null) {
        deployments[envId]![serviceId] = null
      } else {
        deployments[envId]![serviceId] = {
          id: dep.id,
          version: dep.version,
          status: dep.status as Deployment["status"],
          deployedAt: dep.deployedAt,
          environmentId: dep.environmentId,
          serviceId: dep.serviceId
        }
      }
    }
  }

  return { environments, services, deployments }
}
