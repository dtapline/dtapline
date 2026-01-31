import { DeploymentMatrix } from "@/components/DeploymentMatrix"
import { ProjectDialog } from "@/components/dialogs/ProjectDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useProjectMatrix, useProjects } from "@/lib/hooks/use-projects"
import { ChevronDown, ChevronRight, Plus } from "lucide-react"
import { useState } from "react"

export default function Dashboard() {
  const { data: projects, error, isLoading } = useProjects()
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set())

  const toggleProject = (projectId: string) => {
    setOpenProjects((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

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
            View deployment matrices across all your projects
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
          <div className="space-y-4">
            {projects.map((project) => (
              <ProjectMatrixSection
                key={project.id}
                project={project}
                isOpen={openProjects.has(project.id)}
                onToggle={() => toggleProject(project.id)}
              />
            ))}
          </div>
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

interface ProjectMatrixSectionProps {
  project: { id: string; name: string; description?: string }
  isOpen: boolean
  onToggle: () => void
}

function ProjectMatrixSection({ isOpen, onToggle, project }: ProjectMatrixSectionProps) {
  const { data: matrix, isLoading } = useProjectMatrix(project.id)

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <button
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            onClick={onToggle}
          >
            <div className="flex items-center gap-3">
              {isOpen ?
                <ChevronDown className="h-5 w-5 text-muted-foreground" /> :
                <ChevronRight className="h-5 w-5 text-muted-foreground" />}
              <div className="text-left">
                <h3 className="text-lg font-semibold">{project.name}</h3>
                {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                window.location.href = `/project/${project.id}`
              }}
            >
              View Details →
            </Button>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-6 pb-6">
            {isLoading ?
              (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading matrix...</p>
                </div>
              ) :
              matrix ?
              (
                <DeploymentMatrix
                  environments={matrix.environments}
                  services={matrix.services}
                  deployments={matrix.deployments}
                  isLoading={false}
                />
              ) :
              (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-muted-foreground">No deployment data available</p>
                </div>
              )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
