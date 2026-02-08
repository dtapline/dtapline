import type { Environment } from "@dtapline/domain/Environment"
import { useEffect, useState } from "react"
import { useCreateEnvironment, useUpdateEnvironment } from "../../lib/hooks/use-environments"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"

interface EnvironmentDialogProps {
  environment?: Environment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EnvironmentDialog({
  environment,
  onOpenChange,
  open
}: EnvironmentDialogProps) {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [color, setColor] = useState("#5CC8FF")
  const [order, setOrder] = useState("0")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const createMutation = useCreateEnvironment()
  const updateMutation = useUpdateEnvironment()

  const isEditing = !!environment

  // Auto-generate slug from name
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  useEffect(() => {
    if (environment) {
      setName(environment.name)
      setSlug(environment.slug)
      setColor(environment.color ?? "#5CC8FF")
      setSlugManuallyEdited(true) // Don't auto-generate when editing
      // Order is managed via drag-and-drop, not editable in dialog
    } else {
      setName("")
      setSlug("")
      setColor("#5CC8FF")
      setOrder("0")
      setSlugManuallyEdited(false)
    }
  }, [environment])

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
          environmentId: environment.id,
          input: {
            name,
            color: color || undefined
            // Note: order is not editable - use drag-and-drop for reordering
          }
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
          slug,
          name,
          color: color || undefined,
          order: parseInt(order, 10)
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
          <DialogTitle>{isEditing ? "Edit Environment" : "Add Environment"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the environment details below."
              : "Add a new deployment environment (applies to all projects)."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Production"
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
                placeholder="production"
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
                A short identifier (e.g., production, staging) {isEditing && "- cannot be changed"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-20"
                />
                <Input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#3b82f6"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  maxLength={7}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A color to represent this environment
              </p>
            </div>

            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                  min={0}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Controls the order in which environments are displayed. Use drag-and-drop to reorder later.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
