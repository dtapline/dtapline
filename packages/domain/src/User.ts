import { Schema } from "effect"

// Branded type for User ID
export class UserId extends Schema.String.pipe(Schema.brand("UserId")) {}

// User schema
export class User extends Schema.Class<User>("User")({
  id: UserId,
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  name: Schema.String,
  createdAt: Schema.DateFromSelf
}) {}

// For MVP: Hardcoded default user
export const DEFAULT_USER_ID = Schema.decodeSync(UserId)("default-user")
export const DEFAULT_USER = {
  id: DEFAULT_USER_ID,
  email: "team@company.com",
  name: "Development Team",
  createdAt: new Date()
} satisfies Schema.Schema.Type<typeof User>
