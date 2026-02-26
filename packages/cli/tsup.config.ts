import { readFileSync } from "fs"
import { defineConfig } from "tsup"

// Read version from package.json
const pkg = JSON.parse(readFileSync("./package.json", "utf-8"))

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  bundle: true,
  shims: true,
  clean: true,
  banner: {
    js: "#!/usr/bin/env bun"
  },
  define: {
    __VERSION__: JSON.stringify(pkg.version)
  },
  // Only bundle internal workspace packages (domain)
  // External deps (Effect, @effect/cli, etc.) will be installed as regular dependencies
  // @opentui/core has native Zig bindings — must remain external
  noExternal: ["@dtapline/domain"],
  external: ["@opentui/core"],
  esbuildOptions(options) {
    options.jsx = "automatic"
    options.jsxImportSource = "@opentui/react"
  },
  treeshake: true
})
