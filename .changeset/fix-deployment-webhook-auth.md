---
"@dtapline/api": patch
---

Fix 500 Internal Server Error in deployment webhook endpoint when authorization header is missing or invalid. The issue was caused by missing `return` statements after `Effect.fail()` calls, allowing code execution to continue and attempt to access undefined values.

**Fixed:**
- Added `return` statements before `yield* Effect.fail()` in authorization validation
- Properly handles missing Authorization header (returns 401)
- Properly handles invalid Authorization header format (returns 401)
- Properly handles insufficient API key scopes (returns 403)

**Impact:**
- CLI deployments that were failing with 500 errors will now receive proper 401/403 error responses
- Error messages are now descriptive and help users fix authentication issues
