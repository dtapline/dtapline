/**
 * DashboardView component
 *
 * Main dashboard: Header + Matrix with the deployment data.
 * Handles loading, error, and data states.
 * Wires up keyboard shortcuts: r=refresh, q=quit.
 */

import { useKeyboard } from "@opentui/react"
import type { DataState } from "../types.js"
import { Header } from "./Header.js"
import { Matrix } from "./Matrix.js"

interface DashboardViewProps {
  readonly serverUrl: string
  readonly state: DataState
  readonly onRefresh: () => void
  readonly onAuthExpired: () => void
  readonly onQuit: () => void
}

export function DashboardView({
  onAuthExpired,
  onQuit,
  onRefresh,
  serverUrl,
  state
}: DashboardViewProps) {
  useKeyboard((key) => {
    if (key.name === "r") {
      onRefresh()
    }
    if (key.name === "q") {
      onQuit()
    }
  })

  // Trigger auth re-prompt if auth expired
  if (state.kind === "error" && state.authExpired) {
    onAuthExpired()
    return null
  }

  const isLoading = state.kind === "loading" || state.kind === "idle"
  const lastUpdated = state.kind === "data" ? state.lastUpdated : null

  return (
    <box flexDirection="column" style={{ flexGrow: 1 }}>
      <Header
        serverUrl={serverUrl}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
      />

      {state.kind === "idle" || state.kind === "loading" ?
        (
          <box
            style={{
              flexGrow: 1,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <text fg="#4a5568">Fetching deployment data…</text>
          </box>
        ) :
        state.kind === "error" ?
        (
          <box flexDirection="column" style={{ flexGrow: 1, padding: 2 }}>
            <text fg="#f56565">Error: {state.message}</text>
            <text fg="#4a5568">Press [r] to retry</text>
          </box>
        ) :
        <Matrix projects={state.projects} />}
    </box>
  )
}
