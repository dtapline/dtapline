import { useEffect, useState } from "react"
import type { Project } from "@cloud-matrix/domain/Project"
import { useCreateProject, useUpdateProject } from "../../lib/hooks/use-projects"
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

interface ProjectDialogProps {
  project?: Project
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (project: Project) => void
}

export function ProjectDialog({
  project,
  open,
  onOpenChange,
  onSuccess
}: ProjectDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const createMutation = useCreateProject()
  const updateMutation = useUpdateProject()

  const isEditing = !!project

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description ?? "")
    } else {
      setName("")
      setDescription("")
    }
  }, [project])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const input = {
      name,
      description: description || undefined
    }

    if (isEditing) {
      updateMutation.mutate(
        {
          projectId: project.id,
          input
        },
        {
          onSuccess: (data) => {
            onOpenChange(false)
            onSuccess?.(data.project)
          }
        }
      )
    } else {
      createMutation.mutate(input, {
        onSuccess: (data) => {
          onOpenChange(false)
          onSuccess?.(data.project)
        }
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Project" : "Create Project"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the project details below."
              : "Create a new project to track deployments across environments."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My Application"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                A name for your project
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="A brief description of your project"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                Add context about what this project is for
              </p>
            </div>
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
