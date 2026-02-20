/**
 * CI/CD Environment Detection
 * Detects which CI/CD platform the CLI is running on based on environment variables
 */

import { NodeServices } from "@effect/platform-node"
import { Effect } from "effect"
import { ChildProcess } from "effect/unstable/process"

export interface CICDInfo {
  platform: string
  detected: boolean
  buildUrl?: string
  buildId?: string
  commitSha?: string
  branch?: string
  gitTag?: string
  repositoryUrl?: string
  actor?: string
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

    const repositoryUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`
      : undefined

    const isTag = process.env.GITHUB_REF_TYPE === "tag"
    const gitTag = isTag ? process.env.GITHUB_REF_NAME : undefined
    const branch = !isTag ? process.env.GITHUB_REF_NAME : undefined

    return {
      platform: "GitHub Actions",
      detected: true,
      ...(buildUrl && { buildUrl }),
      ...(process.env.GITHUB_RUN_ID && { buildId: process.env.GITHUB_RUN_ID }),
      ...(process.env.GITHUB_SHA && { commitSha: process.env.GITHUB_SHA }),
      ...(branch && { branch }),
      ...(gitTag && { gitTag }),
      ...(repositoryUrl && { repositoryUrl }),
      ...(process.env.GITHUB_ACTOR && { actor: process.env.GITHUB_ACTOR })
    }
  }

  // Azure Pipelines
  if (process.env.TF_BUILD === "True" || process.env.AZURE_PIPELINES === "true") {
    const buildUrl =
      process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI && process.env.SYSTEM_TEAMPROJECT && process.env.BUILD_BUILDID
        ? `${process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI}${process.env.SYSTEM_TEAMPROJECT}/_build/results?buildId=${process.env.BUILD_BUILDID}`
        : undefined

    // Extract tag from BUILD_SOURCEBRANCH if it starts with refs/tags/
    const sourceBranch = process.env.BUILD_SOURCEBRANCH || ""
    const gitTag = sourceBranch.startsWith("refs/tags/")
      ? sourceBranch.replace("refs/tags/", "")
      : undefined

    return {
      platform: "Azure Pipelines",
      detected: true,
      ...(buildUrl && { buildUrl }),
      ...(process.env.BUILD_BUILDID && { buildId: process.env.BUILD_BUILDID }),
      ...(process.env.BUILD_SOURCEVERSION && { commitSha: process.env.BUILD_SOURCEVERSION }),
      ...(process.env.BUILD_SOURCEBRANCHNAME && !gitTag && { branch: process.env.BUILD_SOURCEBRANCHNAME }),
      ...(gitTag && { gitTag }),
      ...(process.env.BUILD_REPOSITORY_URI && { repositoryUrl: process.env.BUILD_REPOSITORY_URI }),
      ...(process.env.BUILD_REQUESTEDFOR && { actor: process.env.BUILD_REQUESTEDFOR })
    }
  }

  // GitLab CI
  if (process.env.GITLAB_CI === "true") {
    const buildUrl = process.env.CI_PROJECT_URL && process.env.CI_PIPELINE_ID
      ? `${process.env.CI_PROJECT_URL}/-/pipelines/${process.env.CI_PIPELINE_ID}`
      : undefined

    const branch = (process.env.CI_COMMIT_BRANCH || process.env.CI_COMMIT_REF_NAME) && !process.env.CI_COMMIT_TAG
      ? process.env.CI_COMMIT_BRANCH || process.env.CI_COMMIT_REF_NAME
      : undefined

    return {
      platform: "GitLab CI",
      detected: true,
      ...(buildUrl && { buildUrl }),
      ...(process.env.CI_PIPELINE_ID && { buildId: process.env.CI_PIPELINE_ID }),
      ...(process.env.CI_COMMIT_SHA && { commitSha: process.env.CI_COMMIT_SHA }),
      ...(branch && { branch }),
      ...(process.env.CI_COMMIT_TAG && { gitTag: process.env.CI_COMMIT_TAG }),
      ...(process.env.CI_PROJECT_URL && { repositoryUrl: process.env.CI_PROJECT_URL }),
      ...(process.env.GITLAB_USER_LOGIN && { actor: process.env.GITLAB_USER_LOGIN })
    }
  }

  // CircleCI
  if (process.env.CIRCLECI === "true") {
    return {
      platform: "CircleCI",
      detected: true,
      ...(process.env.CIRCLE_BUILD_URL && { buildUrl: process.env.CIRCLE_BUILD_URL }),
      ...(process.env.CIRCLE_BUILD_NUM && { buildId: process.env.CIRCLE_BUILD_NUM }),
      ...(process.env.CIRCLE_SHA1 && { commitSha: process.env.CIRCLE_SHA1 }),
      ...(process.env.CIRCLE_BRANCH && { branch: process.env.CIRCLE_BRANCH }),
      ...(process.env.CIRCLE_TAG && { gitTag: process.env.CIRCLE_TAG }),
      ...(process.env.CIRCLE_REPOSITORY_URL && { repositoryUrl: process.env.CIRCLE_REPOSITORY_URL }),
      ...(process.env.CIRCLE_USERNAME && { actor: process.env.CIRCLE_USERNAME })
    }
  }

  // Jenkins
  if (process.env.JENKINS_URL) {
    const branch = process.env.BRANCH_NAME || process.env.GIT_BRANCH || undefined

    return {
      platform: "Jenkins",
      detected: true,
      ...(process.env.BUILD_URL && { buildUrl: process.env.BUILD_URL }),
      ...(process.env.BUILD_NUMBER && { buildId: process.env.BUILD_NUMBER }),
      ...(process.env.GIT_COMMIT && { commitSha: process.env.GIT_COMMIT }),
      ...(branch && { branch }),
      ...(process.env.TAG_NAME && { gitTag: process.env.TAG_NAME }),
      ...(process.env.GIT_URL && { repositoryUrl: process.env.GIT_URL }),
      ...(process.env.BUILD_USER && { actor: process.env.BUILD_USER })
    }
  }

  // Travis CI
  if (process.env.TRAVIS === "true") {
    const repositoryUrl = process.env.TRAVIS_REPO_SLUG
      ? `https://github.com/${process.env.TRAVIS_REPO_SLUG}`
      : undefined

