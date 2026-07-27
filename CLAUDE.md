---
project: app.languagethreshold.com
category: language-learning-app
deploy: vercel
lifecycle: active
last_verified: 2026-05-26
deployment_url: https://app.languagethreshold.com
supabase_project: pollhlkgltdkdskdzsgd
stripe_webhook_url: https://app.languagethreshold.com/api/stripe-webhook
---

# Language Threshold (`app.languagethreshold.com`)

Multi-language learning platform: parallel reader, flashcards, grammar, speaking, matchmaking, leaderboard.

See `~/.claude/categories/language-learning-app.md` for shared patterns.
**CRITICAL DEVIATION: This is NOT Next.js. NOT Cloudflare Workers. It is Vite + TanStack Start deployed to Vercel.**

---

## Deviations from Category

- **TanStack Start** (React Router v7 + Vite) — NOT Next.js App Router
- **Deployed to Vercel** (was CF Workers — migrated) — use `vercel --prod` not `wrangler`
- **No `app/` directory** — routes live in `src/routes/`
- **Two separate tier systems** — XP tier ≠ rank tier (see Vocabulary)
- **Server functions** via TanStack Start (not Next.js Server Actions or Route Handlers)
- **Lazy-proxy Supabase** — uses `import.meta.env.VITE_*` + process.env fallback for SSR

---

## Before Touching

Read `src/components/tab-registry.ts` (TabKey exhaustiveness map — ADR-0011) and `src/state/app-state.tsx` (XP tier system — separate from rank tier in match-state.tsx).

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (auto-picks open port, usually 8080+) |
| `npm run build` | production build → `.vercel/output/` |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | type check — run after any tab addition (ADR-0011) |
| `vercel deploy --prod --yes` | deploy to production |

---

## Infrastructure

### Supabase

- **Project ref:** `pollhlkgltdkdskdzsgd`
- **Dashboard:** https://supabase.com/dashboard/project/pollhlkgltdkdskdzsgd
- **REST API:** https://pollhlkgltdkdskdzsgd.supabase.co/rest/v1/
- **MCP server:** configured in `/Users/drive/.mcp.json` as `supabase`

### Stripe

- **Webhook endpoint:** https://app.languagethreshold.com/api/stripe-webhook
- **Webhook registered in Stripe Dashboard** — 9 events (checkout, subscription.*, invoice.payment_*)
- **Pricing tiers:** Monthly $19/mo · Annual $149/yr ($12/mo) · Family $249/yr
- **Payment Links (fallback when price IDs not set):**
  - Monthly: https://buy.stripe.com/14A9AVemfg0l1zH8aqbfO08
  - Annual: https://buy.stripe.com/bJe7sN2Dx29v0vD76mbfO09
  - Family: https://buy.stripe.com/bJecN791V29v4LT76mbfO0a

### Vercel Analytics

- `<Analytics />` from `@vercel/analytics/react` — mounted in `src/routes/__root.tsx` RootShell

---

## Env Vars

**Local** (`.env.local` — never commit):
```
VITE_SUPABASE_PUBLISHABLE_KEY     # sb_publishable_... client-safe new format
SUPABASE_SERVICE_ROLE_KEY         # server-only — used by stripe webhook to write profiles
STRIPE_SECRET_KEY                 # sk_live_... server-only
STRIPE_WEBHOOK_SECRET             # whsec_KOnd... production webhook signing secret
DATABASE_URL                      # Prisma pooler URL (fill in DB password)
DIRECT_URL                        # Prisma direct URL for migrations (fill in DB password)
```

**Vercel production** (all set as of 2026-05-26):
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
ANTHROPIC_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

**Optional (pricing page falls back to Payment Links if not set):**
```
VITE_STRIPE_PRICE_MONTHLY
VITE_STRIPE_PRICE_ANNUAL
VITE_STRIPE_PRICE_FAMILY
```

---

## Database Schema (Supabase public)

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | `id` (→ auth.users), `data` JSONB | Full AppState + subscription fields stored here |
| `mission_pins` | `user_id`, `mission_lat/lng`, `hometown_lat/lng` | Public read, authenticated write |
| `library_books` | `user_id`, `chapters` JSONB | Cloud-synced custom uploads |
| `family_groups` | `owner_user_id`, `family_code`, `mission_pin_id` | Public read |
| `family_members` | `group_id`, `is_missionary` | Max 7 per group (DB trigger enforced) |

`profiles.data` JSONB fields written by Stripe webhook:
- `subscription_status` — active / trialing / canceled / paused
- `stripe_customer_id`
- `subscription_id`
- `period_end`
- `price_id`
- `cancel_at_period_end`
- `trial_ending_soon` (set by trial_will_end event)
- `last_payment_failed`

---

## Stripe Webhook Events Handled (`src/routes/api.stripe-webhook.ts`)

| Event | Action |
|---|---|
| `checkout.session.completed` | Sets trialing/active + stripe_customer_id |
| `customer.subscription.created/updated` | Mirrors full sub status + metadata |
| `customer.subscription.deleted` | Sets canceled |
| `customer.subscription.paused` | Sets paused |
| `customer.subscription.resumed` | Sets active |
| `customer.subscription.trial_will_end` | Sets trial_ending_soon: true |
| `invoice.payment_succeeded` | Sets active + last_payment_failed: false |
| `invoice.payment_failed` | Sets last_payment_failed: true |

---

## Architecture

### Provider Stack — Order Is Critical

