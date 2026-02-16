---
"@dtapline/cli": patch
---

Fix npm installation error by removing unused workspace dependency

Removed `@dtapline/domain` dependency from CLI package.json. This dependency was causing installation failures when users installed the CLI from npm because `@dtapline/domain` is a private workspace package not published to npm. The dependency was never actually used in the CLI code - all functionality is self-contained and bundled with esbuild.
