import type { Project } from "@cloud-matrix/domain/Project"
import { useEffect, useState } from "react"
import { useEnvironments } from "../../lib/hooks/use-environments"
import { useCreateProject, useUpdateProject } from "../../lib/hooks/use-projects"
import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"

interface ProjectDialogProps {
  project?: Project
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (project: Project) => void
}

export function ProjectDialog({
  onOpenChange,
  onSuccess,
  open,
  project
}: ProjectDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedEnvironmentIds, setSelectedEnvironmentIds] = useState<ReadonlyArray<string>>([])

  const { data: environments } = useEnvironments()
  const createMutation = useCreateProject()
  const updateMutation = useUpdateProject()

  const isEditing = !!project

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description ?? "")
      setSelectedEnvironmentIds([...(project.selectedEnvironmentIds ?? [])])
    } else {
      setName("")
      setDescription("")
      // When creating a new project, select all environments by default
      setSelectedEnvironmentIds(environments?.map((env) => env.id) ?? [])
    }
  }, [project, environments])

  const toggleEnvironment = (environmentId: string) => {
    setSelectedEnvironmentIds((prev) =>
      prev.includes(environmentId)
        ? prev.filter((id) => id !== environmentId)
        : [...prev, environmentId]
    )
  }

  const toggleAll = () => {
    if (!environments) return
    if (selectedEnvironmentIds.length === environments.length) {
      setSelectedEnvironmentIds([])
    } else {
      setSelectedEnvironmentIds(environments.map((env) => env.id))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const input = {
      name,
      description: description || undefined,
      selectedEnvironmentIds: selectedEnvironmentIds.length > 0 ? selectedEnvironmentIds as any : undefined
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Project" : "Create Project"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the project details and select which environments to track."
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Environments</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleAll}
                >
                  {selectedEnvironmentIds.length === environments?.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Select which environments to track for this project
              </p>
              {environments && environments.length > 0 ?
                (
                  <div className="rounded-lg border p-4 space-y-3 max-h-64 overflow-y-auto">
                    {environments.map((env) => (
                      <div key={env.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`env-${env.id}`}
                          checked={selectedEnvironmentIds.includes(env.id)}
                          onCheckedChange={() => toggleEnvironment(env.id)}
                        />
                        <label
                          htmlFor={`env-${env.id}`}
                          className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {env.color && (
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{ backgroundColor: env.color }}
                            />
                          )}
                          {env.displayName}
                        </label>
                      </div>
                    ))}
                  </div>
                ) :
                (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No environments available. Create environments first.
                    </p>
                  </div>
                )}
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
