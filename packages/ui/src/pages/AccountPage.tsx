import { GithubIcon } from "@/components/icons/GithubIcon"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  changePassword,
  deleteUser,
  linkSocial,
  listAccounts,
  unlinkAccount,
  updateUser,
  useSession
} from "@/lib/auth-client"
import { useCurrentUser } from "@/lib/hooks/use-user"
import { useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"

export default function AccountPage() {
  const { data: session, refetch: refetchSession } = useSession()
  const { data: user, isLoading: isLoadingUser, refetch: refetchUser } = useCurrentUser()
  const navigate = useNavigate()

  const [imageUrl, setImageUrl] = useState("")
  const [name, setName] = useState("")
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  const [linkedAccounts, setLinkedAccounts] = useState<Array<any>>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)

  const [deletePassword, setDeletePassword] = useState("")
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Initialize form values when user data loads
  useEffect(() => {
    if (user) {
      setName(user.name)
      setImageUrl(user.image || "")
    }
  }, [user])

  // Load linked accounts
  useEffect(() => {
    const loadLinkedAccounts = async () => {
      setIsLoadingAccounts(true)
      setAccountsError(null)
      try {
        const result = await listAccounts()
        if (result.error) {
          setAccountsError("Failed to load linked accounts")
        } else {
          setLinkedAccounts(result.data || [])
        }
      } catch (err) {
        console.error("Error loading linked accounts:", err)
        setAccountsError("Failed to load linked accounts")
      } finally {
        setIsLoadingAccounts(false)
      }
    }

    loadLinkedAccounts()
  }, [])

  // Redirect if not authenticated
  useEffect(() => {
    if (!session && !isLoadingUser) {
      navigate({ to: "/login" })
    }
  }, [session, isLoadingUser, navigate])

  if (isLoadingUser || !user) {
    return <div className="p-8">Loading...</div>
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingProfile(true)
    setProfileError(null)
    setProfileSuccess(null)

    try {
      const result = await updateUser({
        name,
        image: imageUrl || null
      })

      if (result.error) {
        setProfileError(result.error.message || "Failed to update profile")
      } else {
        setProfileSuccess("Profile updated successfully")
        await refetchUser()
        await refetchSession()
      }
    } catch (err) {
      console.error("Profile update error:", err)
      setProfileError("An unexpected error occurred")
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsChangingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(null)

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match")
      setIsChangingPassword(false)
      return
    }

    // Validate password length
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long")
      setIsChangingPassword(false)
      return
    }

    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false
      })

      if (result.error) {
        setPasswordError(result.error.message || "Failed to change password")
      } else {
        setPasswordSuccess("Password changed successfully")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch (err) {
      console.error("Password change error:", err)
      setPasswordError("An unexpected error occurred")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleLinkGithub = async () => {
    try {
      const frontendUrl = window.location.origin
      await linkSocial({
        provider: "github",
        callbackURL: `${frontendUrl}/account`
      })
    } catch (err) {
      console.error("Link GitHub error:", err)
      setAccountsError("Failed to link GitHub account")
    }
  }

  const handleUnlinkAccount = async (providerId: string) => {
    try {
      const result = await unlinkAccount({ providerId })
      if (result.error) {
        setAccountsError(result.error.message || "Failed to unlink account")
      } else {
        // Reload linked accounts
        const accountsResult = await listAccounts()
        if (!accountsResult.error) {
          setLinkedAccounts(accountsResult.data || [])
        }
      }
    } catch (err) {
      console.error("Unlink account error:", err)
      setAccountsError("Failed to unlink account")
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)
    setDeleteError(null)

    try {
      const result = await deleteUser({
        password: deletePassword
      })

      if (result.error) {
        setDeleteError(result.error.message || "Failed to delete account")
        setIsDeletingAccount(false)
      } else {
        // Account deleted - redirect to login
        navigate({ to: "/login" })
      }
    } catch (err) {
      console.error("Delete account error:", err)
      setDeleteError("An unexpected error occurred")
      setIsDeletingAccount(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(new Date(date))
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default"
      case "proUser":
        return "secondary"
      case "freeUser":
        return "outline"
      default:
        return "outline"
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Admin"
      case "proUser":
        return "Pro User"
      case "freeUser":
        return "Free User"
      default:
        return role
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
              <AvatarFallback className="text-lg">{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.email}</p>
              <p className="text-sm text-muted-foreground">
                Member since {formatDate(user.createdAt)}
              </p>
              <div className="mt-2">
                <Badge variant={getRoleBadgeVariant(user.role)}>{getRoleLabel(user.role)}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isUpdatingProfile}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Avatar URL</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={isUpdatingProfile}
              />
              <p className="text-xs text-muted-foreground">
                Enter a URL to an image to use as your avatar
              </p>
            </div>

            {profileError && <p className="text-sm text-destructive">{profileError}</p>}
            {profileSuccess && <p className="text-sm text-green-600">{profileSuccess}</p>}

            <Button type="submit" disabled={isUpdatingProfile}>
              {isUpdatingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Linked Accounts Section */}
      <Card>
        <CardHeader>
          <CardTitle>Linked Accounts</CardTitle>
          <CardDescription>Manage your connected social accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingAccounts ?
            <p className="text-sm text-muted-foreground">Loading linked accounts...</p> :
            accountsError ?
            <p className="text-sm text-destructive">{accountsError}</p> :
            (
              <>
                <div className="space-y-3">
                  {linkedAccounts.length === 0 ? <p className="text-sm text-muted-foreground">No linked accounts</p> : (
                    linkedAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {account.providerId === "github" && <GithubIcon className="h-5 w-5" />}
                          <div>
                            <p className="font-medium capitalize">{account.providerId}</p>
                            <p className="text-sm text-muted-foreground">
                              Connected {formatDate(new Date(account.createdAt))}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnlinkAccount(account.providerId)}
                        >
                          Unlink
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {!linkedAccounts.some((acc) => acc.providerId === "github") && (
                  <>
                    <Separator />
                    <div>
                      <Button variant="outline" onClick={handleLinkGithub}>
                        <GithubIcon className="mr-2 h-4 w-4" />
                        Link GitHub Account
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
        </CardContent>
      </Card>

      {/* Change Password Section */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isChangingPassword}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isChangingPassword}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isChangingPassword}
                required
                minLength={8}
              />
            </div>

            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-green-600">{passwordSuccess}</p>}

            <Button type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? "Changing Password..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone Section */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions that affect your account</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove all your data from
                  our servers, including all projects, deployments, and configurations.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="deletePassword">Confirm with your password</Label>
                  <Input
                    id="deletePassword"
                    type="password"
                    placeholder="Enter your password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    disabled={isDeletingAccount}
                  />
                </div>
                {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingAccount}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault()
                    handleDeleteAccount()
                  }}
                  disabled={isDeletingAccount || !deletePassword}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeletingAccount ? "Deleting..." : "Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
