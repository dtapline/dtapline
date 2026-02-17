---
"@dtapline/domain": minor
"@dtapline/api": minor
"@dtapline/ui": minor
---

Add demo user functionality with read-only access and automatic sign-in route. Demo users can explore the full application with pre-seeded sample data but cannot modify any resources. This provides a public demo experience without requiring account creation.

**Backend changes:**
- Added `AuthorizationService` for role-based access control
- Implemented `DemoUserMiddleware` that blocks all non-GET requests (POST, PUT, PATCH, DELETE) for demo users
- Added `Forbidden` error response for unauthorized write operations
- Enhanced Better Auth hooks to prevent demo users from modifying their accounts
- Created seed script with sample e-commerce microservices data

**Frontend changes:**
- Added `/demo` route that automatically signs in as demo user (demo@dtapline.com)
- Updated UI components to show error messages when demo users attempt write operations
- Added visual indicators in account settings for demo users
- Improved error handling in dialogs and forms to display authorization errors

**Security:**
- Demo users authenticated via Better Auth with proper session management
- Write operations blocked at HTTP middleware layer (no endpoint-specific checks needed)
- Error messages follow standard API format with `_tag` and `message` fields
