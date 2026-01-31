import { ProjectDialog } from "@/components/dialogs/ProjectDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useProjects } from "@/lib/hooks/use-projects"
import { Link, useNavigate } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { useState } from "react"

export default function Dashboard() {
  const { data: projects, error, isLoading } = useProjects()
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error loading projects: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">
            Manage your deployment projects and view deployment matrices
          </p>
        </div>
        <Button onClick={() => setIsProjectDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {!projects || projects.length === 0 ?
        (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <p className="text-muted-foreground mb-4">No projects yet</p>
              <Button onClick={() => setIsProjectDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first project
              </Button>
            </CardContent>
          </Card>
        ) :
        (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                to="/project/$projectId"
                params={{ projectId: project.id }}
              >
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    {project.description && <CardDescription>{project.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      View deployment matrix →
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

      <ProjectDialog
        open={isProjectDialogOpen}
        onOpenChange={setIsProjectDialogOpen}
        onSuccess={(project) => {
          // Navigate to the newly created project
          navigate({ to: "/project/$projectId", params: { projectId: project.id } })
        }}
      />
    </div>
  )
}
