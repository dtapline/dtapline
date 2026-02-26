/**
 * Matrix component
 *
 * Renders the aggregated deployment matrix across all projects.
 * Columns = environments (sorted by order), rows grouped by project → service.
 * Column widths are calculated from terminal width, with truncation on overflow.
 */

import { useTerminalDimensions } from "@opentui/react"
import type { Environment, ProjectMatrixData } from "../types.js"
import { StatusCell } from "./StatusCell.js"

const SERVICE_COL_MIN_WIDTH = 14
const ENV_COL_MIN_WIDTH = 14

interface MatrixProps {
  readonly projects: ReadonlyArray<ProjectMatrixData>
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + "…"
}

/** A full-width horizontal divider rendered as a text row (no border box needed). */
function Divider({ width }: { readonly width: number }) {
  return (
    <box style={{ width, height: 1 }}>
      <text fg="#2d3748">{"─".repeat(width)}</text>
    </box>
  )
}

export function Matrix({ projects }: MatrixProps) {
  const { width } = useTerminalDimensions()

  if (projects.length === 0) {
    return (
      <box style={{ padding: 2 }}>
        <text fg="#718096">No projects found.</text>
      </box>
    )
  }

  // Collect all unique environments across all projects, sorted by order
  const allEnvs: Array<Environment> = Array.from(
    new Map(
      projects.flatMap((p) => p.matrix.environments.map((e) => [e.id, e]))
    ).values()
  ).sort((a, b) => a.order - b.order)

  if (allEnvs.length === 0) {
    return (
      <box style={{ padding: 2 }}>
        <text fg="#718096">No environments configured.</text>
      </box>
    )
  }

  // Responsive width distribution:
  // All columns compete for totalWidth proportionally.
  // Service column's natural weight is the longest text it needs to show (name or slug).
  // Each env column's natural weight is ENV_COL_MIN_WIDTH.
  // We compute a proportional split, then clamp the service column to a minimum.
  const totalWidth = width - 1 // 1 for scrollbar gutter
  const longestServiceText = projects
    .flatMap((p) => p.matrix.services.flatMap((s) => [s.name.length, s.slug.length]))
    .reduce((max, len) => Math.max(max, len), 0)
  // +3 accounts for paddingLeft: 2 and 1 char breathing room (matches truncate offset)
  const naturalServiceColWidth = longestServiceText + 3
  const totalNaturalWidth = naturalServiceColWidth + allEnvs.length * ENV_COL_MIN_WIDTH
  const serviceColWidth = Math.max(
    SERVICE_COL_MIN_WIDTH,
    Math.min(
      Math.round((naturalServiceColWidth / totalNaturalWidth) * totalWidth),
      totalWidth - allEnvs.length * ENV_COL_MIN_WIDTH
    )
  )
  const envColWidth = Math.max(
    ENV_COL_MIN_WIDTH,
    Math.floor((totalWidth - serviceColWidth) / allEnvs.length)
  )

  return (
    <scrollbox focused style={{ flexGrow: 1 }}>
      {/* Column header row */}
      <box flexDirection="row" style={{ width: totalWidth }}>
        <box style={{ width: serviceColWidth, paddingLeft: 1 }}>
          <text fg="#4a5568">Service</text>
        </box>
        {allEnvs.map((env) => (
          <box key={env.id} style={{ width: envColWidth, paddingLeft: 1 }}>
            <text>
              <span fg={env.color || "#718096"}>●</span> <span fg="#a0aec0">{truncate(env.name, envColWidth - 3)}</span>
            </text>
          </box>
        ))}
      </box>
      <Divider width={totalWidth} />

      {/* Project sections */}
      {projects.map((projectData) => (
        <ProjectSection
          key={projectData.project.id}
          projectData={projectData}
          allEnvs={allEnvs}
          serviceColWidth={serviceColWidth}
          envColWidth={envColWidth}
          totalWidth={totalWidth}
        />
      ))}
    </scrollbox>
  )
}

interface ProjectSectionProps {
  readonly projectData: ProjectMatrixData
  readonly allEnvs: ReadonlyArray<Environment>
  readonly serviceColWidth: number
  readonly envColWidth: number
  readonly totalWidth: number
}

function ProjectSection({ allEnvs, envColWidth, projectData, serviceColWidth, totalWidth }: ProjectSectionProps) {
  const { matrix, project } = projectData
  const enabledEnvIds = new Set(matrix.environments.map((e) => e.id))

  return (
    <box flexDirection="column" style={{ width: totalWidth }}>
      {/* Project header */}
      <box
        backgroundColor="#1a202c"
        style={{
          width: totalWidth,
          paddingLeft: 1,
          paddingTop: 1,
          paddingBottom: 1
        }}
      >
        <text>
          <strong fg="#63b3ed">{project.name}</strong>
          {project.description && <span fg="#4a5568">— {truncate(project.description, 50)}</span>}
        </text>
      </box>
      <Divider width={totalWidth} />

      {/* Service rows */}
      {matrix.services.length === 0 ?
        (
          <box style={{ paddingLeft: serviceColWidth + 1, paddingTop: 1, paddingBottom: 1 }}>
            <text fg="#4a5568">No services configured</text>
          </box>
        ) :
        (
          matrix.services.map((service, idx) => {
            const rowBg = idx % 2 === 0 ? "#171923" : "#1a202c"
            return (
              <box key={service.id} flexDirection="column" style={{ width: totalWidth }}>
                {/* Row content */}
                <box
                  flexDirection="row"
                  backgroundColor={rowBg}
                  style={{ width: totalWidth, height: 2, alignItems: "center" }}
                >
                  {/* Service name */}
                  <box
                    backgroundColor={rowBg}
                    style={{
                      width: serviceColWidth,
                      paddingLeft: 2,
                      flexDirection: "column"
                    }}
                  >
                    <text fg="#e2e8f0">{truncate(service.name, serviceColWidth - 3)}</text>
                    <text fg="#4a5568">{truncate(service.slug, serviceColWidth - 3)}</text>
                  </box>

                  {/* Deployment cells */}
                  {allEnvs.map((env) => {
                    const isEnabled = enabledEnvIds.has(env.id)
                    const deployment = isEnabled
                      ? (matrix.deployments[env.id]?.[service.id] ?? null)
                      : undefined
                    const cellBg = isEnabled ? rowBg : "#111827"

                    return (
                      <box
                        key={env.id}
                        backgroundColor={cellBg}
                        style={{ width: envColWidth }}
                      >
                        {!isEnabled ?
                          (
                            <box style={{ paddingLeft: 1 }}>
                              <text fg="#2d3748">—</text>
                            </box>
                          ) :
                          <StatusCell deployment={deployment} colWidth={envColWidth} />}
                      </box>
                    )
                  })}
                </box>
                {/* Separator below each row */}
                <Divider width={totalWidth} />
              </box>
            )
          })
        )}
    </box>
  )
}
