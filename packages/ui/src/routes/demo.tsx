import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { signIn, useSession } from "../lib/auth-client"

export const Route = createFileRoute("/demo")({
  component: DemoRoute
})

/**
 * Demo route that automatically signs in as the demo user
 *
 * This provides a public demo experience without requiring users to create an account.
 * The demo user has read-only access to pre-seeded sample data.
 */
function DemoRoute() {
  const { data: session, isPending } = useSession()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasAttempted, setHasAttempted] = useState(false)

  useEffect(() => {
    // If already logged in as demo user, redirect to dashboard
    if (session?.user?.email === "demo@dtapline.com") {
      window.location.href = "/"
      return
    }

    // If logged in as different user, show message
    if (session?.user) {
      return
    }

    // Only attempt sign-in once
    if (hasAttempted) {
      return
    }

    // Auto sign-in as demo user
    const autoSignIn = async () => {
      if (isSigningIn || isPending) return

      setIsSigningIn(true)
      setHasAttempted(true)
      setError(null)

      try {
        const result = await signIn.email({
          email: "demo@dtapline.com",
          password: "demodemo"
        })

        if (result.error) {
          setError(result.error.message || "Failed to sign in to demo. The demo user may not be set up yet.")
          setIsSigningIn(false)
          return
        }

        // Redirect to dashboard after successful sign-in
        window.location.href = "/"
      } catch {
        setError("Failed to sign in to demo. Please try again.")
        setIsSigningIn(false)
      }
    }

    autoSignIn()
  }, [session, isPending, isSigningIn, hasAttempted])

  // Show loading state
  if (isPending || isSigningIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto">
          </div>
          <p className="text-lg text-muted-foreground">Loading demo...</p>
        </div>
      </div>
    )
  }

  // Show error if sign-in failed
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md rounded-lg border bg-card p-6 text-center">
          <h1 className="mb-2 text-xl font-bold text-destructive">Demo Unavailable</h1>
          <p className="mb-4 text-muted-foreground">{error}</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Make sure you've run the seed script: <code className="bg-muted px-2 py-1 rounded">pnpm seed:demo</code>
          </p>
          <div className="flex gap-2 justify-center">
            <a
              href="/"
              className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              Go to Home
            </a>
            <button
              onClick={() => window.location.reload()}
              className="inline-block rounded-md border px-4 py-2 hover:bg-muted"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show message if logged in as different user
  if (session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md rounded-lg border bg-card p-6 text-center">
          <h1 className="mb-2 text-xl font-bold">Already Logged In</h1>
          <p className="mb-4 text-muted-foreground">
            You're currently logged in as <strong>{session.user.email}</strong>.
            <br />
            To view the demo, please sign out first.
          </p>
          <div className="flex gap-2 justify-center">
            <a
              href="/"
              className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }

  return null
}
