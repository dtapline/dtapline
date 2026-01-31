import { useEffect, useState } from "react"
import type { Service } from "@cloud-matrix/domain/Service"
import { useCreateService, useUpdateService } from "../../lib/hooks/use-services"
import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"

interface ServiceDialogProps {
  projectId: string
  service?: Service
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ServiceDialog({ projectId, service, open, onOpenChange }: ServiceDialogProps) {
  const [name, setName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [repositoryUrl, setRepositoryUrl] = useState("")

  const createMutation = useCreateService()
  const updateMutation = useUpdateService()

  const isEditing = !!service

  useEffect(() => {
    if (service) {
      setName(service.name)
      setDisplayName(service.displayName)
      setRepositoryUrl(service.repositoryUrl ?? "")
    } else {
      setName("")
      setDisplayName("")
      setRepositoryUrl("")
    }
  }, [service])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const input = {
      displayName,
      name,
      repositoryUrl: repositoryUrl || undefined
    }

    if (isEditing) {
      updateMutation.mutate(
        {
          input,
          projectId,
          serviceId: service.id
        },
        {
          onSuccess: () => {
            onOpenChange(false)
          }
        }
      )
    } else {
      createMutation.mutate(
        {
          input,
          projectId
        },
        {
          onSuccess: () => {
            onOpenChange(false)
          }
        }
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Service" : "Add Service"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the service details below."
              : "Add a new service to track deployments for."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="api-server"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                A short identifier (e.g., api-server, web-app)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="API Server"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                A human-readable name for display
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repositoryUrl">Repository URL</Label>
              <Input
                id="repositoryUrl"
                type="url"
                placeholder="https://github.com/org/repo"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                pattern="^https?://.+"
              />
              <p className="text-xs text-muted-foreground">
                Optional link to the source code repository
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
