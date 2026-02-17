/**
 * Generate diff/compare URLs for different Git platforms
 */

/**
 * Detect Git platform from repository URL
 */
function detectGitPlatform(repoUrl: string): "github" | "gitlab" | "bitbucket" | "azure" | "unknown" {
  const url = repoUrl.toLowerCase()
  if (url.includes("github.com")) return "github"
  if (url.includes("gitlab.com") || url.includes("gitlab")) return "gitlab"
  if (url.includes("bitbucket.org") || url.includes("bitbucket")) return "bitbucket"
  if (url.includes("dev.azure.com") || url.includes("visualstudio.com")) return "azure"
  return "unknown"
}

/**
 * Normalize repository URL to base URL (remove .git suffix, trailing slashes, path segments, query params, etc.)
 *
 * Examples:
 * - https://github.com/owner/repo/tree/main/packages/api → https://github.com/owner/repo
 * - https://github.com/owner/repo.git → https://github.com/owner/repo
 * - https://dev.azure.com/org/project/_git/repo?path=/packages/utils → https://dev.azure.com/org/project/_git/repo
 */
function normalizeRepoUrl(repoUrl: string): string {
  const platform = detectGitPlatform(repoUrl)
  let url = repoUrl.trim()

  // Parse URL to remove query parameters and hash
  try {
    const parsedUrl = new URL(url)

    // Remove query parameters and hash
    parsedUrl.search = ""
    parsedUrl.hash = ""

    url = parsedUrl.toString()
  } catch {
    // If URL parsing fails, continue with original URL
  }

  // Platform-specific path normalization
  switch (platform) {
    case "github":
      // Remove GitHub-specific paths like /tree/branch, /blob/branch, /issues, /pulls, etc.
      url = url.replace(/\/(tree|blob|commits?|pull|issues|wiki|actions|releases|tags)\/.*$/, "")
      break

    case "gitlab":
      // Remove GitLab-specific paths like /-/tree/branch, /-/blob/branch, etc.
      url = url.replace(/\/-\/(tree|blob|commits?|merge_requests|issues|wiki)\/.*$/, "")
      break

    case "bitbucket":
      // Remove Bitbucket-specific paths like /src/branch, /commits, /pull-requests, etc.
      url = url.replace(/\/(src|commits?|pull-requests|issues|downloads|wiki)\/.*$/, "")
      break

    case "azure":
      // Azure DevOps URLs are already clean after removing query params
      // Format: https://dev.azure.com/org/project/_git/repo
      break
  }

  // Remove .git suffix
  if (url.endsWith(".git")) {
    url = url.slice(0, -4)
  }

  // Remove trailing slash
  if (url.endsWith("/")) {
    url = url.slice(0, -1)
  }

  return url
}

/**
 * Generate diff URL between two commits for different Git platforms
 *
 * @param repoUrl - Repository URL (e.g., https://github.com/owner/repo)
 * @param fromCommit - Starting commit SHA (older commit - usually in next environment)
 * @param toCommit - Ending commit SHA (newer commit - current deployment)
 * @returns Diff URL or null if platform is unsupported
 */
export function generateDiffUrl(
  repoUrl: string,
  fromCommit: string,
  toCommit: string
): string | null {
  const platform = detectGitPlatform(repoUrl)
  const baseUrl = normalizeRepoUrl(repoUrl)

  switch (platform) {
    case "github":
      // GitHub: https://github.com/owner/repo/compare/commit1...commit2
      return `${baseUrl}/compare/${fromCommit}...${toCommit}`

    case "gitlab":
      // GitLab: https://gitlab.com/owner/repo/-/compare/commit1...commit2
      return `${baseUrl}/-/compare/${fromCommit}...${toCommit}`

    case "bitbucket":
      // Bitbucket: https://bitbucket.org/owner/repo/branches/compare/commit2..commit1
      return `${baseUrl}/branches/compare/${toCommit}..${fromCommit}`

    case "azure":
      // Azure DevOps: https://dev.azure.com/org/project/_git/repo/branchCompare?baseVersion=GC{commit1}&targetVersion=GC{commit2}
      return `${baseUrl}/branchCompare?baseVersion=GC${fromCommit}&targetVersion=GC${toCommit}`

    default:
      // Unknown platform - return null
      return null
  }
}
