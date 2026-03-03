import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import { DateFromString } from "./DateFromString.js"
import { ProjectId } from "./Project.js"
import { UserId } from "./User.js"

// Branded type for API Key ID
export const ApiKeyId = Schema.String.pipe(Schema.brand("ApiKeyId"))

// API Key scopes
export const ApiKeyScope = Schema.Literals(["deployments:write", "deployments:read", "admin"])
export type ApiKeyScope = Schema.Schema.Type<typeof ApiKeyScope>

// API Key schema (stored in database)
export class ApiKey extends Schema.Class<ApiKey>("ApiKey")({
  id: ApiKeyId,
  projectId: ProjectId,
  userId: UserId,
  keyHash: Schema.String, // bcrypt hash of the key
  keyPrefix: Schema.String, // First few characters for identification (e.g., "cm_XyZ")
  name: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
  scopes: Schema.Array(ApiKeyScope),
  createdAt: DateFromString,
  lastUsedAt: Schema.optional(DateFromString),
  expiresAt: Schema.optional(DateFromString)
}) {}

// Create API key input
export const CreateApiKeyInput = Schema.Struct({
  name: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
  scopes: Schema.optional(Schema.Array(ApiKeyScope)).pipe(
    Schema.decodeTo(Schema.toType(Schema.Array(ApiKeyScope)), {
      decode: SchemaGetter.withDefault(() =>
        ["deployments:write"] as ReadonlyArray<"deployments:write" | "deployments:read" | "admin">
      ),
      encode: SchemaGetter.required()
    })
  )
})

// API Key response (includes full key only once during creation)
export const ApiKeyResponse = Schema.Struct({
  id: ApiKeyId,
  key: Schema.optional(Schema.String), // Only present on creation
  keyPrefix: Schema.String,
  name: Schema.String,
  scopes: Schema.Array(ApiKeyScope),
  createdAt: DateFromString,
  lastUsedAt: Schema.optional(DateFromString)
})
