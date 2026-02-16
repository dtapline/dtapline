---
"@dtapline/cli": patch
---

Fix npm installation error and improve build process

- Fixed npm installation by bundling internal `@dtapline/domain` package while keeping Effect dependencies external
- Version is now dynamically injected from package.json at build time instead of being hardcoded
- Migrated from manual esbuild to tsdown for better TypeScript-first bundling experience
- Cleaner build configuration with TypeScript config file
