import type { Deployment } from "@dtapline/domain/Deployment"
import type { Environment } from "@dtapline/domain/Environment"
import type { Project } from "@dtapline/domain/Project"
import type { Service } from "@dtapline/domain/Service"
import { Link } from "@tanstack/react-router"
import { Settings } from "lucide-react"
import { useState } from "react"
import { cn } from "../lib/utils"
import { DeploymentCell } from "./DeploymentCell"
import { ProjectDialog } from "./dialogs/ProjectDialog"
import { EnvironmentHeaderCell } from "./EnvironmentHeaderCell"
import { MobileProjectSection } from "./MobileProjectSection"
import { Button } from "./ui/button"

interface ProjectMatrixData {
  projectId: string
  projectName: string
  projectDescription?: string | undefined
  project?: Project
  environments: ReadonlyArray<Environment>
  services: ReadonlyArray<Service>
  deployments: Record<string, Record<string, Deployment | null>>
}

interface AggregatedDeploymentMatrixProps {
  projectMatrices: Array<ProjectMatrixData>
  isLoading?: boolean
}

export function AggregatedDeploymentMatrix({
  isLoading = false,
  projectMatrices
}: AggregatedDeploymentMatrixProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading matrices...</div>
      </div>
    )
  }

  if (projectMatrices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">No projects to display</p>
      </div>
    )
  }

  // Get all unique environments across all projects and sort by order
  const allEnvironments = Array.from(
    new Map(
      projectMatrices.flatMap((pm) => pm.environments.map((env) => [env.id, env]))
    ).values()
  ).sort((a, b) => a.order - b.order)

  if (allEnvironments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          No environments configured. Add environments to start tracking deployments.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile/Small screens: Card layout */}
      <div className="block sm:hidden space-y-6">
        {projectMatrices.map((projectMatrix) => (
          <MobileProjectSection
            key={projectMatrix.projectId}
            projectId={projectMatrix.projectId}
            projectName={projectMatrix.projectName}
            project={projectMatrix.project}
            services={projectMatrix.services}
            allEnvironments={allEnvironments}
            enabledEnvironments={projectMatrix.environments}
            deployments={projectMatrix.deployments}
          />
        ))}
      </div>

      {/* Tablet/Desktop: Full table */}
      <div className="hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[200px] border bg-background p-3 text-left font-medium">
                  Project / Service
                </th>
                {allEnvironments.map((env) => <EnvironmentHeaderCell key={env.id} environment={env} />)}
              </tr>
            </thead>
            <tbody>
              {projectMatrices.map((projectMatrix) => (
                <ProjectSection
                  key={projectMatrix.projectId}
                  projectMatrix={projectMatrix}
                  allEnvironments={allEnvironments}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

interface ProjectSectionProps {
  projectMatrix: ProjectMatrixData
  allEnvironments: Array<Environment>
}

function ProjectSection({ allEnvironments, projectMatrix }: ProjectSectionProps) {
  const { deployments, environments: projectEnvironments, project, projectName, services } = projectMatrix
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Get environment IDs that are enabled for this project
  const enabledEnvironmentIds = new Set(projectEnvironments.map((env) => env.id))

  if (services.length === 0) {
    return (
      <tr>
        <td
          colSpan={allEnvironments.length + 1}
          className="border bg-muted/20 p-4 text-center text-sm text-muted-foreground"
        >
          <strong className="font-semibold">{projectName}</strong> - No services configured
        </td>
      </tr>
    )
  }

  return (
    <>
      {/* Project header row */}
      <tr className="bg-muted/30">
        <td className="sticky left-0 z-10 border bg-muted/30 p-3">
          <Link
            to="/project/$projectId"
            params={{ projectId: projectMatrix.projectId }}
            className="font-semibold hover:underline hover:text-primary"
          >
            {projectName}
          </Link>
        </td>
        <td colSpan={allEnvironments.length} className="border bg-muted/30 p-3">
          <div className="flex items-center justify-end">
            {project && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  setIsEditDialogOpen(true)
                }}
                className="h-7 gap-1 text-xs"
              >
                <Settings className="h-3 w-3" />
                Configure Environments
              </Button>
            )}
          </div>
        </td>
      </tr>
      {/* Service rows */}
      {services.map((service) => (
        <tr key={service.id} className="hover:bg-muted/20">
          <td className="sticky left-0 z-10 border bg-background p-3 font-medium">
            <div className="flex items-center gap-2 pl-4">
              {service.iconUrl && (
                <img
                  src={service.iconUrl}
                  alt={`${service.name} icon`}
                  className="h-5 w-5"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              )}
              <div className="flex flex-col gap-1">
                <span>{service.name}</span>
                {service.repositoryUrl && (
                  <a
                    href={service.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-normal text-muted-foreground hover:underline"
                  >
                    {service.slug}
                  </a>
                )}
              </div>
            </div>
          </td>
          {allEnvironments.map((env) => {
            const deployment = deployments[env.id]?.[service.id]
            const isEnvironmentEnabled = enabledEnvironmentIds.has(env.id)

            return (
              <td key={env.id} className={cn("border p-0", !isEnvironmentEnabled && "bg-muted/10")}>
                {!isEnvironmentEnabled ?
                  (
                    <div className="p-4">
                      <span className="text-xs text-muted-foreground/50">—</span>
                    </div>
                  ) :
                  deployment ?
                  <DeploymentCell projectId={projectMatrix.projectId} deployment={deployment} /> :
                  (
                    <div className="p-4">
                      <span className="text-xs text-muted-foreground">Not deployed</span>
                    </div>
                  )}
              </td>
            )
          })}
        </tr>
      ))}

      {/* Project Edit Dialog */}
      {project && (
        <ProjectDialog
          project={project}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </>
  )
}
