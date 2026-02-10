import type { DeploymentStatusHistoryEntry } from "@dtapline/domain/Deployment"
import { formatDistanceToNow } from "date-fns"
import { ExternalLink } from "lucide-react"
import { getStatusBadgeColor, getStatusLabel } from "./DeploymentStatusIcon"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"

interface DeploymentStatusHistoryProps {
  statusHistory: Array<DeploymentStatusHistoryEntry>
}

export function DeploymentStatusHistory({ statusHistory }: DeploymentStatusHistoryProps) {
  if (statusHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No status history available for this deployment.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          This may be an older deployment created before status history tracking was implemented.
        </p>
      </div>
    )
  }

  // Sort by timestamp descending (most recent first)
  const sortedHistory = [...statusHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">When</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead>Build</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedHistory.map((entry, index) => {
            const timestamp = new Date(entry.timestamp)
            const relativeTime = formatDistanceToNow(timestamp, { addSuffix: true })
            const absoluteTime = timestamp.toLocaleString()

            return (
              <TableRow key={`${entry.timestamp}-${index}`}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{relativeTime}</span>
                    <span className="text-xs text-muted-foreground">{absoluteTime}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusBadgeColor(entry.status)}>
                    {getStatusLabel(entry.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {entry.cicdBuildUrl ?
                    (
                      <a
                        href={entry.cicdBuildUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        {entry.cicdBuildId || "View Build"}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) :
                    entry.cicdBuildId ?
                    <span className="text-sm text-muted-foreground">{entry.cicdBuildId}</span> :
                    <span className="text-sm text-muted-foreground">N/A</span>}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
