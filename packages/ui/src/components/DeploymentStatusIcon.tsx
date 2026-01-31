import type { DeploymentStatus } from "@cloud-matrix/domain/Deployment"
import { CheckCircle2, XCircle, Loader2, RotateCcw } from "lucide-react"
import { cn } from "../lib/utils"

interface DeploymentStatusIconProps {
  status: DeploymentStatus
  className?: string
}

export function DeploymentStatusIcon({ status, className }: DeploymentStatusIconProps) {
  switch (status) {
    case "success":
      return (
        <CheckCircle2
          className={cn("h-4 w-4 text-green-600 dark:text-green-500", className)}
          aria-label="Deployment successful"
        />
      )
    case "failed":
      return (
        <XCircle
          className={cn("h-4 w-4 text-red-600 dark:text-red-500", className)}
          aria-label="Deployment failed"
        />
      )
    case "in_progress":
      return (
        <Loader2
          className={cn("h-4 w-4 animate-spin text-orange-600 dark:text-orange-500", className)}
          aria-label="Deployment in progress"
        />
      )
    case "rolled_back":
      return (
        <RotateCcw
          className={cn("h-4 w-4 text-gray-600 dark:text-gray-500", className)}
          aria-label="Deployment rolled back"
        />
      )
  }
}

export function getStatusBadgeColor(status: DeploymentStatus): string {
  switch (status) {
    case "success":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    case "in_progress":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
    case "rolled_back":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
  }
}

export function getStatusLabel(status: DeploymentStatus): string {
  switch (status) {
    case "success":
      return "Success"
    case "failed":
      return "Failed"
    case "in_progress":
      return "In Progress"
    case "rolled_back":
      return "Rolled Back"
  }
}
