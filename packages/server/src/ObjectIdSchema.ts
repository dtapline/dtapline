import { Schema } from "effect"
import { pipe } from "effect/Function"
import * as ParseResult from "effect/ParseResult"
import { ObjectId as MongoObjectId } from "mongodb"

/**
 * Schema for MongoDB ObjectId that stays as ObjectId instance
 * Used internally in repositories
 */
export const ObjectIdFromSelf = pipe(
  Schema.instanceOf(MongoObjectId),
  Schema.annotations({
    identifier: "ObjectIdFromSelf",
    description: "MongoDB ObjectId instance"
  })
)

/**
 * Schema that transforms between string (external) and ObjectId (internal)
 * - Decode: string -> ObjectId (when reading from API/domain)
 * - Encode: ObjectId -> string (when returning to API/domain)
 *
 * This keeps ObjectId internal to repositories - external code only sees strings
 */
export const ObjectIdFromString = Schema.transformOrFail(
  Schema.String.pipe(
    Schema.pattern(/^[0-9a-fA-F]{24}$/),
    Schema.annotations({
      description: "24-character hexadecimal ObjectId string"
    })
  ),
  ObjectIdFromSelf,
  {
    decode: (str, _, ast) => {
      try {
        return ParseResult.succeed(new MongoObjectId(str))
      } catch (error: any) {
        return ParseResult.fail(
          new ParseResult.Type(ast, str, `Invalid ObjectId format: ${error.message}`)
        )
      }
    },
    encode: (objectId, _, ast) => {
      try {
        return ParseResult.succeed(objectId.toHexString())
      } catch (error: any) {
        return ParseResult.fail(
          new ParseResult.Type(ast, objectId, `Failed to convert ObjectId to string: ${error.message}`)
        )
      }
    }
  }
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
