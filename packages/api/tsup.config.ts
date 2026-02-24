import type { Options } from "tsup"
import { defineConfig } from "tsup"

const sharedConfig: Options = {
  format: ["cjs"],
  platform: "node",
  target: "node20",
  bundle: true,
  minify: true,
  sourcemap: true,
  treeshake: true,
  clean: true,
  // Lambda runtime expects index.js, not index.cjs
  outExtension: () => ({ js: ".js" }),
  noExternal: [/^(?!@aws-sdk\/).*/]
}

export default defineConfig([
  {
    ...sharedConfig,
    entry: { index: "src/lambda.ts" },
    outDir: "dist/lambda",
    esbuildOptions(options) {
      // Resolve MongoDB to its ESM source to avoid require() interop issues
      options.alias = { mongodb: "mongodb/src" }
      options.mainFields = ["module", "main"]
    }
  },
  {
    ...sharedConfig,
    entry: { index: "src/websocket-lambda.ts" },
    outDir: "dist/ws-lambda",
    esbuildOptions(options) {
      options.mainFields = ["module", "main"]
    }
  }
])
