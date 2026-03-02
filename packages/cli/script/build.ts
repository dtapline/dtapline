#!/usr/bin/env bun

/**
 * Build script — produces self-contained Bun binaries for each platform.
 *
 * Usage:
 *   bun run script/build.ts           # build all targets
 *   bun run script/build.ts --single  # build only the current platform (for local testing)
 *
 * Output:  dist/<pkg-name>-<os>-<arch>/bin/dtapline
 *          dist/<pkg-name>-<os>-<arch>/package.json
 *
 * The opentui native .dylib/.so is loaded at runtime by @opentui/core via dlopen.
 * bun build --compile embeds the JS (including the @opentui/core-<os>-<arch>
 * platform module) as a bunfs virtual filesystem inside the compiled binary.
 * The platform module exports the dylib path — when compiled, opentui's
 * isBunfsPath() detects the bunfs root and rewrites the path to be relative
 * to the binary's directory. We copy the dylib there so it's found at runtime.
 *
 * Cross-compilation: for each target we fetch the @opentui/core-<os>-<arch>
 * tarball directly from the npm registry using `npm pack`, unpack it into a
 * temp dir, and copy the native lib. This avoids running `bun install` (which
 * would conflict with the pnpm lockfile) or `pnpm install` for cross-platform
 * packages that pnpm deliberately skips on the current OS.
 *
 * For cross-platform Bun executables: Bun downloads the target platform's Bun
 * binary from GitHub Releases at build time (via --compile-executable-path).
 * We pre-download these to dist/.tmp-bun-<os>-<arch>/ before building, so
 * each target gets the correct Bun runtime embedded.
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

const singleFlag = process.argv.includes("--single")

const allTargets: Array<{ os: string; arch: "arm64" | "x64"; abi?: "musl" }> = [
  { os: "win32", arch: "x64" },
  { os: "darwin", arch: "arm64" },
  { os: "darwin", arch: "x64" },
  { os: "linux", arch: "arm64" },
  { os: "linux", arch: "x64" },
  { os: "linux", arch: "arm64", abi: "musl" },
  { os: "linux", arch: "x64", abi: "musl" }
]

const targets = singleFlag
  ? allTargets.filter((t) => t.os === process.platform && t.arch === process.arch)
  : allTargets

await $`rm -rf dist`

const opentuiVersion = (pkg.dependencies as Record<string, string>)[
  "@opentui/core"
].replace(/^\^/, "")

const bunVersion = Bun.version

// Persistent cache dir — survives `rm -rf dist`
const cacheDir = path.resolve(
  process.env.HOME ?? "~",
  ".cache",
  "dtapline-cli"
)
fs.mkdirSync(cacheDir, { recursive: true })

/**
 * Get the path to the Bun executable for a given target platform.
 * For the current platform, returns undefined (Bun uses itself).
 * For cross-compilation targets, downloads the Bun release from GitHub and
 * caches it in ~/.cache/dtapline-cli/bun-<ver>/ so it's only downloaded once.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchBunExecutable(
  os: string,
  arch: string
): Promise<string | undefined> {
  if (os === process.platform && arch === process.arch) {
    return undefined // let Bun use itself
  }

  // Bun uses "aarch64" in its GitHub release zip filenames (not "arm64")
  const bunArch = arch === "arm64" ? "aarch64" : arch
  const bunOsArch = `${os}-${bunArch}`
  const bunCacheDir = path.join(cacheDir, `bun-v${bunVersion}`)
  const bunExe = path.join(bunCacheDir, `bun-${bunOsArch}`)

  if (fs.existsSync(bunExe)) {
    return bunExe
  }

  const zipUrl = `https://github.com/oven-sh/bun/releases/download/bun-v${bunVersion}/bun-${bunOsArch}.zip`
  console.log(`  [${os}-${arch}] downloading Bun v${bunVersion}...`)

  fs.mkdirSync(bunCacheDir, { recursive: true })
  const zipPath = path.join(bunCacheDir, `bun-${bunOsArch}.zip`)

  const resp = await fetch(zipUrl, { signal: AbortSignal.timeout(120_000) })
  if (!resp.ok) {
    throw new Error(
      `Failed to download ${zipUrl}: ${resp.status} ${resp.statusText}`
    )
  }
  await Bun.write(zipPath, resp)

  const extractDir = path.join(bunCacheDir, `extract-${bunOsArch}`)
  fs.mkdirSync(extractDir, { recursive: true })
  await $`unzip -q -o ${zipPath} -d ${extractDir}`
  fs.rmSync(zipPath)

  // GitHub release extracts to bun-<os>-<arch>/bun
  const extracted = path.join(extractDir, `bun-${bunOsArch}`, "bun")
  if (!fs.existsSync(extracted)) {
    throw new Error(`Extracted bun binary not found at ${extracted}`)
  }
  fs.renameSync(extracted, bunExe)
  fs.rmSync(extractDir, { recursive: true, force: true })
  fs.chmodSync(bunExe, 0o755)

  return bunExe
}

/**
 * Fetch a native lib from an @opentui/core-<os>-<arch> npm package.
 * First checks the pnpm virtual store (node_modules/.pnpm) for an already-
 * downloaded copy (the common case for the current platform). Otherwise
 * downloads the tarball via `npm pack`, unpacks it, and returns the path to
 * the extracted package directory.
 */
