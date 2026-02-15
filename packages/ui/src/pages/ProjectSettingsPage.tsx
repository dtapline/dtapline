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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDeleteProject } from "@/lib/hooks/use-projects"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

interface ProjectSettingsPageProps {
  projectId: string
  projectName: string
}

export default function ProjectSettingsPage({ projectId, projectName }: ProjectSettingsPageProps) {
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
      setDeleteError("Failed to delete project. Please try again.")
      setIsDeleting(false)
    }
  }
  return (
    <div className="p-8 max-w-4xl container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Project Settings</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Project name" defaultValue="dtapline" />
          <Input placeholder="Git repository URL" defaultValue="https://github.com/dtapline/dtapline" />
          <Button>Save</Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="environments">
        <TabsList>
          <TabsTrigger value="environments">Environments</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        <TabsContent value="environments">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Environments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Input placeholder="Environment name" defaultValue="development" />
                <Input placeholder="Target URL or cluster" defaultValue="dev.dtapline.io" />
                <Button>Add Environment</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Detected Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>apps/frontend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input defaultValue="Frontend App" />
                    <Input defaultValue="apps/frontend" />
                  </CardContent>
                </Card>
                <Button>Add Service</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      <Card className="border-destructive mt-6">
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
                {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
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
    </div>
  )
}
