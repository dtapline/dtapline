import { Schema } from "effect"
import { ProjectId } from "./Project.js"
import { UserId } from "./User.js"

// Branded type for API Key ID
export class ApiKeyId extends Schema.String.pipe(Schema.brand("ApiKeyId")) {}

// API Key scopes
export const ApiKeyScope = Schema.Literal("deployments:write", "deployments:read", "admin")
export type ApiKeyScope = Schema.Schema.Type<typeof ApiKeyScope>

// API Key schema (stored in database)
export class ApiKey extends Schema.Class<ApiKey>("ApiKey")({
  id: ApiKeyId,
  projectId: ProjectId,
  userId: UserId,
  keyHash: Schema.String, // bcrypt hash of the key
  keyPrefix: Schema.String, // First few characters for identification (e.g., "cm_XyZ")
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  scopes: Schema.Array(ApiKeyScope),
  createdAt: Schema.DateFromSelf,
  lastUsedAt: Schema.optional(Schema.DateFromSelf),
  expiresAt: Schema.optional(Schema.DateFromSelf)
}) {}

// Create API key input
export class CreateApiKeyInput extends Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  scopes: Schema.optionalWith(Schema.Array(ApiKeyScope), { default: () => ["deployments:write"] as const })
}) {}

// API Key response (includes full key only once during creation)
export class ApiKeyResponse extends Schema.Struct({
  id: ApiKeyId,
  key: Schema.optional(Schema.String), // Only present on creation
  keyPrefix: Schema.String,
  name: Schema.String,
  scopes: Schema.Array(ApiKeyScope),
  createdAt: Schema.DateFromSelf,
  lastUsedAt: Schema.optional(Schema.DateFromSelf)
}) {}
