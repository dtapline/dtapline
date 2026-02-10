import type { DeploymentStatus } from "@dtapline/domain/Deployment"
import { CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react"
import { cn } from "../lib/utils"

interface DeploymentStatusIconProps {
  status: DeploymentStatus
  className?: string
}

export function DeploymentStatusIcon({ className, status }: DeploymentStatusIconProps) {
  switch (status) {
    case "success":
      return (
        <CheckCircle2
          className={cn("h-4 w-4 text-green-600", className)}
          aria-label="Deployment successful"
        />
      )
    case "failed":
      return (
        <XCircle
          className={cn("h-4 w-4 text-red-600", className)}
          aria-label="Deployment failed"
        />
      )
    case "in_progress":
      return (
        <Loader2
          className={cn("h-4 w-4 animate-spin text-amber-600", className)}
          aria-label="Deployment in progress"
        />
      )
    case "rolled_back":
      return (
        <RotateCcw
          className={cn("h-4 w-4 text-gray-600", className)}
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
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
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
