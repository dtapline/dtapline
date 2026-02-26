/**
 * useMatrixData hook
 *
 * Fetches all projects and their deployment matrices.
 * Auto-refreshes on a configurable interval.
 * Exposes a manual refresh() function.
 * Sets authExpired=true on 401 so App can show the login screen.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { AuthExpiredError, getMatrix, getProjects } from "../api-client.js"
import type { DataState, ProjectMatrixData } from "../types.js"

interface UseMatrixDataOptions {
  readonly serverUrl: string
  readonly token: string
  readonly refreshInterval: number // milliseconds
}

interface UseMatrixDataResult {
  readonly state: DataState
  readonly refresh: () => void
}

export function useMatrixData({
  refreshInterval,
  serverUrl,
  token
}: UseMatrixDataOptions): UseMatrixDataResult {
  const [state, setState] = useState<DataState>({ kind: "idle" })
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    setState((prev) => {
      // Keep data visible during refresh (show loading indicator in header)
      if (prev.kind === "data") return prev
      return { kind: "loading" }
    })

    try {
      const projects = await getProjects(serverUrl, token)

      // Fetch all project matrices in parallel
      const matrixResults = await Promise.all(
        projects.map(async (project) => {
          const matrix = await getMatrix(serverUrl, token, project.id)
          return { project, matrix } satisfies ProjectMatrixData
        })
      )

      if (!isMountedRef.current) return

      setState({
        kind: "data",
        projects: matrixResults,
        lastUpdated: new Date()
      })
    } catch (err) {
      if (!isMountedRef.current) return

      if (err instanceof AuthExpiredError) {
        setState({
          kind: "error",
          message: "Session expired. Please sign in again.",
          authExpired: true
        })
        return
      }

      const message = err instanceof Error ? err.message : "Failed to fetch data"
      setState((prev) => {
        // Keep showing stale data with an error note
        if (prev.kind === "data") {
          return {
            kind: "error",
            message,
            authExpired: false
          }
        }
        return { kind: "error", message, authExpired: false }
      })
    }
  }, [serverUrl, token])

  const scheduleNext = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }
    refreshTimerRef.current = setTimeout(() => {
      void fetchData().then(() => scheduleNext())
    }, refreshInterval)
  }, [fetchData, refreshInterval])

  const refresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }
    void fetchData().then(() => scheduleNext())
  }, [fetchData, scheduleNext])

  // Initial fetch + start polling
  useEffect(() => {
    isMountedRef.current = true
    void fetchData().then(() => scheduleNext())

    return () => {
      isMountedRef.current = false
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [fetchData, scheduleNext])

  return { refresh, state }
}
