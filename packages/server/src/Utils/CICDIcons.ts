/**
 * CI/CD Platform Icon URLs
 * Returns Simple Icons CDN URLs for various CI/CD platforms
 */

export function getCICDIcon(platform: string): string | null {
  // Mapping of platform names to Simple Icons slug names
  const iconMap: Record<string, string> = {
    "GitHub Actions": "githubactions",
    "Azure Pipelines": "azurepipelines",
    "GitLab CI": "gitlab",
    "CircleCI": "circleci",
    "Jenkins": "jenkins",
    "Travis CI": "travisci",
    "Bitbucket Pipelines": "bitbucket",
    "TeamCity": "teamcity",
    "AWS CodeBuild": "amazonaws",
    "Google Cloud Build": "googlecloud",
    "Drone CI": "drone",
    "Bamboo": "bamboo"
  }

  const iconSlug = iconMap[platform]
  if (!iconSlug) return null

  // Return Simple Icons CDN URL
  return `https://cdn.simpleicons.org/${iconSlug}`
}
