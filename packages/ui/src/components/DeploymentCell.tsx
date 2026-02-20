import type { Deployment } from "@dtapline/domain/Deployment"
import { Link } from "@tanstack/react-router"
import { formatDistance } from "date-fns"
import { cn } from "../lib/utils"
import { DeploymentStatusIcon } from "./DeploymentStatusIcon"

interface DeploymentCellProps {
  projectId: string
  deployment: Deployment
  compact?: boolean
}

export function DeploymentCell({ compact = false, deployment, projectId }: DeploymentCellProps) {
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

  if (compact) {
    return (
      <Link
        to="/project/$projectId/deployments/$deploymentId"
        params={{ projectId, deploymentId: deployment.id }}
        className="group flex w-full items-center gap-2 p-2 text-left transition-colors duration-150 hover:bg-muted/50"
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded transition-all duration-150",
            iconBg,
            "group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-1"
          )}
        >
          <DeploymentStatusIcon status={deployment.status} className={cn("h-4 w-4", iconColor)} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-mono text-xs font-semibold">{deployment.version}</span>
          <span
            className="text-xs text-muted-foreground"
            title={exactDateTime}
          >
            {relativeTime}
          </span>
        </div>
      </Link>
    )
  }

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
