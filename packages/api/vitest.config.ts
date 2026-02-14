import { mergeConfig, type UserConfigExport } from "vitest/config"
import shared from "../../vitest.shared.js"

const config: UserConfigExport = {
  test: {
    globalSetup: ["../../mongodb.setup.ts"]
  }
}

export default mergeConfig(shared, config)