async function fetchOpentuiPlatformPkg(os: string, arch: string): Promise<string> {
  // Fast path: look in the pnpm virtual store for any installed version
  const pnpmStore = path.resolve(dir, "..", "..", "node_modules", ".pnpm")
  const prefix = `@opentui+core-${os}-${arch}@`
  if (fs.existsSync(pnpmStore)) {
    const entries = fs.readdirSync(pnpmStore).filter((e) => e.startsWith(prefix))
    if (entries.length > 0) {
      // Pick the highest version (last alphabetically is fine for semver x.y.z)
      const entry = entries.sort().at(-1)!
      const candidate = path.join(pnpmStore, entry, "node_modules", "@opentui", `core-${os}-${arch}`)
      if (fs.existsSync(candidate)) {
        return candidate
      }
    }
  }

  // Slow path: download the tarball directly from the npm registry
  const pkgName = `@opentui/core-${os}-${arch}`
  console.log(`  fetching ${pkgName}@${opentuiVersion} from registry...`)

  const tmpDir = path.resolve(dir, `dist/.tmp-${os}-${arch}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  await $`npm pack ${pkgName}@${opentuiVersion}`.cwd(tmpDir)

  const tgzFiles = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".tgz"))
  if (tgzFiles.length === 0) throw new Error(`npm pack produced no .tgz for ${pkgName}`)

  const tgzPath = path.join(tmpDir, tgzFiles[0])
  await $`tar -xzf ${tgzPath} -C ${tmpDir}`

  // npm pack extracts into a "package/" subdirectory
  const extractedDir = path.join(tmpDir, "package")
  if (!fs.existsSync(extractedDir)) {
    throw new Error(`Expected extracted dir ${extractedDir} not found`)
  }

  return extractedDir
}

const binaries: Record<string, string> = {}

for (const target of targets) {
  const pkgName = [
    pkg.name,
    // changing to win32 flags npm for some reason
    target.os === "win32" ? "windows" : target.os,
    target.arch,
    target.abi === undefined ? undefined : target.abi
  ]
    .filter(Boolean)
    .join("-")
  // Strip @scope/ prefix — dist dirs never contain @ to avoid npm path confusion
  const pkgDirName = pkgName.replace(/^@[^/]+\//, "")
  console.log(`\nbuilding ${pkgName}`)

  await $`mkdir -p dist/${pkgDirName}/bin`

  // ── 1. Find the native shared library for this target ───────────────────────
  const platformPkgDir = await fetchOpentuiPlatformPkg(target.os, target.arch)

  const libExt = target.os === "darwin" ? "dylib" : target.os === "win32" ? "dll" : "so"
  const libFiles = fs.readdirSync(platformPkgDir).filter((f) => f.endsWith(`.${libExt}`))
  if (libFiles.length === 0) {
    throw new Error(`No .${libExt} found in ${platformPkgDir}`)
  }
  const libFile = libFiles[0]
  const libSrc = path.join(platformPkgDir, libFile)
  const libDest = path.join(dir, `dist/${pkgDirName}/bin`, libFile)
  fs.copyFileSync(libSrc, libDest)
  console.log(`  copied native lib: ${libFile}`)

  // ── 2. bun build --compile ──────────────────────────────────────────────────
  // @opentui/core uses a dynamic import(`@opentui/core-${os}-${arch}/index.ts`)
  // at runtime. During `Bun.build`, Bun resolves this import relative to the
  // location where @opentui/core actually lives — which is inside the pnpm
  // virtual store (node_modules/.pnpm/@opentui+core@.../node_modules/@opentui/core).
  // We must symlink the platform package into *that* node_modules/@opentui/
  // directory, NOT into packages/cli/node_modules/@opentui/.
  //
  // We resolve the real path of @opentui/core to find the pnpm store location,
  // then create the symlink alongside it for the duration of the build.
  const coreRealPath = fs.realpathSync(
    path.resolve(dir, "node_modules", "@opentui", "core")
  )
  // coreRealPath = .../node_modules/.pnpm/@opentui+core@.../node_modules/@opentui/core
  // We want:       .../node_modules/.pnpm/@opentui+core@.../node_modules/@opentui/core-<os>-<arch>
  const pnpmOpentuiDir = path.dirname(coreRealPath)
  const nodeModulesLink = path.join(pnpmOpentuiDir, `core-${target.os}-${target.arch}`)
  const linkCreated = !fs.existsSync(nodeModulesLink)
  if (linkCreated) {
    fs.symlinkSync(platformPkgDir, nodeModulesLink)
  }

  const bunTarget = `bun-${target.os}-${target.arch}`
  const binaryName = target.os === "win32" ? "dtapline.exe" : "dtapline"
  const outfile = `dist/${pkgDirName}/bin/${binaryName}`

  // Pre-download the Bun executable for cross-compilation targets so we can
  // pass it via executablePath instead of relying on Bun's internal downloader.
  // const bunExePath = await fetchBunExecutable(target.os, target.arch)

  try {
    await Bun.build({
      entrypoints: ["./src/index.ts"],
      tsconfig: "./tsconfig.build.json",
      compile: {
        autoloadBunfig: false,
        autoloadDotenv: false,
        target: bunTarget as any,
        outfile
        // ...(bunExePath ? { executablePath: bunExePath } : {})
      },
      define: {
        __VERSION__: JSON.stringify(process.env.DTAPLINE_BUILD_VERSION ?? pkg.version)
      },
      minify: true,
      sourcemap: "none"
    })
  } finally {
    if (linkCreated) fs.rmSync(nodeModulesLink)
  }

  if (target.os !== "win32") fs.chmodSync(outfile, 0o755)
  console.log(`  binary: ${outfile}`)

  // ── 3. Platform sub-package package.json ────────────────────────────────────
  await Bun.write(
    `dist/${pkgDirName}/package.json`,
    JSON.stringify(
      {
        name: pkgName,
        version: process.env.DTAPLINE_BUILD_VERSION ?? pkg.version,
        description: `Prebuilt ${target.os}-${target.arch} binary for ${pkg.name}`,
        os: [target.os],
        cpu: [target.arch],
        license: pkg.license,
        repository: pkg.repository
      },
      null,
      2
    )
  )

  binaries[pkgName] = pkg.version
  console.log(`  done ✓`)
}

// Clean up temp dirs (opentui tarballs and downloaded Bun executables)
const tmpDirs = fs.readdirSync(path.join(dir, "dist")).filter((f) => f.startsWith(".tmp-"))
for (const d of tmpDirs) {
  fs.rmSync(path.join(dir, "dist", d), { recursive: true, force: true })
}

export { binaries }
