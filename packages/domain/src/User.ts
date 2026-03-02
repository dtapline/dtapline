import * as Schema from "effect/Schema"
import { DateFromString } from "./DateFromString.js"

// Branded type for User ID
export const UserId = Schema.String.pipe(Schema.brand("UserId"))
export type UserId = Schema.Schema.Type<typeof UserId>

// User role enum - combines role + plan into single field
// admin: Full system access, bypasses all limits
// proUser: Paid plan with unlimited projects
// freeUser: Free plan with limited projects
// demoUser: Read-only demo account with pre-seeded data
export const UserRole = Schema.Literals(["admin", "proUser", "freeUser", "demoUser"])
export type UserRole = Schema.Schema.Type<typeof UserRole>

// Plan limits configuration based on role
export const RoleLimits = {
  admin: { maxProjects: Infinity, maxServices: Infinity },
  proUser: { maxProjects: Infinity, maxServices: Infinity },
  freeUser: { maxProjects: 5, maxServices: 10 },
  demoUser: { maxProjects: 0, maxServices: 0 } // Read-only, cannot create
} as const

// User schema (aligned with Better Auth structure)
export class User extends Schema.Class<User>("User")({
  id: UserId,
  email: Schema.String.pipe(Schema.check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))),
  name: Schema.String,
  emailVerified: Schema.Boolean,
  image: Schema.NullOr(Schema.String),
  role: UserRole,
  createdAt: DateFromString,
  updatedAt: DateFromString
}) {}
