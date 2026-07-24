# Language Threshold — Infrastructure Map

This document exists because the project has two names, two GitHub remotes, two
domains, and a manage-worker-bee record that's drifted out of sync with all of
it. Read this before touching deploy config, domains, or the ops dashboard.

---

## The short version

**One app. One codebase. One Vercel project. Two names because of a rebrand
that didn't fully propagate.**

- Original name: **LinguaLens** / `language-lens-elite`
- Current name: **Language Threshold**
- Codebase never got a directory rename — it still lives at `language-lens-elite`
  on disk and in the primary GitHub remote name. The app itself, its domain,
  and its Stripe/Resend integrations use the new "Language Threshold" name.

---

## Domains

| Domain | Role | Where it's served from |
|---|---|---|
| `app.languagethreshold.com` | **The actual product.** Every route, every tab. | Vercel project `language-threshold-app` (see below) |
| `languagethreshold.com` (root + `www`) | Redirects to `app.languagethreshold.com` | Separate Cloudflare Worker, see `/Users/drive/redirect-languagethreshold` |

**Important:** `language-lens-elite/wrangler.jsonc` still exists in this repo
and still declares a route for `app.languagethreshold.com/*` on Cloudflare.
That is a **leftover from before the Vercel migration** — this project's own
`CLAUDE.md` states explicitly: "was CF Workers — migrated" to Vercel, and
"use `vercel deploy --prod --yes`, NOT wrangler." Do not deploy this app with
wrangler; the wrangler.jsonc here is dead config, not a second live path.
The only Cloudflare piece actually in production is the tiny redirect worker
for the root domain, which is a separate project entirely.

---

## GitHub

This repo has **two remotes**, both real, both pushed to historically:

```
origin            https://github.com/adobetoby-maker/language-lens-elite.git
languagethreshold https://github.com/adobetoby-maker/languagethreshold.git
```

As of this writing, `origin` is **2 commits ahead** of `languagethreshold`
(flashcards/SM-2 work landed on `origin` but was never pushed to the
`languagethreshold` remote). Treat `origin` as the source of truth. If you
push, push to `origin` at minimum; push to both if you want the
`languagethreshold` mirror to stay current — nothing currently automates that.

Vercel's GitHub integration is wired to whichever remote/repo it was
originally connected to (check the Vercel project's Git settings if this
ever needs re-confirming — not verified as part of this pass).

---

## manage-worker-bee (the ops dashboard) — known drift

`manage-worker-bee` tracks this project in two places, and **both are stale**:

- `lib/monetization.ts` — `siteKey: 'language-lens-elite'`, `siteUrl:
  'https://language-lens-elite.worker-bee.app'`. That URL is the **old**
  Cloudflare Workers subdomain from before the rebrand + Vercel migration.
  The real URL is `https://app.languagethreshold.com`.
- `lib/resendAudiences.ts` — has a *correct*, current-name entry:
  `languagethreshold: 'b59338b6-5cb7-4b5d-80a9-b6d8fac83ab5'`. This one
  already reflects the rebrand; it's the monetization tracker that didn't
  get updated.

The global `~/.claude/CLAUDE.md` project table has the same drift — it lists
"LinguaLens | `/Users/drive/language-lens-elite` | `language-lens-elite.worker-bee.app`."

**None of this was fixed as part of this pass** (scope was documentation,
not a cross-repo cleanup) — flagging it here so the next person who touches
monetization tracking or the global project table knows to use
`app.languagethreshold.com`, not the worker-bee.app subdomain.

---

## Local files

Both this repo and the redirect worker are **symlinks to an external volume**,
not native paths on the internal SSD:

```
/Users/drive/language-lens-elite       -> /Volumes/Drive 2/projects/language-lens-elite
/Users/drive/manage-worker-bee         -> /Volumes/Drive 2/projects/manage-worker-bee
/Users/drive/redirect-languagethreshold -> /Volumes/Drive 2/projects/redirect-languagethreshold
```

No machine-specific (e.g. "M1 vs Mac Studio") config was found in either
repo — no `.env.m1`, no machine-keyed path, nothing in `bun.lock` beyond
incidental substring matches. If there's a second machine involved in this
project's workflow that has its own copy of these files, it isn't represented
in anything committed here — say the word and this section gets a real answer
instead of "not found."

The `~/.atlas/CLAUDE.md` failure-pattern log already flags external-volume
paths as a risk: Claude Code's sandboxed file reads can intermittently fail
(EINTR) against removable/external volumes even while mounted. Worth keeping
in mind if this repo ever becomes flaky to read from inside a session — the
fix pattern used elsewhere is moving hot-path code to an internal-SSD path
(e.g. `~/devtools-local`) and symlinking from there instead.

---

## Where language-learning content actually lives

Relevant to the Italian cognate/grammar work added alongside this README:

| File | Owns |
|---|---|
| `src/data/grammar-patterns.ts` | Formula-style grammar patterns (`tener que`-style: "Devo + infinitive," "Perché...," etc.) per language, consumed by the **Grammar Patterns** tab |
| `src/components/patterns/PatternLab.tsx` | UI for `src/data/grammar-patterns.ts` — browse → detail → AI-generated drill |
| `src/components/grammar/GrammarStudio.tsx` | Separate system — CEFR-leveled lesson content (`src/data/modules.ts` / curriculum files), NOT the same data as Grammar Patterns |
| `src/components/false-friends/FalseFriends.tsx` | AI-generated on the fly (no static data file) — false cognates, the mirror image of the new Cognate Bridge tab |
| `src/data/cognate-patterns.ts` *(new)* | True-cognate suffix/sound-shift rules (EN→IT, ES→IT, FR→IT, PT→IT) |
| `src/components/cognates/CognateBridge.tsx` *(new)* | UI for the above |

**Tab registration is a 3-point update, not the 2-point ADR-0011 documents:**
adding a tab requires `TabKey` in `src/state/app-state.tsx`, the entry in
`TAB_COMPONENTS` in `src/components/tab-registry.ts`, **and** a nav entry in
the `TABS` array in `src/components/AppSidebar.tsx` — miss the third one and
the tab renders fine if navigated to directly but never appears in the sidebar.