```
AuthProvider → SubscriptionProvider → AppProvider → LibraryProvider → NotesProvider
→ GrammarProvider → SpeechProvider → SpeakProvider → TutorProvider → MatchProvider → LeaderboardProvider
```

### State Architecture (`src/state/`)

| File | Owns |
|---|---|
| `app-state.tsx` | XP, XP tier, streak, achievements, active tab, language/level |
| `auth-state.tsx` | Supabase session |
| `subscription-state.tsx` | Stripe sub status from profiles.data — isActive, status, refresh |
| `match-state.tsx` | Multiplayer matchmaking + rank tier (SEPARATE from XP tier) |
| `grammar-state.tsx` | Grammar exercises |
| `speak-state.tsx` | Speaking practice |
| `library-state.tsx` | Content library |
| `notes-state.tsx` | User notes |
| `tutor-state.tsx` | AI tutor sessions |
| `leaderboard-state.tsx` | Leaderboard data |
| `speech-state.tsx` | Speech recognition |

### Tab System — Dual Update Required (ADR-0011)

Adding a tab requires updating BOTH:
1. `TabKey` union type in `src/state/app-state.tsx`
2. `TAB_COMPONENTS` map in `src/components/tab-registry.ts`

Missing step 2 → runtime crash on tab click, no build error.

Current tabs: Reader, Kana Pad, Grammar, Speak, Discussions, Library, Notes, Tutor, Match, Leaderboard, Dashboard

### Server Routes

| Route | Purpose |
|---|---|
| `src/routes/api.tutor.ts` | AI tutor (Anthropic SDK + Zod) |
| `src/routes/api.speak.ts` | Speaking feedback |
| `src/routes/api.discussion.ts` | Discussion AI |
| `src/routes/api.create-checkout.ts` | Stripe checkout session creation |
| `src/routes/api.stripe-webhook.ts` | Stripe → Supabase sync (9 events) |
| `src/routes/pricing.tsx` | Pricing page (3 tiers + free) |
| `src/routes/subscribe/success.tsx` | Post-checkout success |

---

## Decision Defaults

| User says / context | Default action |
|---|---|
| "add a tab" | Dual update: app-state.tsx TabKey + tab-registry.ts TAB_COMPONENTS (ADR-0011) |
| "deploy" | `vercel deploy --prod --yes` — NOT wrangler |
| "add an AI feature" | Create server function in `src/routes/api.[name].ts` |
| "subscription not updating" | Check profiles.data.subscription_status via Supabase MCP |
| "XP not updating" | Check app-state.tsx ADD_XP dispatch + Supabase profiles table |
| "rank tier broken" | Check match-state.tsx — separate from XP tier |
| "webhook not firing" | Check Stripe Dashboard → Webhooks → recent deliveries |
| "API route" | TanStack Start server function — NOT Next.js Route Handlers |

---

## Failure Patterns

- Adding TabKey without updating TAB_COMPONENTS → runtime crash on tab click, no build error (ADR-0011)
- Confusing XP tier with rank tier → wrong state updated, silent wrong behavior
- Using `wrangler deploy` → project is on Vercel, not CF Workers
- Using `process.env` for Supabase keys client-side → undefined in Vite; use `import.meta.env.VITE_*`
- Stripe webhook returning 503 → `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` missing from Vercel env
- Invoice events not updating profiles → invoice.metadata.userId must be set at checkout time

---

## Vocabulary

- "XP tier" = learner progression: Beginner🌱 → Apprentice📖 → Scholar🎓 → Linguist🗣️ → Maestro✦
- "Rank tier" = multiplayer rank: Bronze → Silver → Gold → Platinum → Diamond → Champion → Unreal
- "Tab" = feature panel in tab-registry.ts (requires dual update — ADR-0011)
- "Server function" = TanStack Start server-side handler (NOT Next.js API route)
- "Webhook" = `src/routes/api.stripe-webhook.ts` — syncs Stripe events to profiles.data

---

## Output Contract

1. List files changed (path:line for key changes)
2. If tab added: confirm both TabKey AND TAB_COMPONENTS updated
3. Run `npx tsc --noEmit` — zero new errors before declaring done
4. State what was deferred
5. Suggest next step — don't take it without being asked


---

## AI Rosetta — mandatory coordination

Before beginning project work on Mac Studio or MacBook Air:

1. Read `AI_HANDOFF.md`.
2. Fetch the current coordination ref and read the task `REMOTE_STATE.md`.
3. Read `ai-rosetta/README.md` and `ai-rosetta/PREFLIGHT.md`.
4. Run the preflight on the Mac currently in use; never assume the other Mac pushed.
5. Read the active task brief and update `ai-rosetta/agents/CLAUDE_STATUS.md`.
6. During independent work, do not read Codex's plan until Claude's plan is marked `independent-complete`; factual remote status may still propagate.
7. Work from a `claude/<task-slug>` branch, never directly from `main`.
8. Open a draft PR at the first reviewable checkpoint.
9. Distinguish application head, documentation head, and preview commit.
10. Record PID, port, checkout, branch, and commit for every local dev server; stop it at handoff unless a named reviewer is using it.
11. Use only Language Threshold project credentials. Never borrow, copy, or recover a secret from another project.
12. Commit, push, fetch again, and verify the remote SHA before ending.
13. Record exact deployment evidence; production changes require Toby's explicit approval.

Claude mobile may inspect GitHub-visible state and help record Toby's decisions. It must not claim either Mac checkout is synchronized without a fresh preflight from that device.
