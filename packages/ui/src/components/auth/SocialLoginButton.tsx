import { GithubIcon } from "@/components/icons/GithubIcon"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { signIn } from "@/lib/auth-client"
import { useState } from "react"

interface SocialLoginButtonProps {
  onError: (error: string) => void
  disabled?: boolean
  mode: "login" | "signup"
}

export function SocialLoginButton({ disabled, mode, onError }: SocialLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGithubSignIn = async () => {
    onError("")
    setIsLoading(true)

    try {
      // Use full frontend URL for OAuth callback redirect
      const frontendUrl = window.location.origin
      await signIn.social({
        provider: "github",
        callbackURL: `${frontendUrl}/`
      })
    } catch (err) {
      console.error("GitHub login error:", err)
      onError(
        mode === "login"
          ? "Failed to sign in with GitHub. Please try again."
          : "Failed to sign up with GitHub. Please try again."
      )
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGithubSignIn}
        disabled={disabled || isLoading}
      >
        <GithubIcon className="mr-2 h-4 w-4" />
        Continue with GitHub
      </Button>

      <div className="relative my-4">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
          or {mode === "login" ? "continue" : "sign up"} with email
        </span>
      </div>
    </>
  )
}
