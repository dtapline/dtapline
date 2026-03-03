/**
 * Schema for Date that encodes/decodes as ISO 8601 string.
 *
 * Effect 4.x's `Schema.Date` is a declaration that validates `Date` instances
 * but does NOT transform between `string` and `Date`. The `toCodecJson`
 * annotation on `Schema.Date` handles this, but `HttpApiClient` does not
 * apply `toCodecJson` when decoding responses, so `Schema.Date` fields
 * fail to decode from JSON strings.
 *
 * This schema provides explicit `string <-> Date` transformation so that
 * JSON round-tripping works correctly in both the server (HttpApi encoding)
 * and client (HttpApiClient decoding).
 */
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"

export const DateFromString = Schema.String.pipe(
  Schema.decodeTo(Schema.Date, {
    decode: SchemaGetter.transform((s: string) => new Date(s)),
    encode: SchemaGetter.transform((d: Date) => d.toISOString())
  })
)
