#!/usr/bin/env bun

/**
 * Publish script — builds all platform binaries and publishes them to npm.
 *
 * Usage:
 *   bun run script/publish.ts [--tag <dist-tag>] [--snapshot-version <ver>] [--dry-run]
 *
 *   --tag                npm dist-tag (default: "latest")
 *   --snapshot-version   override the version for all published packages
 *   --dry-run            print what would be published without actually publishing
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
 *   - `npm login` (or NPM_TOKEN env var written to ~/.npmrc)
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

// Set env var BEFORE importing build.ts — build.ts runs at import time and
// reads this to embed the correct version string in compiled binaries.
process.env.DTAPLINE_BUILD_VERSION = version

const { binaries } = await import("./build.ts")
console.log(`publishing ${pkg.name}@${version} (tag: ${tag}${dryRun ? ", DRY RUN" : ""})`)

// ── Smoke test the local-platform binary ─────────────────────────────────────
const localOs = process.platform // "darwin" | "linux"
const localArch = process.arch // "arm64" | "x64"
const localPkgName = `${pkg.name}-${localOs}-${localArch}`
// Strip @scope/ prefix — dist dirs never contain @ to avoid npm path confusion
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
  // Strip @scope/ prefix from directory name — paths with @ confuse npm
  const pkgDirName = pkgName.replace(/^@[^/]+\//, "")
  const pkgDir = path.resolve(dir, `dist/${pkgDirName}`)

  // Ensure bin is executable (skip on Windows — .exe doesn't use Unix permissions)
  const binaryName = pkgName.includes("-windows-") ? "dtapline.exe" : "dtapline"
  const binFile = path.join(pkgDir, "bin", binaryName)
  if (fs.existsSync(binFile) && !pkgName.includes("-windows-")) {
    fs.chmodSync(binFile, 0o755)
  }

  // Stamp version unconditionally — package.json in dist may have the base
  // version from build.ts; we always want it to match what we're publishing
  const pkgJsonPath = path.join(pkgDir, "package.json")
  const pkgJson = await Bun.file(pkgJsonPath).json()
  pkgJson.version = version
  await Bun.write(pkgJsonPath, JSON.stringify(pkgJson, null, 2))

  console.log(`\npublishing ${pkgName}@${version}`)

  if (!dryRun) {
    // Run npm publish directly from pkgDir — no tgz path argument, which
    // avoids npm misinterpreting @-scoped paths as package specifiers.
    await $`npm publish --tag ${tag} --access public --userconfig ~/.npmrc`.cwd(pkgDir)
  } else {
    await $`npm pack --dry-run`.cwd(pkgDir)
    console.log(`  [dry-run] would publish above`)
  }

  publishedPlatformPkgs[pkgName] = version
}

// ── Build + publish the main wrapper package ─────────────────────────────────
// The main package is a thin wrapper with:
//  - bin/dtapline  →  the Node.js CJS wrapper that resolves the platform binary
//  - optionalDependencies  →  all platform sub-packages at the same version

// No @ in path — same reason as platform packages above
const wrapperDir = path.resolve(dir, "dist/dtapline-cli-wrapper")
await $`mkdir -p ${wrapperDir}/bin`

// Copy the Node.js bin wrapper
const binWrapperSrc = path.resolve(dir, "bin/dtapline")
const binWrapperDest = path.join(wrapperDir, "bin/dtapline")
fs.copyFileSync(binWrapperSrc, binWrapperDest)
fs.chmodSync(binWrapperDest, 0o755)

// Copy postinstall.mjs — runs after install and hard-links the native binary
// into bin/.dtapline so the wrapper works even behind registry proxies
const postinstallSrc = path.resolve(dir, "script/postinstall.mjs")
const postinstallDest = path.join(wrapperDir, "postinstall.mjs")
fs.copyFileSync(postinstallSrc, postinstallDest)

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
  scripts: {
    postinstall: "node ./postinstall.mjs || true"
  },
  files: ["bin", "postinstall.mjs"],
  publishConfig: { access: "public" },
  optionalDependencies: Object.fromEntries(
    Object.entries(publishedPlatformPkgs).map(([name, ver]) => [name, ver])
  )
}

await Bun.write(path.join(wrapperDir, "package.json"), JSON.stringify(wrapperPkg, null, 2))

// Verify version before publishing
const writtenPkg = await Bun.file(path.join(wrapperDir, "package.json")).json()
if (writtenPkg.version !== version) {
  throw new Error(`Wrapper package.json version mismatch: expected ${version}, got ${writtenPkg.version}`)
}

console.log(`\npublishing ${pkg.name}@${version} (wrapper)`)

if (!dryRun) {
  await $`npm publish --tag ${tag} --access public --userconfig ~/.npmrc`.cwd(wrapperDir)
} else {
  await $`npm pack --dry-run`.cwd(wrapperDir)
  console.log(`  [dry-run] would publish above`)
}

console.log(
  `\ndone! published ${pkg.name}@${version} and ${Object.keys(publishedPlatformPkgs).length} platform packages`
)
