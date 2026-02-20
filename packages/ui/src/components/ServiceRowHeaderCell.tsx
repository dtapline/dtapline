import type { Service } from "@dtapline/domain/Service"

interface ServiceRowHeaderCellProps {
  service: Service
}

export function ServiceRowHeaderCell({ service }: ServiceRowHeaderCellProps) {
  return (
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
  )
}
