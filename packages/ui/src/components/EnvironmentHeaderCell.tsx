import type { Environment } from "@dtapline/domain/Environment"

interface EnvironmentHeaderCellProps {
  environment: Environment
}

export function EnvironmentHeaderCell({ environment }: EnvironmentHeaderCellProps) {
  return (
    <th
      key={environment.id}
      className="min-w-[150px] border bg-muted/50 p-3 text-left font-medium"
    >
      <div className="flex flex-col gap-1">
        <span>{environment.name}</span>
        {environment.color && (
          <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: environment.color }}
            />
            {environment.slug}
          </span>
        )}
      </div>
    </th>
  )
}
