import { DtaplineApi } from "@dtapline/domain/Api"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { ApiKeysRepository } from "../Repositories/ApiKeysRepository.js"
import { AuthService } from "../Services/AuthService.js"

/**
 * API Keys API Group implementation
 * Handles listing, creating, and revoking API keys
 */
export const ApiKeysGroupLive = HttpApiBuilder.group(
  DtaplineApi,
  "apiKeys",
  (handlers) =>
    Effect.gen(function*() {
      const authService = yield* AuthService
      const apiKeysRepo = yield* ApiKeysRepository

      return handlers
        // GET /api/v1/projects/:projectId/api-keys
        .handle("listApiKeys", ({ params: { projectId } }) =>
          Effect.gen(function*() {
            const apiKeys = yield* apiKeysRepo.findByProjectId(projectId)
            return { apiKeys }
          }))
        // POST /api/v1/projects/:projectId/api-keys
        .handle("createApiKey", ({ params: { projectId }, payload, request }) =>
          Effect.gen(function*() {
            const userId = yield* authService.getUserId(request)
            const apiKeyWithSecret = yield* apiKeysRepo.generate(projectId, userId, payload)
            const { keyHash: _keyHash, plainKey, userId: _userId, ...apiKeyResponse } = apiKeyWithSecret
            return {
              ...apiKeyResponse,
              key: plainKey
            }
          }))
        // DELETE /api/v1/projects/:projectId/api-keys/:apiKeyId
        .handle("revokeApiKey", ({ params: { apiKeyId } }) => apiKeysRepo.revoke(apiKeyId))
    })
)
