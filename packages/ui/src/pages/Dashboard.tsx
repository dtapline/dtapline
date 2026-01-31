import { AggregatedDeploymentMatrix } from "@/components/AggregatedDeploymentMatrix"
import { ProjectDialog } from "@/components/dialogs/ProjectDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { projectsApi } from "@/lib/api"
import { useProjects } from "@/lib/hooks/use-projects"
import { useQueries } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState } from "react"

export default function Dashboard() {
  const { data: projects, error, isLoading } = useProjects()
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)

  // Fetch matrices for all projects using useQueries
  const matrixQueries = useQueries({
    queries: projects?.map((project) => ({
      queryKey: ["projects", project.id, "matrix"],
      queryFn: () => projectsApi.getMatrix(project.id)
    })) || []
  })

  const isLoadingAny = isLoading || matrixQueries.some((q) => q.isLoading)

  // Prepare aggregated matrix data
  const aggregatedData = projects
    ?.map((project, index) => {
      const matrixData = matrixQueries[index]?.data
      if (!matrixData) return null
      return {
        projectId: project.id,
        projectName: project.name,
        projectDescription: project.description,
        project, // Pass full project for editing
        environments: matrixData.environments,
        services: matrixData.services,
        deployments: matrixData.deployments
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading dashboard...</p>
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
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            View all deployments across projects and environments
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
          <AggregatedDeploymentMatrix
            projectMatrices={aggregatedData || []}
            isLoading={isLoadingAny}
          />
        )}

      <ProjectDialog
        open={isProjectDialogOpen}
        onOpenChange={setIsProjectDialogOpen}
        onSuccess={(project) => {
          window.location.href = `/project/${project.id}`
        }}
      />
    </div>
  )
}
