import { SocialLoginButton } from "@/components/auth/SocialLoginButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn, useSession } from "@/lib/auth-client"
import { useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"

export default function LoginPage() {
  const navigate = useNavigate()
  const { data: session, refetch } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Redirect if session becomes available
  useEffect(() => {
    if (session) {
      navigate({ to: "/" })
    }
  }, [session, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await signIn.email({
        email,
        password
      })

      console.log("Login result:", result)

      if (result.error) {
        setError(result.error.message || "Invalid email or password")
        setIsLoading(false)
        return
      }

      // Success - manually refetch session to update the cache
      await refetch()
      // Navigation will happen via useEffect when session updates
    } catch (err) {
      console.error("Login error:", err)
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  const handleSocialError = (errorMessage: string) => {
    setError(errorMessage)
  }

  // Check if social login is disabled (enabled by default)
  const isSocialLoginDisabled = import.meta.env.VITE_DISABLE_SOCIAL_LOGIN === "true"

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to Dtapline</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSocialLoginDisabled && (
            <SocialLoginButton
              mode="login"
              onError={handleSocialError}
              disabled={isLoading}
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don't have an account?{" "}
            <a href="/signup" className="text-primary hover:underline">
              Sign up
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
