
export * as Api from "./Api.js"


export * as ApiKey from "./ApiKey.js"


export * as Deployment from "./Deployment.js"


export * as Environment from "./Environment.js"


export * as Errors from "./Errors.js"


export * as Project from "./Project.js"


export * as Service from "./Service.js"


export * as User from "./User.js"

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
export * as VersionExtractor from "./Utils/VersionExtractor.js"


export * as VersionPattern from "./VersionPattern.js"
