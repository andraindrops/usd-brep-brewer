# usd-brep viewer

Bun + TypeScript + React + Tailwind CSS + shadcn/ui

```bash
bun install
bun dev            # dev server (hot reload)
bun run build      # static build -> dist/
bun start          # production server

bun run typecheck  # tsc --noEmit
bun run lint       # eslint (lint:fix to auto-fix)
bun run format     # prettier --write (format:check to verify)
bun run check      # typecheck + lint + format:check
```

- Imports use the `@/` alias for `src/` (relative imports are rejected by ESLint).
- Add shadcn components with `bunx --bun shadcn@latest add <name>`.
