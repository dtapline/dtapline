import type { Deployment } from "@cloud-matrix/domain/Deployment"
import type { Environment } from "@cloud-matrix/domain/Environment"
import type { Service } from "@cloud-matrix/domain/Service"
import { formatDistance } from "date-fns"
import { cn } from "../lib/utils"
import { DeploymentStatusIcon } from "./DeploymentStatusIcon"

interface DeploymentMatrixProps {
  environments: ReadonlyArray<Environment>
  services: ReadonlyArray<Service>
  deployments: Record<string, Record<string, Deployment | null>>
  isLoading?: boolean
}

export function DeploymentMatrix({
  deployments,
  environments,
  isLoading = false,
  services
}: DeploymentMatrixProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading matrix...</div>
      </div>
    )
  }

  if (services.length === 0 || environments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          {services.length === 0 && environments.length === 0
            ? "Add environments and services to start tracking deployments"
            : services.length === 0
            ? "Add services to start tracking deployments"
            : "Add environments to start tracking deployments"}
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
              Service / Environment
            </th>
            {environments.map((env) => (
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
          {services.map((service) => (
            <tr key={service.id}>
              <td className="sticky left-0 z-10 border bg-background p-3 font-medium">
                <div className="flex items-center gap-2">
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
              {environments.map((env) => {
                const deployment = deployments[env.id]?.[service.id]
                return (
                  <td key={env.id} className="border p-4">
                    {deployment ?
                      <DeploymentCell deployment={deployment} /> :
                      (
                        <span className="text-xs text-muted-foreground">
                          Not deployed
                        </span>
                      )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DeploymentCell({ deployment }: { deployment: Deployment }) {
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
    <div className="flex items-start gap-3">
      {/* Large status icon box - Octopus Deploy style */}
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded",
          iconBg
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
        {deployment.buildUrl && (
          <a
            href={deployment.buildUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            View build
          </a>
        )}
      </div>
    </div>
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
        iconBg: "bg-orange-500 dark:bg-orange-600",
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
