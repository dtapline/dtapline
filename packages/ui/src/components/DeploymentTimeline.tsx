import type { Deployment } from "@dtapline/domain/Deployment"
import { Link } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import { ArrowRight, ExternalLink, Loader2 } from "lucide-react"
import { useEffect, useRef } from "react"
import { useDeploymentHistory } from "../lib/hooks/use-deployments"
import { cn } from "../lib/utils"
import { DeploymentStatusIcon, getStatusLabel } from "./DeploymentStatusIcon"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet"

interface DeploymentTimelineProps {
  projectId: string
  serviceId: string
  environmentId: string
  serviceName: string
  environmentName: string
  isOpen: boolean
  onClose: () => void
}

export function DeploymentTimeline({
  environmentId,
  environmentName,
  isOpen,
  onClose,
  projectId,
  serviceId,
  serviceName
}: DeploymentTimelineProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useDeploymentHistory(projectId, {
    serviceId,
    environmentId
  })

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Handle infinite scroll
  useEffect(() => {
    if (!isOpen) return

    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { clientHeight, scrollHeight, scrollTop } = container
      const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 100

      if (scrolledToBottom && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [isOpen, hasNextPage, isFetchingNextPage, fetchNextPage])

  const deployments = data?.pages.flatMap((page) => page.deployments) ?? []

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[400px] sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle>Deployment Timeline</SheetTitle>
          <SheetDescription>
            {serviceName} → {environmentName}
          </SheetDescription>
        </SheetHeader>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto pr-2"
          style={{ maxHeight: "calc(100vh - 120px)" }}
        >
          {isLoading ?
            (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) :
            deployments.length === 0 ?
            (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No deployments found for this service and environment.
                </p>
              </div>
            ) :
            (
              <div className="relative pt-4">
                {/* Vertical line - aligned with center of square icons */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

                {/* Timeline items */}
                <div className="space-y-0">
                  {deployments.map((deployment) => (
                    <TimelineItem
                      key={deployment.id}
                      deployment={deployment}
                      projectId={projectId}
                      onClose={onClose}
                    />
                  ))}
                </div>

                {/* Loading more indicator */}
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
                  </div>
                )}

                {/* End of list indicator */}
                {!hasNextPage && deployments.length > 0 && (
                  <div className="py-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      No more deployments to load
                    </p>
                  </div>
                )}
              </div>
            )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface TimelineItemProps {
  deployment: Deployment
  projectId: string
  onClose: () => void
}

function TimelineItem({ deployment, onClose, projectId }: TimelineItemProps) {
  const timestamp = new Date(deployment.deployedAt)
  const relativeTime = formatDistanceToNow(timestamp, { addSuffix: true })
  const { iconBg } = getStatusIconStyle(deployment.status)

  return (
    <Link
      to="/project/$projectId/deployments/$deploymentId"
      params={{ projectId, deploymentId: deployment.id }}
      onClick={onClose}
      className="group relative flex w-full gap-3 rounded-lg p-3 text-left transition-colors duration-150 hover:bg-muted/50"
    >
      {/* Timeline dot - square like matrix */}
      <div
        className={cn(
          "relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded transition-all duration-150",
          iconBg,
          "group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2"
        )}
      >
        <DeploymentStatusIcon status={deployment.status} className="!h-5 !w-5 !text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">
            {deployment.version || deployment.commitSha.substring(0, 7)}
          </span>
          <span className="text-xs text-muted-foreground">{relativeTime}</span>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{getStatusLabel(deployment.status)}</span>
        </div>

        {deployment.cicdBuildUrl && (
          <div className="flex items-center gap-1 pt-1">
            <a
              href={deployment.cicdBuildUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View Build
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* View details indicator */}
        <div className="flex items-center gap-1 pt-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
          <span>View details</span>
          <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  )
}

function getStatusIconStyle(status: string): { iconBg: string } {
  switch (status) {
    case "success":
      return { iconBg: "bg-green-500 dark:bg-green-600" }
    case "failed":
      return { iconBg: "bg-red-500 dark:bg-red-600" }
    case "in_progress":
      return { iconBg: "bg-amber-500 dark:bg-amber-600" }
    case "rolled_back":
      return { iconBg: "bg-gray-500 dark:bg-gray-600" }
    default:
      return { iconBg: "bg-muted" }
  }
}
