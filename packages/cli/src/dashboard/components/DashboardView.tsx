/**
 * DashboardView component
 *
 * Main dashboard: Header + Matrix with the deployment data.
 * Handles loading, error, and data states.
 * Wires up keyboard shortcuts: r=refresh, q=quit.
 */

import { useKeyboard } from "@opentui/react"
import { useEffect } from "react"
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
  // Note: LoginScreen and DashboardView are never mounted at the same time (App
  // renders one or the other). If that assumption ever changes, having two
  // useKeyboard hooks active simultaneously can cause conflicts — see OpenTUI
  // react/gotchas.md for the resolution pattern.
  useKeyboard((key) => {
    if (key.name === "r") {
      onRefresh()
    }
    if (key.name === "q") {
      onQuit()
    }
  })

  // Trigger auth re-prompt when auth expires. Done in useEffect to avoid
  // calling setState on a parent component during render (React anti-pattern).
  useEffect(() => {
    if (state.kind === "error" && state.authExpired) {
      onAuthExpired()
    }
  }, [state, onAuthExpired])

  if (state.kind === "error" && state.authExpired) {
    return null
  }

  const isLoading = state.kind === "loading" || state.kind === "idle"
  const lastUpdated = state.kind === "data" ? state.lastUpdated : null

  return (
    <box flexDirection="column" flexGrow={1}>
      <Header
        serverUrl={serverUrl}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
      />

      {state.kind === "idle" || state.kind === "loading" ?
        (
          <box
            flexGrow={1}
            alignItems="center"
            justifyContent="center"
          >
            <text fg="#4a5568">Fetching deployment data…</text>
          </box>
        ) :
        state.kind === "error" ?
        (
          <box flexDirection="column" flexGrow={1} padding={2}>
            <text fg="#f56565">Error: {state.message}</text>
            <text fg="#4a5568">Press [r] to retry</text>
          </box>
        ) :
        <Matrix projects={state.projects} />}
    </box>
  )
}
