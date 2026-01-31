import { Effect } from "effect"

/**
 * Extract version from git tag using regex pattern
 *
 * @param gitTag - Optional git tag (e.g., "v1.2.3", "api-server-v1.7.2")
 * @param commitSha - Commit SHA as fallback
 * @param pattern - Optional regex pattern with one capturing group
 * @returns Extracted version string
 *
 * @example
 * extractVersion("v1.2.3", "abc123", undefined) // "1.2.3"
 * extractVersion("api-server-v1.7.2", "abc123", "api-server-v?(\\d+\\.\\d+\\.\\d+)") // "1.7.2"
 * extractVersion(undefined, "abc123def", undefined) // "abc123d" (first 7 chars of SHA)
 */
export function extractVersion(
  gitTag: string | undefined,
  commitSha: string,
  pattern?: string
): string {
  // If no tag provided, return short commit SHA
  if (!gitTag) {
    return commitSha.substring(0, 7)
  }

  // Default pattern: match semantic versioning with optional "v" prefix
  // Matches: v1.2.3, 1.2.3, release-1.2.3, etc.
  const regex = new RegExp(pattern || "v?(\\d+\\.\\d+\\.\\d+)")

  const match = gitTag.match(regex)

  // If pattern matches and has a capturing group, return the captured version
  if (match && match[1]) {
    return match[1]
  }

  // If no match or no capturing group, return the tag as-is
  return gitTag
}

/**
 * Effect-based version extractor for use in Effect pipelines
 */
export const extractVersionEffect = (
  gitTag: string | undefined,
  commitSha: string,
  pattern?: string
): Effect.Effect<string> => Effect.sync(() => extractVersion(gitTag, commitSha, pattern))

/**
 * Test if a pattern successfully extracts a version from a tag
 * Used for pattern validation in the UI
 */
export function testPattern(
  pattern: string,
  testTag: string
): { success: boolean; extractedVersion?: string; error?: string } {
  try {
    const regex = new RegExp(pattern)
    const match = testTag.match(regex)

    if (!match) {
      return { success: false, error: "Pattern does not match the test tag" }
    }

    if (!match[1]) {
      return { success: false, error: "Pattern must have one capturing group: (\\d+\\.\\d+\\.\\d+)" }
    }

    return { success: true, extractedVersion: match[1] }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid regex pattern"
    }
  }
}
