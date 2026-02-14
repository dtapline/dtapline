import { createAuthClient } from "better-auth/react"

/**
 * Better Auth client for the UI
 *
 * Handles all authentication operations:
 * - Sign in with email/password
 * - Sign up with email/password
 * - OAuth (GitHub, Google, etc.)
 * - Session management
 * - Sign out
 *
 * Uses direct API URL with CORS for cross-origin requests.
 * Cookies will be sent with credentials: "include".
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  // Fetch credentials to include cookies
  fetchOptions: {
    credentials: "include"
  }
})

/**
 * React hooks for authentication
 *
 * Usage:
 * ```tsx
 * import { useSession } from '@/lib/auth-client'
 *
 * function MyComponent() {
 *   const { data: session, isPending, refetch } = useSession()
 *
 *   if (isPending) return <div>Loading...</div>
 *   if (!session) return <div>Not logged in</div>
 *
 *   return <div>Hello {session.user.name}</div>
 * }
 * ```
 */
export const {
  signIn,
  signOut,
  signUp,
  useSession
} = authClient
