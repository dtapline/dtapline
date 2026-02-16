---
"@dtapline/api": patch
---

fix: convert branded UserId to string for MongoDB user lookup in ServicesRepository

**Bug Fix:** When reporting deployments via CLI, the server was returning a 500 error with "User not found for project" due to a type mismatch in the user lookup query.

**Root Cause:**
The `ServicesRepository.getOrCreate()` method queries the user collection to check plan limits. However, `project.userId` is a branded type (`UserId`) while MongoDB stores it as a plain string. MongoDB couldn't match the branded type against the stored string value.

**Changes:**
- Convert `project.userId` to plain string using `String()` before querying MongoDB user collection
- This fixes the user lookup in the plan limit validation flow

**Impact:**
- CLI deployments will now successfully complete instead of failing with 500 errors
- Plan limit checks for auto-created services will work correctly
- No changes to API behavior or responses, only internal bug fix
