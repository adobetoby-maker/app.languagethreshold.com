<!-- BEGIN:tanstack-start-rules -->

# TanStack Start — not a standard Vite/Next.js app

Uses TanStack Start (not Next.js). Server functions are in `src/routes/api.*.ts`.
Production is the linked Vercel project `language-threshold-app`; `scripts/vercel-adapter.mjs`
creates the Vercel Build Output API artifact. Run `npx tsc --noEmit` after type changes.

<!-- END:tanstack-start-rules -->

# Language Lens Elite — Project Context

## What This Is

Language learning app (language-lens). Hosted at app.languagethreshold.com.
Features: AI tutor, discussion mode, field prep, sports news, speaking practice.

## Stack

- TanStack Start (React 19) + Supabase
- Deployed to Vercel using the repository's Build Output API adapter
- Machine: [SSH] Mac Studio (~/language-lens-elite) | [MAC] Local dev at ~/language-lens

## Commands

```bash
npm run dev        # localhost:3000 (or bun dev)
npm run build      # production build
npm run preview    # local preview
npm run deploy     # gated production deploy to the linked Vercel project
npx tsc --noEmit   # type check
npm run smoke:e2e  # run before every push to main: key Playwright specs on a free port (>=3450); exit code = test results only
npm run smoke:e2e -- --phone | --prod   # add iphone-pwa project | run core60-path + foundation against app.languagethreshold.com
```

## Deployment

- Vercel project: `language-threshold-app`
- Live URL: https://app.languagethreshold.com
- Project link: `.vercel/project.json`
- Pre-deploy guard: `scripts/verify-deploy-target.mjs`
- Re-auth if deploy fails: `npx vercel login`

## API Routes (server functions — run in Vercel Functions)

- `src/routes/api.tutor.ts` — AI tutor chat (Anthropic)
- `src/routes/api.speak.ts` — speaking practice
- `src/routes/api.discussion.ts` — discussion mode
- `src/routes/api.field-prep.ts` — field preparation
- `src/routes/api.module-field-prep.ts` — module field prep
- `src/routes/api.sports-news.ts` — sports news feed

## Key Env Vars (Vercel environment variables)

```
ANTHROPIC_API_KEY         # AI features
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Set via the Vercel project settings or `vercel env add`.

## Architecture

```
src/
  routes/         — pages + API server functions
    __root.tsx    — root layout
    [index].tsx   — home/dashboard
    api.*.ts      — server-only API routes (run in Workers)
  components/     — React components
  lib/            — shared utilities
  state/          — client state
  hooks/          — React hooks
  data/           — static data
  integrations/   — third-party integrations
  fns/            — utility functions
supabase/
  migrations/     — DB migrations
```

## TanStack Start vs Next.js

- Server functions use `createAPIFileRoute` not Next.js Route Handlers
- No `app/` directory — routes are in `src/routes/`
- No `layout.tsx` pattern — use `__root.tsx`
- File-based routing: `[index].tsx` = `/`, `api.tutor.ts` = `/api/tutor`

## DON'T TOUCH

- `.vercel/project.json` project identity
- `src/routeTree.gen.ts` — auto-generated, never edit manually

# Customer-facing translation language

Describe translation choices by the level of work requested, such as Standard for everyday documents and Detailed for technical or complex wording. Do not expose model names in customer-facing controls or marketing copy. Keep model identifiers in the implementation.

# Readable product typography

Use upright lettering throughout the app, with clear serif headings and clean sans-serif body text. Avoid italics, tiny tracked labels, faded text containers, and pale text on pale backgrounds. Verify Progress status panels and locked states in both Light and Dark themes when changing their colors.
