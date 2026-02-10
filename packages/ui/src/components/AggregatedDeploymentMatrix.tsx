import type { Deployment } from "@dtapline/domain/Deployment"
import type { Environment } from "@dtapline/domain/Environment"
import type { Project } from "@dtapline/domain/Project"
import type { Service } from "@dtapline/domain/Service"
import { Link } from "@tanstack/react-router"
import { formatDistance } from "date-fns"
import { Settings } from "lucide-react"
import { useState } from "react"
import { cn } from "../lib/utils"
import { DeploymentStatusIcon } from "./DeploymentStatusIcon"
import { ProjectDialog } from "./dialogs/ProjectDialog"
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
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-[200px] border bg-background p-3 text-left font-medium">
              Project / Service
            </th>
            {allEnvironments.map((env) => (
              <th
                key={env.id}
                className="min-w-[150px] border bg-muted/50 p-3 text-left font-medium"
              >
                <div className="flex flex-col gap-1">
                  <span>{env.name}</span>
                  {env.color && (
                    <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: env.color }}
                      />
                      {env.slug}
                    </span>
                  )}
                </div>
              </th>
            ))}
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
        <td colSpan={allEnvironments.length + 1} className="border p-3">
          <div className="flex items-center justify-between">
            <Link
              to="/project/$projectId"
              params={{ projectId: projectMatrix.projectId }}
              className="font-semibold hover:underline hover:text-primary"
            >
              {projectName}
            </Link>
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
              <span>{service.name}</span>
              {service.repositoryUrl && (
                <a
                  href={service.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {service.slug}
                </a>
              )}
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

function DeploymentCell({ deployment, projectId }: { projectId: string; deployment: Deployment }) {
  const deployedAt = new Date(deployment.deployedAt)
  const { iconBg, iconColor } = getStatusIconStyle(deployment.status)
  const relativeTime = formatDistance(deployedAt, new Date(), { addSuffix: true })
  const exactDateTime = deployedAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  })

  return (
    <Link
      to="/project/$projectId/deployments/$deploymentId"
      params={{ projectId, deploymentId: deployment.id }}
      className="group flex w-full items-start gap-3 p-4 text-left transition-colors duration-150 hover:bg-muted/50"
    >
      {/* Large status icon box - Octopus Deploy style */}
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded transition-all duration-150",
          iconBg,
          "group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2"
        )}
      >
        <DeploymentStatusIcon status={deployment.status} className={cn("h-6 w-6", iconColor)} />
      </div>

      {/* Version and timestamp */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-mono text-base font-semibold">{deployment.version}</span>
        <span
          className="text-sm text-muted-foreground"
          title={exactDateTime}
        >
          {relativeTime}
        </span>
      </div>
    </Link>
  )
}

function getStatusIconStyle(status: string): { iconBg: string; iconColor: string } {
  switch (status) {
    case "success":
      return {
        iconBg: "bg-green-500 dark:bg-green-600",
        iconColor: "text-white"
      }
    case "failed":
      return {
        iconBg: "bg-red-500 dark:bg-red-600",
        iconColor: "text-white"
      }
    case "in_progress":
      return {
        iconBg: "bg-amber-500 dark:bg-amber-600",
        iconColor: "text-white"
      }
    case "rolled_back":
      return {
        iconBg: "bg-gray-500 dark:bg-gray-600",
        iconColor: "text-white"
      }
    default:
      return {
        iconBg: "bg-muted",
        iconColor: "text-muted-foreground"
      }
  }
}
