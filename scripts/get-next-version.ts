#!/usr/bin/env tsx
/**
 * Calculate the next version for a package using Changesets
 *
 * Usage:
 *   pnpm tsx scripts/get-next-version.ts <package-name>
 *
 * Example:
 *   pnpm tsx scripts/get-next-version.ts @dtapline/cli
 *
 * Output:
 *   0.2.0-dev.a1b2c3d (if there are pending changesets)
 *   0.1.0-dev.a1b2c3d (if no changesets, uses current version)
 */

import getReleasePlan from "@changesets/get-release-plan"
import { execSync } from "child_process"
import { readFileSync } from "fs"
import { join } from "path"

async function getNextVersion(packageName: string): Promise<string> {
  const cwd = process.cwd()

  // Get short commit SHA
  const shortSha = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim()

  // Get release plan from changesets
  const releasePlan = await getReleasePlan(cwd)

  // Find the release for this package
  const release = releasePlan.releases.find((r) => r.name === packageName)

  if (release && release.newVersion !== release.oldVersion) {
    // There's a pending version bump
    return `${release.newVersion}-dev.${shortSha}`
  } else {
    // No pending changesets, use current version
    const packageJsonPath = packageName.replace("@dtapline/", "packages/")
    const packageJson = JSON.parse(
      readFileSync(join(cwd, packageJsonPath, "package.json"), "utf-8")
    )
    return `${packageJson.version}-dev.${shortSha}`
  }
}

// Main execution
const packageName = process.argv[2]

if (!packageName) {
  console.error("Usage: pnpm tsx scripts/get-next-version.ts <package-name>")
  console.error("Example: pnpm tsx scripts/get-next-version.ts @dtapline/cli")
  process.exit(1)
}

getNextVersion(packageName)
  .then((version) => {
    console.log(version)
    process.exit(0)
  })
  .catch((error) => {
    console.error("Error:", error.message)
    process.exit(1)
  })
