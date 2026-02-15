import * as path from "node:path"
import type { UserConfig } from "vitest/config"

const alias = (name: string) => ({
  [`@dtapline/${name}/test`]: path.join(__dirname, "packages", name, "test"),
  [`@dtapline/${name}`]: path.join(__dirname, "packages", name, "src")
})

// This is a workaround, see https://github.com/vitest-dev/vitest/issues/4744
const config: UserConfig = {
  esbuild: {
    target: "es2020"
  },
  optimizeDeps: {
    exclude: ["bun:sqlite"]
  },
  test: {
    setupFiles: [path.join(__dirname, "setupTests.ts")],
    fakeTimers: {
      toFake: undefined
    },
    sequence: {
      concurrent: true
    },
    include: ["test/**/*.test.ts"],
    alias: {
      ...alias("domain")
    }
  }
}

export default config
