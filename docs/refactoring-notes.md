# Refactoring Notes - Instructions Flagged for Review

## Instructions Removed (Redundant or Obvious)

These were removed because AI agents already know them or they're enforced by tooling:

1. **"This document provides essential information for AI coding agents working in this repository"** - Meta description, not actionable

2. **TypeScript Configuration details** - These are already in tsconfig.json:
   - Strict mode enabled
   - Module system: ESM with NodeNext
   - Target: ES2022
   - Decorators enabled
   - Source maps generated
   - No unused locals

3. **"Install dependencies: pnpm install"** - Standard operation, not project-specific

4. **"No duplicates: Plugin enforces no duplicate imports"** - Already enforced by ESLint, agent doesn't need to know

5. **"JSDoc for public APIs (when needed)"** - Too vague, not actionable

6. **"Inline comments for complex logic"** - Generic advice, agent already knows

7. **"Remove comments in production builds: disabled (removeComments: false)"** - Build config detail, not relevant to coding

8. **Testing configuration paths** - Not actionable, just informational:
   - "Shared config in vitest.shared.ts"
   - "Package-specific configs in packages/*/vitest.config.ts"
   - "Workspace config in vitest.workspace.ts"

9. **UI component file naming contradiction** - Resolved: Use PascalCase for all components

10. **Package descriptions** - Too generic:
    - "`@cloud-matrix/domain` - Domain models and business logic (Effect-based)"
    - "`@cloud-matrix/server` - Server/API layer (Effect Platform)"
    - "`@cloud-matrix/ui` - React frontend with TanStack Router and Tailwind CSS"
    
    Replaced with: "Effect-TS monorepo: domain (Effect core), server (Effect Platform), ui (React + TanStack Router + Tailwind)"

11. **Additional Resources** - Moved to minimal section, removed less critical links:
    - Removed: Radix UI, Tailwind CSS (can be googled)
    - Kept: Effect, TanStack Router (more project-specific)

12. **"Prefer inference over explicit types where clear"** - Generic TypeScript advice

## File Structure Created

```
/
├── AGENTS.md                    # Minimal root file (36 lines)
└── docs/
    ├── commands.md              # All build/test/lint commands
    ├── typescript-style.md      # Formatting, imports, naming
    ├── effect-patterns.md       # Effect-specific patterns
    ├── react-patterns.md        # React-specific patterns
    └── testing.md               # Testing structure and config
```

## Result

- **Original:** 329 lines, everything in one file
- **New root:** 36 lines with 3 critical rules + links
- **Supporting docs:** ~200 lines total across 5 focused files
- **Progressive disclosure:** Agent sees essentials first, clicks through for details when needed
