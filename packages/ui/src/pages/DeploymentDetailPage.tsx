import type { Deployment } from "@dtapline/domain/Deployment"
import { Link, useParams } from "@tanstack/react-router"
import { formatDistance } from "date-fns"
import { ChevronRight, ExternalLink } from "lucide-react"
import { useState } from "react"
import { DeploymentStatusHistory } from "../components/DeploymentStatusHistory"
import { DeploymentStatusIcon } from "../components/DeploymentStatusIcon"
import { DeploymentTimeline } from "../components/DeploymentTimeline"
import { Button } from "../components/ui/button"
import { useDeployment } from "../lib/hooks/use-deployments"
import { useEnvironments } from "../lib/hooks/use-environments"
import { useProject } from "../lib/hooks/use-projects"
import { useServices } from "../lib/hooks/use-services"

type Tab = "summary" | "history"

export function DeploymentDetailPage() {
  const { deploymentId, projectId } = useParams({ strict: false }) as { projectId: string; deploymentId: string }
  const [activeTab, setActiveTab] = useState<Tab>("summary")
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)

  // Fetch deployment data
  const { data: deployment, isLoading: isLoadingDeployment } = useDeployment(projectId, deploymentId)
  const { data: project, isLoading: isLoadingProject } = useProject(projectId)
  const { data: services } = useServices(projectId)
  const { data: environments } = useEnvironments()

  if (isLoadingDeployment || isLoadingProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading deployment details...</div>
      </div>
    )
  }

  if (!deployment || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Deployment not found</div>
      </div>
    )
  }

  // Get service and environment names
  const service = services?.find((s) => s.id === deployment.serviceId)
  const environment = environments?.find((e) => e.id === deployment.environmentId)
  const serviceName = service?.name || String(deployment.serviceId)
  const environmentName = environment?.name || String(deployment.environmentId)

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b px-8 py-6">
          {/* Breadcrumbs */}
          <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              to="/"
              className="transition-colors hover:text-foreground"
            >
              Projects
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link
              to="/project/$projectId"
              params={{ projectId }}
              className="transition-colors hover:text-foreground"
            >
              {project.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">
              {serviceName} → {deployment.version}
            </span>
          </nav>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Status icon with colored background */}
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded ${
                  getStatusBg(deployment.status)
                }`}
              >
                <DeploymentStatusIcon status={deployment.status} className="!h-6 !w-6 !text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {serviceName} → {deployment.version}
                </h1>
                <div className="mt-1 flex items-center gap-2">
                  {environment?.color && (
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: environment.color }}
                    />
                  )}
                  <p className="text-sm text-muted-foreground">{environmentName}</p>
                </div>
              </div>
            </div>
            <Button onClick={() => setIsTimelineOpen(true)}>View Timeline</Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b px-8">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab("summary")}
              className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === "summary"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Deployment Summary
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === "history"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Status History
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          {activeTab === "summary" && <DeploymentSummary deployment={deployment} />}
          {activeTab === "history" && <DeploymentStatusHistory statusHistory={[...deployment.statusHistory]} />}
        </div>
      </div>

      {/* Timeline Drawer */}
      <DeploymentTimeline
        projectId={projectId}
        serviceId={String(deployment.serviceId)}
        environmentId={String(deployment.environmentId)}
        serviceName={serviceName}
        environmentName={environmentName}
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
      />
    </>
  )
}

/**
 * Deployment Summary Component
 */
function DeploymentSummary({ deployment }: { deployment: Deployment }) {
  return (
    <div className="space-y-6">
      {/* Version Information */}
      <Section title="Version Information">
        <InfoRow label="Version" value={deployment.version} />
        <InfoRow label="Commit SHA" value={deployment.commitSha} />
        {deployment.gitTag && <InfoRow label="Git Tag" value={deployment.gitTag} />}
        {deployment.pullRequestUrl && (
          <InfoRow
            label="Pull Request"
            value={
              <a
                href={deployment.pullRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                View PR <ExternalLink className="h-3 w-3" />
              </a>
            }
          />
        )}
      </Section>

      {/* Deployment Information */}
      <Section title="Deployment Information">
        {deployment.deployedBy && <InfoRow label="Deployed By" value={deployment.deployedBy} />}
        <InfoRow
          label="Deployed At"
          value={`${deployment.deployedAt.toLocaleString()} (${
            formatDistance(deployment.deployedAt, new Date(), { addSuffix: true })
          })`}
        />
        <InfoRow
          label="Status"
          value={
            <span className="flex items-center gap-2">
              <DeploymentStatusIcon status={deployment.status} className="h-4 w-4" />
              <span className="capitalize">{deployment.status}</span>
            </span>
          }
        />
      </Section>

      {/* CI/CD Information */}
      {(deployment.cicdPlatform || deployment.cicdBuildUrl || deployment.cicdBuildId) && (
        <Section title="CI/CD Information">
          {deployment.cicdPlatform && <InfoRow label="Platform" value={deployment.cicdPlatform} />}
          {deployment.cicdBuildId && <InfoRow label="Build ID" value={deployment.cicdBuildId} />}
          {deployment.cicdBuildUrl && (
            <InfoRow
              label="Build URL"
              value={
                <a
                  href={deployment.cicdBuildUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  View Build <ExternalLink className="h-3 w-3" />
                </a>
              }
            />
          )}
        </Section>
      )}

      {/* Additional Information */}
      {(deployment.buildUrl || deployment.releaseNotes || deployment.metadata) && (
        <Section title="Additional Information">
          {deployment.buildUrl && (
            <InfoRow
              label="Build URL"
              value={
                <a
                  href={deployment.buildUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  View Build <ExternalLink className="h-3 w-3" />
                </a>
              }
            />
          )}
          {deployment.releaseNotes && <InfoRow label="Release Notes" value={deployment.releaseNotes} />}
          {deployment.metadata && (
            <InfoRow
              label="Metadata"
              value={<pre className="text-sm">{JSON.stringify(deployment.metadata, null, 2)}</pre>}
            />
          )}
        </Section>
      )}
    </div>
  )
}

/**
 * Section Component
 */
function Section({ children, title }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

/**
 * Info Row Component
 */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <dt className="w-40 shrink-0 text-sm font-medium text-muted-foreground">{label}:</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

/**
 * Get status background color
 */
function getStatusBg(status: string): string {
  switch (status) {
    case "success":
      return "bg-green-500 dark:bg-green-600"
    case "failed":
      return "bg-red-500 dark:bg-red-600"
    case "in_progress":
      return "bg-amber-500 dark:bg-amber-600"
    case "rolled_back":
      return "bg-gray-500 dark:bg-gray-600"
    default:
      return "bg-muted"
  }
}
