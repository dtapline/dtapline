import { Key, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { useApiKeys, useRevokeApiKey } from "../lib/hooks/use-api-keys"
import { ApiKeyDialog } from "./dialogs/ApiKeyDialog"
import { Alert, AlertDescription } from "./ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "./ui/alert-dialog"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"

interface ApiKeysListProps {
  projectId: string
}

export function ApiKeysList({ projectId }: ApiKeysListProps) {
  const { data: apiKeys, isLoading } = useApiKeys(projectId)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const revokeMutation = useRevokeApiKey()

  const handleRevoke = () => {
    if (keyToRevoke) {
      setRevokeError(null)
      revokeMutation.mutate(
        { projectId, apiKeyId: keyToRevoke },
        {
          onSuccess: () => {
            setKeyToRevoke(null)
          },
          onError: (err: Error) => {
            setRevokeError(err.message || "Failed to revoke API key")
          }
        }
      )
    }
  }

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(dateObj)
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Loading API keys...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Manage API keys for CI/CD integration
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {!apiKeys || apiKeys.length === 0 ?
        (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Key className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-medium">No API keys yet</p>
              <p className="mb-4 text-sm text-muted-foreground">
                Create an API key to start reporting deployments from your CI/CD pipeline
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first API key
              </Button>
            </CardContent>
          </Card>
        ) :
        (
          <div className="grid gap-4">
            {apiKeys.map((apiKey) => (
              <Card key={apiKey.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base">{apiKey.name}</CardTitle>
                    <CardDescription className="mt-1 font-mono text-xs">
                      {apiKey.keyPrefix}...
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setKeyToRevoke(apiKey.id)}
                    disabled={revokeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Permissions:</span>
                      <span className="font-medium">
                        {apiKey.scopes.map((scope) => scope).join(", ")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{formatDate(apiKey.createdAt)}</span>
                    </div>
                    {apiKey.lastUsedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last used:</span>
                        <span>{formatDate(apiKey.lastUsedAt)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      <ApiKeyDialog
        projectId={projectId}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />

      <AlertDialog
        open={!!keyToRevoke}
        onOpenChange={() => {
          setKeyToRevoke(null)
          setRevokeError(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this API key? This action cannot be undone. Any integrations using this
              key will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {revokeError && (
            <Alert variant="destructive">
              <AlertDescription>{revokeError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleRevoke()
              }}
              disabled={revokeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeMutation.isPending ? "Revoking..." : "Revoke Key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
