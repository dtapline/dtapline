import { readFileSync } from "fs"
import { defineConfig } from "tsdown"

// Read version from package.json
const pkg = JSON.parse(readFileSync("./package.json", "utf-8"))

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  shims: true,
  clean: true,
  banner: {
    js: "#!/usr/bin/env node"
  },
  define: {
    __VERSION__: JSON.stringify(pkg.version)
  },
  // Only bundle internal workspace packages (domain)
  // External deps (Effect, @effect/cli, etc.) will be installed as regular dependencies
  noExternal: ["@dtapline/domain"],
  treeshake: true
})
