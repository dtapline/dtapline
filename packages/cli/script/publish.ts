#!/usr/bin/env bun

/**
 * Publish script — builds all platform binaries and publishes them to npm.
 *
 * Usage:
 *   bun run script/publish.ts [--tag <dist-tag>] [--snapshot-version <ver>] [--dry-run]
 *
 *   --tag                npm dist-tag (default: "latest")
 *   --snapshot-version   override the version for all published packages
 *   --dry-run            pack + smoke test, but do not actually publish
 *
 * What it does:
 *  1. Builds all platform binaries via build.ts
 *  2. Smoke-tests the local-platform binary
 *  3. Publishes each platform sub-package to npm
 *  4. Builds + publishes the main @dtapline/cli wrapper package
 *
 * The main wrapper package uses optionalDependencies so that npm/pnpm/yarn
 * install only the sub-package matching the user's OS + CPU at install time.
 * The bin entry points to a plain Node.js wrapper script that resolves and
 * exec's the correct native binary from node_modules.
 *
 * Prerequisites:
 *   - `npm login` (or NPM_TOKEN env var set)
 *   - Run from packages/cli directory (or from the monorepo root via the
 *     `pnpm --filter @dtapline/cli build:binary` script)
 */

import { $ } from "bun"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

import pkg from "../package.json"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.resolve(__dirname, "..")

process.chdir(dir)

// ── CLI flags ────────────────────────────────────────────────────────────────
const tagIdx = process.argv.indexOf("--tag")
const tag = tagIdx !== -1 ? process.argv[tagIdx + 1] : "latest"
const dryRun = process.argv.includes("--dry-run")
const snapshotVersionIdx = process.argv.indexOf("--snapshot-version")
const snapshotVersion = snapshotVersionIdx !== -1 ? process.argv[snapshotVersionIdx + 1] : undefined

const version = snapshotVersion ?? pkg.version

// Set env var before importing build.ts so the compiled binaries embed the
// correct version string (build.ts reads DTAPLINE_BUILD_VERSION at build time)
process.env.DTAPLINE_BUILD_VERSION = version

const { binaries } = await import("./build.ts")
console.log(`publishing ${pkg.name}@${version} (tag: ${tag}${dryRun ? ", DRY RUN" : ""})`)

// ── Smoke test the local-platform binary ─────────────────────────────────────
const localOs = process.platform // "darwin" | "linux"
const localArch = process.arch // "arm64" | "x64"
const localPkgName = `${pkg.name}-${localOs}-${localArch}`
const localPkgDirName = localPkgName.replace(/^@[^/]+\//, "")

if (binaries[localPkgName]) {
  const localBin = path.resolve(dir, `dist/${localPkgDirName}/bin/dtapline`)
  console.log(`\nsmoking test: ${localBin} --version`)
  const result = await $`${localBin} --version`.quiet()
  console.log(`  → ${result.stdout.toString().trim()}`)
} else {
  console.warn(`\nno local-platform binary found for ${localPkgName}, skipping smoke test`)
}

// ── Publish platform sub-packages ────────────────────────────────────────────
const publishedPlatformPkgs: Record<string, string> = {}

for (const [pkgName] of Object.entries(binaries)) {
  const pkgDirName = pkgName.replace(/^@[^/]+\//, "")
  const pkgDir = path.resolve(dir, `dist/${pkgDirName}`)

  // Ensure bin is executable
  const binFile = path.join(pkgDir, "bin", "dtapline")
  if (fs.existsSync(binFile)) {
    fs.chmodSync(binFile, 0o755)
  }

  // Stamp the version — ensures package.json matches what we're publishing,
  // whether it's the regular release version or a snapshot override
  const pkgJsonPath = path.join(pkgDir, "package.json")
  const pkgJson = await Bun.file(pkgJsonPath).json()
  pkgJson.version = version
  await Bun.write(pkgJsonPath, JSON.stringify(pkgJson, null, 2))

  console.log(`\npacking ${pkgName}@${version}`)
  await $`npm pack`.cwd(pkgDir)

  // npm pack names the file differently — use glob to find it
  const tgzFiles = fs.readdirSync(pkgDir).filter((f) => f.endsWith(".tgz"))
  if (tgzFiles.length === 0) {
    throw new Error(`No .tgz found after packing ${pkgName}`)
  }
  const tgzPath = path.join(pkgDir, tgzFiles[0])

  if (!dryRun) {
    console.log(`  publishing ${tgzFiles[0]}`)
    await $`npm publish ${tgzPath} --tag ${tag} --access public --userconfig ~/.npmrc`
  } else {
    console.log(`  [dry-run] would publish ${tgzFiles[0]}`)
  }

  publishedPlatformPkgs[pkgName] = version
}

// ── Build + publish the main wrapper package ─────────────────────────────────
// The main package is a thin wrapper with:
//  - bin/dtapline  →  the Node.js CJS wrapper that resolves the platform binary
//  - optionalDependencies  →  all platform sub-packages at the same version

const wrapperDir = path.resolve(dir, "dist/dtapline-cli-wrapper")
await $`mkdir -p ${wrapperDir}/bin`

// Copy the Node.js bin wrapper
const binWrapperSrc = path.resolve(dir, "bin/dtapline")
const binWrapperDest = path.join(wrapperDir, "bin/dtapline")
fs.copyFileSync(binWrapperSrc, binWrapperDest)
fs.chmodSync(binWrapperDest, 0o755)

// Build the wrapper package.json
const wrapperPkg = {
  name: pkg.name,
  version,
  description: pkg.description,
  license: pkg.license,
  repository: pkg.repository,
  bin: {
    dtapline: "./bin/dtapline",
    dtap: "./bin/dtapline"
  },
  files: ["bin"],
  publishConfig: { access: "public" },
  optionalDependencies: Object.fromEntries(
    Object.entries(publishedPlatformPkgs).map(([name, ver]) => [name, ver])
  )
}

await Bun.write(path.join(wrapperDir, "package.json"), JSON.stringify(wrapperPkg, null, 2))

// Verify the written package.json before packing
const writtenPkg = await Bun.file(path.join(wrapperDir, "package.json")).json()
if (writtenPkg.version !== version) {
  throw new Error(`Wrapper package.json version mismatch: expected ${version}, got ${writtenPkg.version}`)
}

console.log(`\npacking ${pkg.name}@${version} (wrapper) from ${wrapperDir}`)
console.log(`  wrapper package.json: ${JSON.stringify(writtenPkg, null, 2)}`)
await $`npm pack`.cwd(wrapperDir)

const wrapperTgzFiles = fs.readdirSync(wrapperDir).filter((f) => f.endsWith(".tgz"))
if (wrapperTgzFiles.length === 0) {
  throw new Error(`No .tgz found after packing wrapper`)
}
const wrapperTgzPath = path.join(wrapperDir, wrapperTgzFiles[0])

if (!dryRun) {
  console.log(`  publishing ${wrapperTgzFiles[0]}`)
  await $`npm publish ${wrapperTgzPath} --tag ${tag} --access public --userconfig ~/.npmrc`
} else {
  console.log(`  [dry-run] would publish ${wrapperTgzFiles[0]}`)
}

console.log(
  `\ndone! published ${pkg.name}@${version} and ${Object.keys(publishedPlatformPkgs).length} platform packages`
)
