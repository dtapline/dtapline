/**
 * App - root TUI component
 *
 * Auth gate: if no session token, shows LoginScreen.
 * Once authenticated, shows DashboardView with polling.
 * On session expiry, re-shows LoginScreen inline.
 */

import { useCallback, useState } from "react"
import { saveSession } from "./auth.js"
import { DashboardView } from "./components/DashboardView.js"
import { LoginScreen } from "./components/LoginScreen.js"
import { useMatrixData } from "./hooks/use-matrix-data.js"

interface AppProps {
  readonly serverUrl: string
  readonly initialToken: string | null
  readonly refreshInterval: number
  readonly onQuit: () => void
}

type AuthState =
  | { readonly kind: "login"; readonly expiredMessage?: string }
  | { readonly kind: "dashboard"; readonly token: string }

export function App({ initialToken, onQuit, refreshInterval, serverUrl }: AppProps) {
  const [auth, setAuth] = useState<AuthState>(
    initialToken
      ? { kind: "dashboard", token: initialToken }
      : { kind: "login" }
  )

  const handleLogin = useCallback((token: string, email: string) => {
    saveSession(serverUrl, token, email)
    setAuth({ kind: "dashboard", token })
  }, [serverUrl])

  const handleAuthExpired = useCallback(() => {
    setAuth({
      kind: "login",
      expiredMessage: "Session expired — please sign in again."
    })
  }, [])

  if (auth.kind === "login") {
    return (
      <LoginScreen
        serverUrl={serverUrl}
        onLogin={handleLogin}
        {...(auth.expiredMessage !== undefined && { expiredMessage: auth.expiredMessage })}
      />
    )
  }

  return (
    <DashboardContent
      serverUrl={serverUrl}
      token={auth.token}
      refreshInterval={refreshInterval}
      onAuthExpired={handleAuthExpired}
      onQuit={onQuit}
    />
  )
}

interface DashboardContentProps {
  readonly serverUrl: string
  readonly token: string
  readonly refreshInterval: number
  readonly onAuthExpired: () => void
  readonly onQuit: () => void
}

// Separate component so useMatrixData re-mounts cleanly when token changes
function DashboardContent({ onAuthExpired, onQuit, refreshInterval, serverUrl, token }: DashboardContentProps) {
  const { refresh, state } = useMatrixData({ refreshInterval, serverUrl, token })

  return (
    <DashboardView
      serverUrl={serverUrl}
      state={state}
      onRefresh={refresh}
      onAuthExpired={onAuthExpired}
      onQuit={onQuit}
    />
  )
}
