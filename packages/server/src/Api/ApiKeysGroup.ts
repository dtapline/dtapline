import { CloudMatrixApi } from "@cloud-matrix/domain/Api"
import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"
import { ServerConfigService } from "../Config.js"
import { ApiKeysRepository } from "../Repositories/ApiKeysRepository.js"

/**
 * API Keys API Group implementation
 * Handles listing, creating, and revoking API keys
 */
export const ApiKeysGroupLive = HttpApiBuilder.group(
  CloudMatrixApi,
  "apiKeys",
  (handlers) =>
    Effect.gen(function*() {
      const config = yield* ServerConfigService
      const apiKeysRepo = yield* ApiKeysRepository

      const userId = config.defaultUserId

      return handlers
        // GET /api/v1/projects/:projectId/api-keys
        .handle("listApiKeys", ({ path: { projectId } }) =>
          Effect.gen(function*() {
            const apiKeys = yield* apiKeysRepo.findByProjectId(projectId)
            return { apiKeys }
          }))
        // POST /api/v1/projects/:projectId/api-keys
        .handle("createApiKey", ({ path: { projectId }, payload }) =>
          Effect.gen(function*() {
            const apiKeyWithSecret = yield* apiKeysRepo.generate(projectId, userId, payload)
            const { keyHash, plainKey, userId: _userId, ...apiKeyResponse } = apiKeyWithSecret
            return {
              ...apiKeyResponse,
              key: plainKey
            }
          }))
        // DELETE /api/v1/projects/:projectId/api-keys/:apiKeyId
        .handle("revokeApiKey", ({ path: { apiKeyId } }) => apiKeysRepo.revoke(apiKeyId))
    })
)