    return {
      platform: "Travis CI",
      detected: true,
      ...(process.env.TRAVIS_BUILD_WEB_URL && { buildUrl: process.env.TRAVIS_BUILD_WEB_URL }),
      ...(process.env.TRAVIS_BUILD_ID && { buildId: process.env.TRAVIS_BUILD_ID }),
      ...(process.env.TRAVIS_COMMIT && { commitSha: process.env.TRAVIS_COMMIT }),
      ...(process.env.TRAVIS_BRANCH && { branch: process.env.TRAVIS_BRANCH }),
      ...(process.env.TRAVIS_TAG && { gitTag: process.env.TRAVIS_TAG }),
      ...(repositoryUrl && { repositoryUrl })
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
      ...(process.env.BITBUCKET_BUILD_NUMBER && { buildId: process.env.BITBUCKET_BUILD_NUMBER }),
      ...(process.env.BITBUCKET_COMMIT && { commitSha: process.env.BITBUCKET_COMMIT }),
      ...(process.env.BITBUCKET_BRANCH && { branch: process.env.BITBUCKET_BRANCH }),
      ...(process.env.BITBUCKET_TAG && { gitTag: process.env.BITBUCKET_TAG }),
      ...(process.env.BITBUCKET_GIT_HTTP_ORIGIN && { repositoryUrl: process.env.BITBUCKET_GIT_HTTP_ORIGIN })
    }
  }

  // TeamCity
  if (process.env.TEAMCITY_VERSION) {
    return {
      platform: "TeamCity",
      detected: true,
      ...(process.env.BUILD_URL && { buildUrl: process.env.BUILD_URL }),
      ...(process.env.BUILD_NUMBER && { buildId: process.env.BUILD_NUMBER }),
      ...(process.env.BUILD_VCS_NUMBER && { commitSha: process.env.BUILD_VCS_NUMBER })
    }
  }

  // AWS CodeBuild
  if (process.env.CODEBUILD_BUILD_ID) {
    const buildUrl = process.env.CODEBUILD_BUILD_ARN
      ? `https://console.aws.amazon.com/codesuite/codebuild/projects/${
        process.env.CODEBUILD_BUILD_ARN.split(":")[5]
      }/build/${process.env.CODEBUILD_BUILD_ID}`
      : undefined

    // Extract branch from webhook head ref (e.g., "refs/heads/main" -> "main")
    const headRef = process.env.CODEBUILD_WEBHOOK_HEAD_REF || ""
    const branch = headRef.startsWith("refs/heads/")
      ? headRef.replace("refs/heads/", "")
      : undefined

    return {
      platform: "AWS CodeBuild",
      detected: true,
      buildId: process.env.CODEBUILD_BUILD_ID,
      ...(buildUrl && { buildUrl }),
      ...(process.env.CODEBUILD_RESOLVED_SOURCE_VERSION &&
        { commitSha: process.env.CODEBUILD_RESOLVED_SOURCE_VERSION }),
      ...(branch && { branch }),
      ...(process.env.CODEBUILD_SOURCE_REPO_URL && { repositoryUrl: process.env.CODEBUILD_SOURCE_REPO_URL }),
      ...(process.env.CODEBUILD_INITIATOR && { actor: process.env.CODEBUILD_INITIATOR })
    }
  }

  // Google Cloud Build
  if (process.env.BUILD_ID && process.env.PROJECT_ID && process.env.BUILDER_OUTPUT) {
    return {
      platform: "Google Cloud Build",
      detected: true,
      buildId: process.env.BUILD_ID,
      buildUrl:
        `https://console.cloud.google.com/cloud-build/builds/${process.env.BUILD_ID}?project=${process.env.PROJECT_ID}`,
      ...(process.env.COMMIT_SHA && { commitSha: process.env.COMMIT_SHA }),
      ...(process.env.BRANCH_NAME && { branch: process.env.BRANCH_NAME }),
      ...(process.env.TAG_NAME && { gitTag: process.env.TAG_NAME })
    }
  }

  // Drone CI
  if (process.env.DRONE === "true") {
    return {
      platform: "Drone CI",
      detected: true,
      ...(process.env.DRONE_BUILD_LINK && { buildUrl: process.env.DRONE_BUILD_LINK }),
      ...(process.env.DRONE_BUILD_NUMBER && { buildId: process.env.DRONE_BUILD_NUMBER }),
      ...(process.env.DRONE_COMMIT_SHA && { commitSha: process.env.DRONE_COMMIT_SHA }),
      ...(process.env.DRONE_COMMIT_BRANCH && { branch: process.env.DRONE_COMMIT_BRANCH }),
      ...(process.env.DRONE_TAG && { gitTag: process.env.DRONE_TAG }),
      ...(process.env.DRONE_REPO_LINK && { repositoryUrl: process.env.DRONE_REPO_LINK }),
      ...(process.env.DRONE_COMMIT_AUTHOR && { actor: process.env.DRONE_COMMIT_AUTHOR })
    }
  }

  // Bamboo
  if (process.env.bamboo_buildKey) {
    return {
      platform: "Bamboo",
      detected: true,
      buildId: process.env.bamboo_buildKey,
      ...(process.env.bamboo_buildResultsUrl && { buildUrl: process.env.bamboo_buildResultsUrl }),
      ...(process.env.bamboo_planRepository_revision && { commitSha: process.env.bamboo_planRepository_revision }),
      ...(process.env.bamboo_planRepository_branchName && { branch: process.env.bamboo_planRepository_branchName }),
      ...(process.env.bamboo_planRepository_repositoryUrl &&
        { repositoryUrl: process.env.bamboo_planRepository_repositoryUrl }),
      ...(process.env.bamboo_ManualBuildTriggerReason_userName &&
        { actor: process.env.bamboo_ManualBuildTriggerReason_userName })
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
    "Azure Pipelines": "https://cdn.vsassets.io/ext/ms.vss-build-web/common-library/Nav-Launch.3tiJhd.png",
    "GitLab CI": "https://cdn.simpleicons.org/gitlab/FC6D26",
    "CircleCI": "https://cdn.simpleicons.org/circleci/343434",
    "Jenkins": "https://cdn.simpleicons.org/jenkins/D24939",
    "Travis CI": "https://cdn.simpleicons.org/travisci/3EAAAF",
    "Bitbucket Pipelines": "https://cdn.simpleicons.org/bitbucket/0052CC",
    "TeamCity": "https://cdn.simpleicons.org/teamcity/000000",
    "AWS CodeBuild":
      "https://a.b.cdn.console.awsstatic.com/a/v1/XY4Q5TY33HMUJG7NXI3D5OVE5BC7TS5EMSQIZUFRTA2XNCHHOP5Q/icon/13ee531096ccb4384d55f6b7cc66572b-9f8463d77a472721923c47b01f973d59.svg",
    "Google Cloud Build": "https://cdn.simpleicons.org/googlecloud/4285F4",
    "Drone CI": "https://cdn.simpleicons.org/drone/212121",
    "Bamboo": "https://cdn.simpleicons.org/bamboo/0052CC"
  }

  return iconMap[platform]
}

/**
 * Get the current git commit SHA by running `git rev-parse HEAD`
 * Returns an Effect that resolves to the SHA or undefined if git is not available
 */
export const getGitCommitSha = (): Effect.Effect<string | undefined> =>
  ChildProcess.make("git", ["rev-parse", "HEAD"]).pipe(
    ChildProcess.string,
    Effect.map((output) => output.trim() || undefined),
    Effect.catch(() => Effect.succeed(undefined)),
    Effect.provide(NodeServices.layer)
  )
