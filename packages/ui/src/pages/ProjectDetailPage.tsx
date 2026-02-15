import { Link } from "@tanstack/react-router"
import { ChevronRight, Edit, Settings } from "lucide-react"
import { useState } from "react"
import { ApiKeysList } from "../components/ApiKeysList"
import { DeploymentMatrix } from "../components/DeploymentMatrix"
import { ProjectDialog } from "../components/dialogs/ProjectDialog"
import { ProjectDangerZone } from "../components/ProjectDangerZone"
import { ServicesList } from "../components/ServicesList"
import { Button } from "../components/ui/button"
import { Separator } from "../components/ui/separator"
import { useEnvironments } from "../lib/hooks/use-environments"
import { useProject, useProjectMatrix } from "../lib/hooks/use-projects"

interface ProjectDetailPageProps {
  projectId: string
}

type Tab = "matrix" | "services" | "settings"

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("matrix")
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: matrix, isLoading: matrixLoading } = useProjectMatrix(projectId)
  const { data: allEnvironments } = useEnvironments()

  if (projectLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Project not found</div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-8 py-6">
        {/* Breadcrumbs */}
        <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            to="/projects"
            className="transition-colors hover:text-foreground"
          >
            Projects
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">
            {project.name}
          </span>
        </nav>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>}
          </div>
          <Button variant="outline" onClick={() => setIsProjectDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Project
          </Button>
        </div>

        {/* Environment tags */}
        {allEnvironments && project.selectedEnvironmentIds && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Tracking environments:</span>
            {allEnvironments
              .filter((env) => project.selectedEnvironmentIds?.includes(env.id))
              .map((env) => (
                <span
                  key={env.id}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium"
                >
                  {env.color && (
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: env.color }}
                    />
                  )}
                  {env.name}
                </span>
              ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsProjectDialogOpen(true)}
              className="h-6 px-2 text-xs"
            >
              <Settings className="mr-1 h-3 w-3" />
              Configure
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b px-8">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === "matrix"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Matrix View
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === "services"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Services
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === "settings"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {activeTab === "matrix" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Deployment Matrix</h2>
                <p className="text-sm text-muted-foreground">
                  View all deployments across environments and services
                </p>
              </div>
            </div>
            {matrix ?
              (
                <DeploymentMatrix
                  projectId={projectId}
                  environments={matrix.environments}
                  services={matrix.services}
                  deployments={matrix.deployments}
                  isLoading={matrixLoading}
                />
              ) :
              (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-muted-foreground">
                    Loading deployment matrix...
                  </p>
                </div>
              )}
          </div>
        )}

        {activeTab === "services" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Services</h2>
                <p className="text-sm text-muted-foreground">
                  Manage services being deployed
                </p>
              </div>
            </div>
            <ServicesList projectId={projectId} />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Project Settings</h2>
              <p className="text-sm text-muted-foreground">
                Configure project settings and API keys
              </p>
            </div>

            {/* API Keys Section */}
            <ApiKeysList projectId={projectId} />

            <Separator />

            {/* Danger Zone */}
            <ProjectDangerZone projectId={projectId} projectName={project.name} />
          </div>
        )}
      </div>

      {/* Project Edit Dialog */}
      <ProjectDialog
        project={project}
        open={isProjectDialogOpen}
        onOpenChange={setIsProjectDialogOpen}
      />
    </div>
  )
}
