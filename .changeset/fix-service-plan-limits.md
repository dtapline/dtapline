---
"@dtapline/api": patch
"@dtapline/domain": patch
---

fix: enforce plan limits when auto-creating services via CLI/webhook

**Security Fix:** When deployments are reported via CLI using API tokens, services are automatically created if they don't exist. This was bypassing plan limit checks, allowing free users to exceed the 3-service limit.

**Changes:**
- Added plan limit validation to `ServicesRepository.getOrCreate()` 
- Service auto-creation now checks the project owner's role and enforces `RoleLimits`
- Returns `PlanLimitExceeded` error (403) if limit would be exceeded
- Updated webhook API to handle `PlanLimitExceeded` error responses

**Impact:**
- Free users (3 service limit) can no longer bypass restrictions via CLI
- Premium users (10 service limit) are also properly enforced
- Enterprise users (unlimited) are unaffected
- CLI will receive clear error message when limit is reached

**Example Error Response:**
```json
{
  "_tag": "PlanLimitExceeded",
  "role": "freeUser",
  "resource": "services",
  "limit": 3,
  "message": "You have reached the maximum number of services (3) for your plan. Upgrade to create more services."
}
```
