/**
 * StatusCell component
 *
 * Renders a single deployment cell in the matrix, styled after the web UI:
 * a colored square badge with a white status icon, followed by version (bold)
 * and relative time on separate lines.
 */

import { formatDistanceToNow } from "date-fns"
import type { Deployment } from "../types.js"

interface StatusCellProps {
  readonly deployment: Deployment | null | undefined
  readonly colWidth: number
}

type StatusInfo = {
  readonly icon: string // Unicode char rendered inside the colored badge
  readonly bg: string // Badge background color
}

function getStatusInfo(status: Deployment["status"]): StatusInfo {
  switch (status) {
    case "success":
      return { icon: "✓", bg: "#22863a" }
    case "failed":
      return { icon: "✕", bg: "#cb2431" }
    case "in_progress":
      return { icon: "◌", bg: "#b08800" }
    case "rolled_back":
      return { icon: "↩", bg: "#6a737d" }
    default:
      return { icon: "?", bg: "#444d56" }
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + "…"
}

function relativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return ""
  }
}

export function StatusCell({ colWidth, deployment }: StatusCellProps) {
  if (!deployment) {
    return (
      <box
        style={{
          width: colWidth,
          paddingLeft: 1,
          paddingRight: 1
        }}
      >
        <text fg="#4a5568">—</text>
      </box>
    )
  }

  const { bg, icon } = getStatusInfo(deployment.status)
  const time = relativeTime(deployment.deployedAt)

  // Reserve: 1 pad-left + 3 badge (space+icon+space) + 1 gap + version + 1 pad-right
  const versionWidth = Math.max(colWidth - 7, 4)
  const version = truncate(deployment.version, versionWidth)
  // Time sits under the version text, indented past the badge
  const timeWidth = Math.max(colWidth - 6, 4)
  const timeStr = truncate(time, timeWidth)

  return (
    <box
      style={{
        width: colWidth,
        paddingLeft: 1,
        paddingRight: 1,
        flexDirection: "column"
      }}
    >
      {/* Top row: [badge] version */}
      <box style={{ flexDirection: "row", alignItems: "center" }}>
        {/* Colored square badge */}
        <box
          backgroundColor={bg}
          style={{
            paddingLeft: 1,
            paddingRight: 1
          }}
        >
          <text fg="#ffffff">{icon}</text>
        </box>
        <text></text>
        <text fg="#e2e8f0">{version}</text>
      </box>
      {/* Bottom row: time, indented to align under version */}
      <box style={{ flexDirection: "row" }}>
        <text>{"    "}</text>
        <text fg="#718096">{timeStr}</text>
      </box>
    </box>
  )
}
