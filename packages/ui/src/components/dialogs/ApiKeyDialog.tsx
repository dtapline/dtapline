import type { ApiKeyResponse } from "@dtapline/domain/ApiKey"
import { CheckCircle2, Copy } from "lucide-react"
import { useState } from "react"
import { useCreateApiKey } from "../../lib/hooks/use-api-keys"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"

type ApiKeyResponseType = typeof ApiKeyResponse.Type

interface ApiKeyDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ApiKeyDialog({ onOpenChange, open, projectId }: ApiKeyDialogProps) {
  const [name, setName] = useState("")
  const [createdKey, setCreatedKey] = useState<ApiKeyResponseType | null>(null)
  const [copied, setCopied] = useState(false)

  const createMutation = useCreateApiKey()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    createMutation.mutate(
      {
        projectId,
        input: {
          name,
          scopes: ["deployments:write"]
        }
      },
      {
        onSuccess: (data) => {
          setCreatedKey(data)
          setName("")
        }
      }
    )
  }

  const handleCopy = async () => {
    if (createdKey?.key) {
      await navigator.clipboard.writeText(createdKey.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setCreatedKey(null)
    setCopied(false)
    onOpenChange(false)
  }

  // Show the created key
  if (createdKey && createdKey.key) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Save this API key securely. You won't be able to see it again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key Name</Label>
              <div className="text-sm font-medium">{createdKey.name}</div>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input
                  value={createdKey.key}
                  readOnly
                  className="font-mono text-sm"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this key in your CI/CD pipeline to report deployments
              </p>
            </div>

            <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
              <p className="text-sm text-amber-900 dark:text-amber-200 font-medium">
                ⚠️ Store this key securely
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                This key will not be shown again. If you lose it, you'll need to create a new one.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>I've saved the key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Show the creation form
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for this project to use in your CI/CD pipelines.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Key Name</Label>
              <Input
                id="name"
                placeholder="Production CI/CD"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name to identify this key (e.g., "GitHub Actions", "Jenkins")
              </p>
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="text-sm text-muted-foreground">
                This key will have <strong>deployments:write</strong> permission, allowing it to report deployments.
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create API Key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
