/**
 * Shared types for the dashboard TUI
 */

export interface AuthSession {
  readonly token: string
  readonly email: string
  readonly savedAt: string
}

export interface AuthConfig {
  readonly sessions: Record<string, AuthSession>
}

export interface Environment {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly color: string
  readonly order: number
}

export interface Service {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly repositoryUrl?: string | null
}

export interface Deployment {
  readonly id: string
  readonly version: string
  readonly status: "success" | "failed" | "in_progress" | "rolled_back"
  readonly deployedAt: string
  readonly environmentId: string
  readonly serviceId: string
}

export interface ProjectMatrix {
  readonly environments: ReadonlyArray<Environment>
  readonly services: ReadonlyArray<Service>
  readonly deployments: Record<string, Record<string, Deployment | null>>
}

export interface Project {
  readonly id: string
  readonly name: string
  readonly description?: string | null
}

export interface ProjectMatrixData {
  readonly project: Project
  readonly matrix: ProjectMatrix
}

export type DataState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string; readonly authExpired: boolean }
  | { readonly kind: "data"; readonly projects: ReadonlyArray<ProjectMatrixData>; readonly lastUpdated: Date }
