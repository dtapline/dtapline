/**
 * LoginScreen component
 *
 * Email/password login form rendered in the terminal using OpenTUI React.
 * Tab switches between fields. Enter submits. Shows error if login fails.
 */

import { useKeyboard } from "@opentui/react"
import { useCallback, useState } from "react"
import { signIn } from "../api-client.js"
import { saveSession } from "../auth.js"

interface LoginScreenProps {
  readonly serverUrl: string
  readonly onLogin: (token: string, email: string) => void
  readonly expiredMessage?: string
}

type Field = "email" | "password"

export function LoginScreen({ expiredMessage, onLogin, serverUrl }: LoginScreenProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [focused, setFocused] = useState<Field>("email")
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Email and password are required")
      setStatus("error")
      return
    }

    setStatus("loading")
    setErrorMessage("")

    try {
      const token = await signIn(serverUrl, email.trim(), password)
      saveSession(serverUrl, token, email.trim())
      onLogin(token, email.trim())
    } catch (err) {
      setStatus("error")
      setErrorMessage(err instanceof Error ? err.message : "Login failed")
    }
  }, [email, password, serverUrl, onLogin])

  useKeyboard((key) => {
    if (key.name === "tab") {
      setFocused((prev) => (prev === "email" ? "password" : "email"))
    }
    if (key.name === "return" || key.name === "enter") {
      void handleSubmit()
    }
  })

  const isLoading = status === "loading"

  return (
    <box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
    >
      <box
        flexDirection="column"
        border
        borderStyle="single"
        borderColor="#4a5568"
        padding={2}
        width={50}
        gap={1}
      >
        {/* Title */}
        <text fg="#e2e8f0">
          <strong>Dtapline Dashboard</strong>
        </text>
        <text fg="#718096">
          {serverUrl}
        </text>

        {/* Expired notice */}
        {expiredMessage && (
          <text fg="#f56565">
            {expiredMessage}
          </text>
        )}

        {/* Spacer */}
        <text></text>

        {/* Email field */}
        <text fg="#a0aec0">Email</text>
        <box
          border
          borderStyle="single"
          borderColor={focused === "email" ? "#63b3ed" : "#4a5568"}
          height={3}
          width={46}
        >
          <input
            placeholder="you@example.com"
            focused={focused === "email" && !isLoading}
            onInput={setEmail}
            onSubmit={() => setFocused("password")}
          />
        </box>

        {/* Password field */}
        <text fg="#a0aec0">Password</text>
        <box
          border
          borderStyle="single"
          borderColor={focused === "password" ? "#63b3ed" : "#4a5568"}
          height={3}
          width={46}
        >
          <input
            placeholder="••••••••"
            focused={focused === "password" && !isLoading}
            onInput={setPassword}
            onSubmit={() => void handleSubmit()}
          />
        </box>

        {/* Error message */}
        {status === "error" && <text fg="#f56565">{errorMessage}</text>}

        {/* Help text */}
        <text fg="#4a5568">
          {isLoading ? "Signing in..." : "[Tab] switch fields  [Enter] sign in"}
        </text>
      </box>
    </box>
  )
}
