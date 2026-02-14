---
"@dtapline/api": minor
"@dtapline/ui": minor
"@dtapline/domain": patch
---

Add Better Auth authentication system with comprehensive integration tests

- Implement Better Auth with MongoDB adapter for user authentication
- Add email/password authentication with session management
- Configure session cookie handling with cookieCache disabled for database lookups
- Add authentication API endpoints (signup, login, logout, get-session)
- Implement AuthService for user management and session validation
- Add API key authentication alongside Better Auth sessions
- Create login and signup pages in UI with Better Auth React client
- Add user menu with logout functionality in sidebar
- Configure CORS for cross-origin authentication
- Add role-based access control (freeUser vs proUser for self-hosted)
- Implement comprehensive integration tests (7 tests) using vitest-mongodb with replica set
- Add MongoDB in-memory test setup with proper TypeScript configuration
- Fix session validation issue by disabling cookie cache to force database lookups
- Update User schema to include role field with proper validation
