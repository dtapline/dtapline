import type { Deployment } from "@cloud-matrix/domain/Deployment"
import type { Environment } from "@cloud-matrix/domain/Environment"
import type { Service } from "@cloud-matrix/domain/Service"

interface DeploymentMatrixProps {
  environments: readonly Environment[]
  services: readonly Service[]
  deployments: Record<string, Record<string, Deployment | null>>
  isLoading?: boolean
}

export function DeploymentMatrix({
  environments,
  services,
  deployments,
  isLoading = false
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
                  <span>{env.displayName}</span>
                  {env.color && (
                    <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: env.color }}
                      />
                      {env.name}
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
                <div className="flex flex-col gap-1">
                  <span>{service.displayName}</span>
                  {service.repositoryUrl && (
                    <a
                      href={service.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-normal text-muted-foreground hover:underline"
                    >
                      {service.name}
                    </a>
                  )}
                </div>
              </td>
              {environments.map((env) => {
                const deployment = deployments[env.id]?.[service.id]
                return (
                  <td key={env.id} className="border p-3">
                    {deployment ? (
                      <DeploymentCell deployment={deployment} />
                    ) : (
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

  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-sm font-medium">{deployment.version}</span>
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
