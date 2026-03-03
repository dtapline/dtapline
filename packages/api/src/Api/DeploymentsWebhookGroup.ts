import { DtaplineApi } from "@dtapline/domain/Api"
import { InvalidApiKey, UnauthorizedApiKey } from "@dtapline/domain/Errors"
import * as Effect from "effect/Effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { ApiKeysRepository } from "../Repositories/ApiKeysRepository.js"
import { BroadcastService } from "../Services/BroadcastService.js"
import { DeploymentService } from "../Services/DeploymentService.js"

/**
 * Webhook API Group implementation
 * Handles deployment webhooks with API key authentication
 */
export const DeploymentsWebhookGroupLive = HttpApiBuilder.group(
  DtaplineApi,
  "deploymentsWebhook",
  (handlers) =>
    Effect.gen(function*() {
      const deploymentService = yield* DeploymentService
      const apiKeysRepo = yield* ApiKeysRepository
      const broadcastService = yield* BroadcastService

      return handlers.handle("createDeployment", ({ payload, request }) =>
        Effect.gen(function*() {
          // 1. Extract API key from Authorization header
          const authHeader = request.headers.authorization
          if (!authHeader) {
            return yield* Effect.fail(new InvalidApiKey({ message: "Missing Authorization header" }))
          }
          const match = authHeader.match(/^Bearer\s+(.+)$/i)
          if (!match) {
            return yield* Effect.fail(
              new InvalidApiKey({ message: "Invalid Authorization header format. Expected: Bearer <api-key>" })
            )
          }
          const plainKey = match[1]

          // 2. Validate API key
          const apiKey = yield* apiKeysRepo.validate(plainKey)

          // 3. Check if API key has deployments:write scope
          if (!apiKey.scopes.includes("deployments:write")) {
            return yield* Effect.fail(
              new UnauthorizedApiKey({
                message: "API key does not have 'deployments:write' scope"
              })
            )
          }

          // 4. Update last used timestamp (ignore failures)
          yield* apiKeysRepo.updateLastUsed(String(apiKey.id)).pipe(
            Effect.catch(() => Effect.void)
          )

          // 5. Process the deployment webhook
          const deployment = yield* deploymentService.processWebhook(
            String(apiKey.projectId),
            payload
          )

          // 6. Broadcast deployment update to connected WebSocket clients
          yield* broadcastService.sendToUser(String(apiKey.userId), {
            action: "deployment-created",
            message: {
              projectId: String(apiKey.projectId),
              deployment: {
                id: deployment.id,
                environmentId: deployment.environmentId,
                serviceId: deployment.serviceId,
                version: deployment.version,
                status: deployment.status,
                deployedAt: deployment.deployedAt.toISOString()
              }
            }
          })

          return {
            id: deployment.id,
            version: deployment.version,
            message: "Deployment recorded successfully"
          }
        }))
    })
)
