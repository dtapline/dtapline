import type { Deployment } from "@dtapline/domain/Deployment"
import type { Environment } from "@dtapline/domain/Environment"
import type { Service } from "@dtapline/domain/Service"
import { DeploymentCell } from "./DeploymentCell"

interface MobileServiceCardProps {
  projectId: string
  service: Service
  environments: ReadonlyArray<Environment>
  deployments: Record<string, Deployment | null>
}

export function MobileServiceCard({
  deployments,
  environments,
  projectId,
  service
}: MobileServiceCardProps) {
  return (
    <div className="rounded-lg border bg-card">
      {/* Service header */}
      <div className="border-b bg-muted/50 p-4">
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
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold">{service.name}</span>
            {service.repositoryUrl && (
              <a
                href={service.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:underline"
              >
                {service.slug}
              </a>
            )}
          </div>
        </div>
      </div>
      {/* Environment deployments */}
      <div className="divide-y">
        {environments.map((env) => {
          const deployment = deployments[env.id]
          return (
            <div key={env.id} className="p-3">
              <div className="mb-2 flex items-center gap-2">
                {env.color && (
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: env.color }}
                  />
                )}
                <span className="text-sm font-medium">{env.name}</span>
              </div>
              {deployment ?
                <DeploymentCell projectId={projectId} deployment={deployment} compact /> :
                (
                  <div className="pl-4">
                    <span className="text-xs text-muted-foreground">Not deployed</span>
                  </div>
                )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
