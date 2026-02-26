/**
 * Header component
 *
 * Top bar showing title, server URL, last-updated timestamp, and key hints.
 */

import { useEffect, useState } from "react"

interface HeaderProps {
  readonly serverUrl: string
  readonly lastUpdated: Date | null
  readonly isLoading: boolean
}

function secondsAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 5) return "just now"
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

export function Header({ isLoading, lastUpdated, serverUrl }: HeaderProps) {
  // Tick every second so "5s ago" updates in real time
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const updatedStr = isLoading
    ? "refreshing…"
    : lastUpdated
    ? `updated ${secondsAgo(lastUpdated)}`
    : "loading…"

  // Truncate long server URLs to keep header readable
  const displayUrl = serverUrl.replace(/^https?:\/\//, "")

  return (
    <box
      style={{
        border: ["bottom"],
        borderColor: "#2d3748",
        paddingLeft: 1,
        paddingRight: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        height: 3
      }}
    >
      {/* Left: title */}
      <text>
        <strong fg="#63b3ed">Dtapline</strong>
        <span fg="#4a5568">·</span>
        <span fg="#718096">{displayUrl}</span>
      </text>

      {/* Right: status + key hints */}
      <text>
        <span fg="#4a5568">{updatedStr}</span>
        <span fg="#2d3748">│</span>
        <span fg="#4a5568">[r] refresh [q] quit</span>
      </text>
    </box>
  )
}
