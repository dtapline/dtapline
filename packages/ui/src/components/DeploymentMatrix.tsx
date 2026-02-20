import type { Deployment } from "@dtapline/domain/Deployment"
import type { Environment } from "@dtapline/domain/Environment"
import type { Service } from "@dtapline/domain/Service"
import { DeploymentCell } from "./DeploymentCell"
import { EnvironmentHeaderCell } from "./EnvironmentHeaderCell"
import { MobileServiceCard } from "./MobileServiceCard"
import { ServiceRowHeaderCell } from "./ServiceRowHeaderCell"

interface DeploymentMatrixProps {
  projectId: string
  environments: ReadonlyArray<Environment>
  services: ReadonlyArray<Service>
  deployments: Record<string, Record<string, Deployment | null>>
  isLoading?: boolean
}

export function DeploymentMatrix({
  deployments,
  environments,
  isLoading = false,
  projectId,
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
    <>
      {/* Mobile/Small screens: Card layout */}
      <div className="block sm:hidden space-y-4">
        {services.map((service) => {
          // Transform deployments for this service: envId -> deployment
          const serviceDeployments: Record<string, Deployment | null> = {}
          environments.forEach((env) => {
            serviceDeployments[env.id] = deployments[env.id]?.[service.id] ?? null
          })

          return (
            <MobileServiceCard
              key={service.id}
              projectId={projectId}
              service={service}
              environments={environments}
              deployments={serviceDeployments}
            />
          )
        })}
      </div>

      {/* Tablet/Desktop: Full table */}
      <div className="hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[200px] border bg-background p-3 text-left font-medium">
                  Service / Environment
                </th>
                {environments.map((env) => <EnvironmentHeaderCell key={env.id} environment={env} />)}
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <ServiceRowHeaderCell service={service} />
                  {environments.map((env) => {
                    const deployment = deployments[env.id]?.[service.id]
                    return (
                      <td key={env.id} className="border p-0">
                        {deployment ?
                          <DeploymentCell projectId={projectId} deployment={deployment} /> :
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
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
