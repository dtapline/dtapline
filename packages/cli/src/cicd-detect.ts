/**
 * CI/CD Environment Detection
 * Detects which CI/CD platform the CLI is running on based on environment variables
 */

export interface CICDInfo {
  platform: string
  detected: boolean
  buildUrl?: string
  buildId?: string
}

/**
 * Detect CI/CD platform from environment variables
 */
export function detectCICD(): CICDInfo {
  // GitHub Actions
  if (process.env.GITHUB_ACTIONS === "true") {
    const buildUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : undefined
    
    return {
      platform: "GitHub Actions",
      detected: true,
      ...(buildUrl && { buildUrl }),
      ...(process.env.GITHUB_RUN_ID && { buildId: process.env.GITHUB_RUN_ID })
    }
  }

  // Azure Pipelines
  if (process.env.TF_BUILD === "True" || process.env.AZURE_PIPELINES === "true") {
    const buildUrl = process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI && process.env.SYSTEM_TEAMPROJECT && process.env.BUILD_BUILDID
      ? `${process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI}${process.env.SYSTEM_TEAMPROJECT}/_build/results?buildId=${process.env.BUILD_BUILDID}`
      : undefined
    
    return {
      platform: "Azure Pipelines",
      detected: true,
      ...(buildUrl && { buildUrl }),
      ...(process.env.BUILD_BUILDID && { buildId: process.env.BUILD_BUILDID })
    }
  }

  // GitLab CI
  if (process.env.GITLAB_CI === "true") {
    const buildUrl = process.env.CI_PROJECT_URL && process.env.CI_PIPELINE_ID
      ? `${process.env.CI_PROJECT_URL}/-/pipelines/${process.env.CI_PIPELINE_ID}`
      : undefined
    
    return {
      platform: "GitLab CI",
      detected: true,
      ...(buildUrl && { buildUrl }),
      ...(process.env.CI_PIPELINE_ID && { buildId: process.env.CI_PIPELINE_ID })
    }
  }

  // CircleCI
  if (process.env.CIRCLECI === "true") {
    return {
      platform: "CircleCI",
      detected: true,
      ...(process.env.CIRCLE_BUILD_URL && { buildUrl: process.env.CIRCLE_BUILD_URL }),
      ...(process.env.CIRCLE_BUILD_NUM && { buildId: process.env.CIRCLE_BUILD_NUM })
    }
  }

  // Jenkins
  if (process.env.JENKINS_URL) {
    return {
      platform: "Jenkins",
      detected: true,
      ...(process.env.BUILD_URL && { buildUrl: process.env.BUILD_URL }),
      ...(process.env.BUILD_NUMBER && { buildId: process.env.BUILD_NUMBER })
    }
  }

  // Travis CI
  if (process.env.TRAVIS === "true") {
    return {
      platform: "Travis CI",
      detected: true,
      ...(process.env.TRAVIS_BUILD_WEB_URL && { buildUrl: process.env.TRAVIS_BUILD_WEB_URL }),
      ...(process.env.TRAVIS_BUILD_ID && { buildId: process.env.TRAVIS_BUILD_ID })
    }
  }

  // Bitbucket Pipelines
  if (process.env.BITBUCKET_PIPELINE_UUID) {
    const buildUrl = process.env.BITBUCKET_GIT_HTTP_ORIGIN && process.env.BITBUCKET_BUILD_NUMBER
      ? `${process.env.BITBUCKET_GIT_HTTP_ORIGIN}/addon/pipelines/home#!/results/${process.env.BITBUCKET_BUILD_NUMBER}`
      : undefined
    
    return {
      platform: "Bitbucket Pipelines",
      detected: true,
      ...(buildUrl && { buildUrl }),
      ...(process.env.BITBUCKET_BUILD_NUMBER && { buildId: process.env.BITBUCKET_BUILD_NUMBER })
    }
  }

  // TeamCity
  if (process.env.TEAMCITY_VERSION) {
    return {
      platform: "TeamCity",
      detected: true,
      ...(process.env.BUILD_URL && { buildUrl: process.env.BUILD_URL }),
      ...(process.env.BUILD_NUMBER && { buildId: process.env.BUILD_NUMBER })
    }
  }

  // AWS CodeBuild
  if (process.env.CODEBUILD_BUILD_ID) {
    const buildUrl = process.env.CODEBUILD_BUILD_ARN
      ? `https://console.aws.amazon.com/codesuite/codebuild/projects/${process.env.CODEBUILD_BUILD_ARN.split(":")[5]}/build/${process.env.CODEBUILD_BUILD_ID}`
      : undefined
    
    return {
      platform: "AWS CodeBuild",
      detected: true,
      buildId: process.env.CODEBUILD_BUILD_ID,
      ...(buildUrl && { buildUrl })
    }
  }

  // Google Cloud Build
  if (process.env.BUILD_ID && process.env.PROJECT_ID && process.env.BUILDER_OUTPUT) {
    return {
      platform: "Google Cloud Build",
      detected: true,
      buildId: process.env.BUILD_ID,
      buildUrl: `https://console.cloud.google.com/cloud-build/builds/${process.env.BUILD_ID}?project=${process.env.PROJECT_ID}`
    }
  }

  // Drone CI
  if (process.env.DRONE === "true") {
    return {
      platform: "Drone CI",
      detected: true,
      ...(process.env.DRONE_BUILD_LINK && { buildUrl: process.env.DRONE_BUILD_LINK }),
      ...(process.env.DRONE_BUILD_NUMBER && { buildId: process.env.DRONE_BUILD_NUMBER })
    }
  }

  // Bamboo
  if (process.env.bamboo_buildKey) {
    return {
      platform: "Bamboo",
      detected: true,
      buildId: process.env.bamboo_buildKey,
      ...(process.env.bamboo_buildResultsUrl && { buildUrl: process.env.bamboo_buildResultsUrl })
    }
  }

  // Default - no CI/CD detected
  return {
    platform: "Unknown",
    detected: false
  }
}

/**
 * Get icon URL for CI/CD platform
 * Using Simple Icons (https://simpleicons.org/) via CDN
 */
export function getCICDIcon(platform: string): string | undefined {
  const iconMap: Record<string, string> = {
    "GitHub Actions": "https://cdn.simpleicons.org/github/181717",
    "Azure Pipelines": "https://cdn.simpleicons.org/azurepipelines/2560E0",
    "GitLab CI": "https://cdn.simpleicons.org/gitlab/FC6D26",
    "CircleCI": "https://cdn.simpleicons.org/circleci/343434",
    "Jenkins": "https://cdn.simpleicons.org/jenkins/D24939",
    "Travis CI": "https://cdn.simpleicons.org/travis/3EAAAF",
    "Bitbucket Pipelines": "https://cdn.simpleicons.org/bitbucket/0052CC",
    "TeamCity": "https://cdn.simpleicons.org/teamcity/000000",
    "AWS CodeBuild": "https://cdn.simpleicons.org/amazonaws/232F3E",
    "Google Cloud Build": "https://cdn.simpleicons.org/googlecloud/4285F4",
    "Drone CI": "https://cdn.simpleicons.org/drone/212121",
    "Bamboo": "https://cdn.simpleicons.org/bamboo/0052CC"
  }

  return iconMap[platform]
}
