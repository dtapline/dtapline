#!/usr/bin/env node

/**
 * postinstall.mjs — runs after `npm install @dtapline/cli`
 *
 * Hard-links (or copies) the native binary from the platform sub-package into
 * bin/.dtapline inside this package directory. This makes the wrapper
 * self-contained: bin/dtapline checks for bin/.dtapline first and runs it
 * directly without needing to traverse node_modules at runtime.
 *
 * This means the CLI works even when the optional dependency was installed
 * through a registry proxy (e.g. Artifactory) that may not have the platform
 * sub-package — as long as postinstall runs after a successful install it
 * bakes the binary in place.
 */

import fs from "fs"
import { createRequire } from "module"
import os from "os"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

function detectPlatform() {
  const platformMap = { darwin: "darwin", linux: "linux", win32: "windows" }
  const archMap = { x64: "x64", arm64: "arm64" }

  const platform = platformMap[os.platform()] ?? os.platform()
  const arch = archMap[os.arch()] ?? os.arch()

  return { platform, arch }
}

function isMusl() {
  try {
    if (fs.existsSync("/etc/alpine-release")) return true
  } catch {
    // ignore
  }
  try {
    const { spawnSync } = await import("child_process")
    const result = spawnSync("ldd", ["--version"], { encoding: "utf8" })
    const text = ((result.stdout ?? "") + (result.stderr ?? "")).toLowerCase()
    if (text.includes("musl")) return true
  } catch {
    // ignore
  }
  return false
}

async function findBinary() {
  const { arch, platform } = detectPlatform()

  // Build ordered list of candidate package names (musl, baseline variants)
  const base = `@dtapline/cli-${platform}-${arch}`
  const names = []

  if (platform === "linux" && (await isMusl())) {
    names.push(`${base}-musl`, base)
  } else {
    names.push(base)
    if (platform === "linux") names.push(`${base}-musl`)
  }

  const binaryName = "dtapline"

  for (const name of names) {
    try {
      const pkgJsonPath = require.resolve(`${name}/package.json`)
      const pkgDir = path.dirname(pkgJsonPath)
      const binaryPath = path.join(pkgDir, "bin", binaryName)
      if (fs.existsSync(binaryPath)) {
        return binaryPath
      }
    } catch {
      // package not installed, try next
    }
  }

  throw new Error(
    `Could not find a native binary package. Tried: ${names.join(", ")}\n` +
      `This usually means the optional dependency for your platform was not installed.\n` +
      `Try: npm install ${names[0]}`
  )
}

async function main() {
  if (os.platform() === "win32") {
    // Windows: the .exe is shipped inside the platform package; no hard-link needed
    console.log("dtapline postinstall: Windows detected, skipping binary link")
    return
  }

  const binaryPath = await findBinary()
  const target = path.join(__dirname, "bin", ".dtapline")

  if (fs.existsSync(target)) fs.unlinkSync(target)

  try {
    fs.linkSync(binaryPath, target)
    console.log(`dtapline postinstall: linked ${target} -> ${binaryPath}`)
  } catch {
    // Hard link can fail across filesystems (e.g. pnpm content-addressable store)
    fs.copyFileSync(binaryPath, target)
    console.log(`dtapline postinstall: copied ${target} <- ${binaryPath}`)
  }

  fs.chmodSync(target, 0o755)
}

main().catch((err) => {
  // postinstall failures must not break the install — just warn
  console.warn(`dtapline postinstall: warning: ${err.message}`)
  process.exit(0)
})
