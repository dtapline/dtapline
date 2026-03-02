---
"@dtapline/domain": patch
---

Replace `Schema.DateFromSelf` with `Schema.Date` (alias for `Schema.DateFromString`) across all domain schemas.

`DateFromSelf` encodes `Date → Date` (identity), so when `HttpApiClient` receives an ISO date string from JSON and attempts to decode it via `DateFromSelf`, it fails because the schema expects a `Date` instance. `Schema.Date` correctly decodes `string → Date`, matching the actual wire format.
