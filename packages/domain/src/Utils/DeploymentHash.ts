import { createHash } from "node:crypto"

/**
 * Generates a deterministic hash for deployment identity
 *
 * A deployment is uniquely identified by:
 * - projectId
 * - environmentId
 * - serviceId
 * - commitSha (primary identifier)
 * - version (extracted from gitTag or fallback to commitSha)
 *
 * This ensures that:
 * - Same commit + same version to same environment = same deployment (upsert on retry)
 * - Same commit + different version to same environment = different deployment
 * - Different commit = always different deployment
 *
 * @param projectId - Project identifier
 * @param environmentId - Environment identifier
 * @param serviceId - Service identifier
 * @param commitSha - Git commit SHA
 * @param version - Version string (extracted from gitTag or commitSha)
 * @returns SHA-256 hash as hex string
 */
export function generateDeploymentHash(
  projectId: string,
  environmentId: string,
  serviceId: string,
  commitSha: string,
  version: string
): string {
  // Combine all identifiers with colon separator
  const data = `${projectId}:${environmentId}:${serviceId}:${commitSha}:${version}`

  // Generate SHA-256 hash
  return createHash("sha256").update(data).digest("hex")
}
