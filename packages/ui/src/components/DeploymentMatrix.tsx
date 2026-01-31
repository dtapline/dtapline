import type { Deployment } from "@cloud-matrix/domain/Deployment"
import type { Environment } from "@cloud-matrix/domain/Environment"
import type { Service } from "@cloud-matrix/domain/Service"
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
                  <td key={env.id} className="border p-3">
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
  const relativeTime = formatRelativeTime(deployedAt)
  const statusColor = getStatusColor(deployment.status)

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-md p-2 transition-colors",
        statusColor
      )}
    >
      <div className="flex items-center gap-2">
        <DeploymentStatusIcon status={deployment.status} />
        <span className="font-mono text-sm font-medium">{deployment.version}</span>
      </div>
      <span className="text-xs text-muted-foreground" title={deployedAt.toLocaleString()}>
        {relativeTime}
      </span>
      {deployment.buildUrl && (
        <a
          href={deployment.buildUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          View build
        </a>
      )}
    </div>
  )
}

function getStatusColor(status: string): string {
  switch (status) {
    case "success":
      return "bg-green-50 border-l-4 border-green-600 dark:bg-green-950/20"
    case "failed":
      return "bg-red-50 border-l-4 border-red-600 dark:bg-red-950/20"
    case "in_progress":
      return "bg-orange-50 border-l-4 border-orange-600 dark:bg-orange-950/20"
    case "rolled_back":
      return "bg-gray-50 border-l-4 border-gray-600 dark:bg-gray-950/20"
    default:
      return "bg-muted/20"
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return "just now"
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  return `${diffInMonths}mo ago`
}
