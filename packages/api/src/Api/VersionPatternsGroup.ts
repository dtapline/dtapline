import { DtaplineApi } from "@dtapline/domain/Api"
import { testPattern } from "@dtapline/domain/Utils/VersionExtractor"
import * as Effect from "effect/Effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { VersionPatternsRepository } from "../Repositories/VersionPatternsRepository.js"

/**
 * Version Patterns API Group implementation
 * Handles getting, updating, and testing version extraction patterns
 */
export const VersionPatternsGroupLive = HttpApiBuilder.group(
  DtaplineApi,
  "versionPatterns",
  (handlers) =>
    Effect.gen(function*() {
      const patternsRepo = yield* VersionPatternsRepository

      return handlers
        // GET /api/v1/projects/:projectId/version-patterns
        .handle("getVersionPattern", ({ params: { projectId } }) => patternsRepo.getOrCreate(projectId))
        // PUT /api/v1/projects/:projectId/version-patterns
        .handle("updateVersionPattern", ({ params: { projectId }, payload }) => patternsRepo.update(projectId, payload))
        // POST /api/v1/projects/:projectId/version-patterns/test
        .handle("testPattern", ({ payload }) => Effect.succeed(testPattern(payload.pattern, payload.testTag)))
    })
)
