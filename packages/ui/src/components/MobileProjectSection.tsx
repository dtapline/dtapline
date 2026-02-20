import type { Deployment } from "@dtapline/domain/Deployment"
import type { Environment } from "@dtapline/domain/Environment"
import type { Project } from "@dtapline/domain/Project"
import type { Service } from "@dtapline/domain/Service"
import { Link } from "@tanstack/react-router"
import { Settings } from "lucide-react"
import { useState } from "react"
import { DeploymentCell } from "./DeploymentCell"
import { ProjectDialog } from "./dialogs/ProjectDialog"
import { Button } from "./ui/button"

interface MobileProjectSectionProps {
  projectId: string
  projectName: string
  project: Project | undefined
  services: ReadonlyArray<Service>
  allEnvironments: ReadonlyArray<Environment>
  enabledEnvironments: ReadonlyArray<Environment>
  deployments: Record<string, Record<string, Deployment | null>>
}

export function MobileProjectSection({
  allEnvironments,
  deployments,
  enabledEnvironments,
  project,
  projectId,
  projectName,
  services
}: MobileProjectSectionProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const enabledEnvironmentIds = new Set(enabledEnvironments.map((env) => env.id))

  if (services.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/20 p-4 text-center">
        <span className="text-sm font-semibold">{projectName}</span>
        <p className="mt-1 text-xs text-muted-foreground">No services configured</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Project header */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/project/$projectId"
            params={{ projectId }}
            className="font-semibold hover:text-primary hover:underline"
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
              Configure
            </Button>
          )}
        </div>
      </div>

      {/* Services as cards */}
      {services.map((service) => (
        <div key={service.id} className="rounded-lg border bg-card">
          <div className="border-b bg-muted/50 p-3">
            <div className="flex items-center gap-2">
              {service.iconUrl && (
                <img
                  src={service.iconUrl}
                  alt={`${service.name} icon`}
                  className="h-4 w-4"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              )}
              <span className="text-sm font-semibold">{service.name}</span>
            </div>
          </div>
          <div className="divide-y">
            {allEnvironments.map((env) => {
              const deployment = deployments[env.id]?.[service.id]
              const isEnvironmentEnabled = enabledEnvironmentIds.has(env.id)

              if (!isEnvironmentEnabled) {
                return null
              }

              return (
                <div key={env.id} className="p-2">
                  <div className="mb-1 flex items-center gap-1.5">
                    {env.color && (
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: env.color }}
                      />
                    )}
                    <span className="text-xs font-medium">{env.name}</span>
                  </div>
                  {deployment ?
                    <DeploymentCell projectId={projectId} deployment={deployment} compact /> :
                    (
                      <div className="pl-3">
                        <span className="text-xs text-muted-foreground">Not deployed</span>
                      </div>
                    )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Project Edit Dialog */}
      {project && (
        <ProjectDialog
          project={project}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </div>
  )
}
