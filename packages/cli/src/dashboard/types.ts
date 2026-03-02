/**
 * UI-specific types for the dashboard TUI
 *
 * Domain types are re-exported from api-client.ts which sources them
 * directly from @dtapline/domain.
 */

import type { ProjectMatrixData } from "./api-client.js"

export type { Deployment, Environment, Project, ProjectMatrix, ProjectMatrixData, Service } from "./api-client.js"

export interface AuthSession {
  readonly token: string
  readonly email: string
  readonly savedAt: string
}

export interface AuthConfig {
  readonly sessions: Record<string, AuthSession>
}

export type DataState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string; readonly authExpired: boolean }
  | { readonly kind: "data"; readonly projects: ReadonlyArray<ProjectMatrixData>; readonly lastUpdated: Date }
