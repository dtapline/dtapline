import type { Service } from "@dtapline/domain/Service"
import { useEffect, useState } from "react"
import { useCreateService, useUpdateService } from "../../lib/hooks/use-services"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"

interface ServiceDialogProps {
  projectId: string
  service?: Service | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ServiceDialog({ onOpenChange, open, projectId, service }: ServiceDialogProps) {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [repositoryUrl, setRepositoryUrl] = useState("")
  const [iconUrl, setIconUrl] = useState("")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const createMutation = useCreateService()
  const updateMutation = useUpdateService()

  const isEditing = !!service

  // Auto-generate slug from name
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  useEffect(() => {
    if (service) {
      setName(service.name)
      setSlug(service.slug)
      setRepositoryUrl(service.repositoryUrl ?? "")
      setIconUrl(service.iconUrl ?? "")
      setSlugManuallyEdited(true) // Don't auto-generate when editing
    } else {
      setName("")
      setSlug("")
      setRepositoryUrl("")
      setIconUrl("")
      setSlugManuallyEdited(false)
    }
  }, [service])

  // Auto-generate slug when name changes (only if slug hasn't been manually edited)
  const handleNameChange = (value: string) => {
    setName(value)
    if (!isEditing && !slugManuallyEdited) {
      setSlug(generateSlug(value))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isEditing) {
      updateMutation.mutate(
        {
          input: {
            name,
            repositoryUrl: repositoryUrl || undefined,
            iconUrl: iconUrl || undefined
          },
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
          input: {
            slug,
            name,
            repositoryUrl: repositoryUrl || undefined,
            iconUrl: iconUrl || undefined
          },
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
                placeholder="API Server"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                A human-readable name for display
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="api-server"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value)
                  setSlugManuallyEdited(true)
                }}
                required
                maxLength={50}
                disabled={isEditing}
              />
              <p className="text-xs text-muted-foreground">
                A short identifier (e.g., api-server, web-app) {isEditing && "- cannot be changed"}
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

            <div className="space-y-2">
              <Label htmlFor="iconUrl">Icon URL</Label>
              <Input
                id="iconUrl"
                type="url"
                placeholder="https://cdn.simpleicons.org/github"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                pattern="^https?://.+"
              />
              <p className="text-xs text-muted-foreground">
                Optional icon URL. Auto-set from CI/CD platform if not provided.
              </p>
              {iconUrl && (
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <img
                    src={iconUrl}
                    alt="Service icon preview"
                    className="h-6 w-6"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                  <span className="text-xs text-muted-foreground">Icon preview</span>
                </div>
              )}
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
