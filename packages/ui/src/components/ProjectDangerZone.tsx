import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDeleteProject } from "@/lib/hooks/use-projects"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

interface ProjectDangerZoneProps {
  projectId: string
  projectName: string
}

export function ProjectDangerZone({ projectId, projectName }: ProjectDangerZoneProps) {
  const navigate = useNavigate()
  const deleteProject = useDeleteProject()
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteProject = async () => {
    setIsDeleting(true)
    setDeleteError(null)

    try {
      await deleteProject.mutateAsync(projectId)
      // Redirect to projects list after successful deletion
      navigate({ to: "/projects" })
    } catch (err) {
      console.error("Delete project error:", err)
      setDeleteError((err as Error).message || "Failed to delete project. Please try again.")
      setIsDeleting(false)
    }
  }

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>Irreversible actions that affect your project</CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete Project</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the project{" "}
                <span className="font-semibold">{projectName}</span>{" "}
                and remove all associated data including environments, services, and deployment history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="confirmText">
                  Type <span className="font-semibold">{projectName}</span> to confirm
                </Label>
                <Input
                  id="confirmText"
                  type="text"
                  placeholder={projectName}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={isDeleting}
                />
              </div>
              {deleteError && (
                <Alert variant="destructive">
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleDeleteProject()
                }}
                disabled={isDeleting || confirmText !== projectName}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete Project"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
