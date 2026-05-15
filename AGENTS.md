# AGENTS.md

## Cursor Cloud specific instructions

### Overview

FieldPro is a pnpm monorepo (Turborepo) with these main services:

| Service | Port | Command |
|---------|------|---------|
| Web dashboard (Next.js 16) | 3000 | `pnpm --filter @field-service/web dev` |
| Marketing site (Next.js 16) | 3001 | `pnpm --filter @field-service/marketing dev` |
| Widget (Vite) | 5173 | `pnpm --filter @field-service/widget dev` |

### Important caveats

- **Next.js 16 breaking changes:** `next lint` CLI command was removed. There is no ESLint configuration in this repo. Use `pnpm typecheck` for static analysis.
- **Custom server:** The web app uses `tsx server.ts` (not `next dev`) to support WebSocket connections for the AI voice agent. The dev command is already configured correctly in `package.json`.
- **Build scripts:** `esbuild` and `sharp` require build-script approval. This is handled by `pnpm.onlyBuiltDependencies` in root `package.json`.
- **Environment variables:** The web app requires at minimum `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL` in `apps/web/.env.local`. Copy from `.env.local.example`. Without a real Supabase project, the UI renders but auth/data calls fail.
- **Hostname:** The dev server binds to `HOSTNAME` env var (defaults to `localhost`). In cloud VMs this may resolve to a container hostname — access via `http://localhost:3000` regardless.

### Common commands

See root `package.json` scripts. Key ones:
- `pnpm install` — install all workspace deps
- `pnpm typecheck` — TypeScript check all packages
- `pnpm dev` — start all dev-capable apps via Turborepo
- `pnpm build` — production build all apps
- `pnpm format` — Prettier format all files
