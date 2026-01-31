import { useState } from "react"
import { DeploymentMatrix } from "../components/DeploymentMatrix"
import { EnvironmentsList } from "../components/EnvironmentsList"
import { ServicesList } from "../components/ServicesList"
import { useProject, useProjectMatrix } from "../lib/hooks/use-projects"

interface ProjectDetailPageProps {
  projectId: string
}

type Tab = "matrix" | "environments" | "services" | "settings"

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("matrix")
  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: matrix, isLoading: matrixLoading } = useProjectMatrix(projectId)

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
        <h1 className="text-3xl font-bold">{project.name}</h1>
        {project.description && (
          <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
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
            onClick={() => setActiveTab("environments")}
            className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === "environments"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Environments
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
            {matrix ? (
              <DeploymentMatrix
                environments={matrix.environments}
                services={matrix.services}
                deployments={matrix.deployments}
                isLoading={matrixLoading}
              />
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  Loading deployment matrix...
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "environments" && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Environments</h2>
                <p className="text-sm text-muted-foreground">
                  Manage deployment environments
                </p>
              </div>
            </div>
            <EnvironmentsList projectId={projectId} />
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
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Project Settings</h2>
              <p className="text-sm text-muted-foreground">
                Configure project settings
              </p>
            </div>
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground">
                Project settings coming soon
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
