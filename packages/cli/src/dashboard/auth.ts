/**
 * Auth token persistence
 *
 * Saves/loads/clears Better Auth session tokens in ~/.config/dtapline/auth.json
 * keyed by server URL.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import type { AuthConfig, AuthSession } from "./types.js"

function getConfigPath(): string {
  const configDir = join(homedir(), ".config", "dtapline")
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
  return join(configDir, "auth.json")
}

function loadConfig(): AuthConfig {
  const configPath = getConfigPath()
  if (!existsSync(configPath)) {
    return { sessions: {} }
  }
  try {
    const raw = readFileSync(configPath, "utf-8")
    return JSON.parse(raw) as AuthConfig
  } catch {
    return { sessions: {} }
  }
}

function saveConfig(config: AuthConfig): void {
  const configPath = getConfigPath()
  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8")
}

export function saveSession(serverUrl: string, token: string, email: string): void {
  const config = loadConfig()
  const session: AuthSession = {
    token,
    email,
    savedAt: new Date().toISOString()
  }
  saveConfig({
    sessions: {
      ...config.sessions,
      [serverUrl]: session
    }
  })
}

export function loadSession(serverUrl: string): AuthSession | null {
  const config = loadConfig()
  return config.sessions[serverUrl] ?? null
}

export function clearSession(serverUrl: string): void {
  const config = loadConfig()
  const { [serverUrl]: _removed, ...rest } = config.sessions
  saveConfig({ sessions: rest })
}
