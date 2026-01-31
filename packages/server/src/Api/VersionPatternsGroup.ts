import { CloudMatrixApi } from "@cloud-matrix/domain/Api"
import { testPattern } from "@cloud-matrix/domain/Utils/VersionExtractor"
import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"
import { VersionPatternsRepository } from "../Repositories/VersionPatternsRepository.js"

/**
 * Version Patterns API Group implementation
 * Handles getting, updating, and testing version extraction patterns
 */
export const VersionPatternsGroupLive = HttpApiBuilder.group(
  CloudMatrixApi,
  "versionPatterns",
  (handlers) =>
    Effect.gen(function*() {
      const patternsRepo = yield* VersionPatternsRepository

      return handlers
        // GET /api/v1/projects/:projectId/version-patterns
        .handle("getVersionPattern", ({ path: { projectId } }) => patternsRepo.getOrCreate(projectId))
        // PUT /api/v1/projects/:projectId/version-patterns
        .handle("updateVersionPattern", ({ path: { projectId }, payload }) => patternsRepo.update(projectId, payload))
        // POST /api/v1/projects/:projectId/version-patterns/test
        .handle("testPattern", ({ payload }) => Effect.succeed(testPattern(payload.pattern, payload.testTag)))
    })
)
