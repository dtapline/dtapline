import { Schema } from "effect"
import { pipe } from "effect/Function"
import { ObjectId as MongoObjectId } from "mongodb"

/**
 * Schema for MongoDB ObjectId that stays as ObjectId instance
 * Used internally in repositories
 */
export const ObjectIdFromSelf = pipe(
  Schema.instanceOf(MongoObjectId),
  Schema.annotate({
    identifier: "ObjectIdFromSelf",
    description: "MongoDB ObjectId instance"
  })
)

/**
 * Helper to validate if a string is a valid ObjectId
 */
export const isValidObjectId = (id: string): boolean => {
  return MongoObjectId.isValid(id)
}

/**
 * Helper to create ObjectId from string (throws on invalid)
 */
export const toObjectId = (id: string): MongoObjectId => {
  if (!MongoObjectId.isValid(id)) {
    throw new Error(`Invalid ObjectId: ${id}`)
  }
  return new MongoObjectId(id)
}

/**
 * Helper to convert ObjectId to string
 */
export const fromObjectId = (id: MongoObjectId): string => {
  return id.toHexString()
}
