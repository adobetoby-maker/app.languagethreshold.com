# Foreman ledger — sidebar notes / scratchpad block

**Baseline commit:** `f5ef20c` (clean tree, 0 modified files)
**Repo:** isolated clone at `scratchpad/main-test-copy`, tracking `origin/main`
**Mode:** Full (Agent tool + real shell). Codex not probed — not consented this session.
**LEAD seat:** frontier-class (this session).

## Standing constraints for every worker

- `npx tsc --noEmit` must stay at **0 errors**; `npm run lint` 0 errors.
- Local `ANTHROPIC_API_KEY` is INVALID → any AI server fn 401s locally. Verify
  render paths by seeding the component's own localStorage cache, not by calling out.
- Dev server already running on **:3040** (`.env.local` present, gitignored).
- Chrome cannot reproduce the iOS path. `CSS.supports('display','ruby')` is false in
  WebKit. Playwright **webkit** is installed — use it for anything Safari/PWA-shaped.
- Do NOT override native `<ruby>` layout. That was a real bug, fixed in `31de475`.
- Safe-area: use the existing `--lt-safe-top` scaled var, not raw `env()`.

## Tasks

| # | Task | Seat | Write set | Status |
|---|---|---|---|---|
| T1 | Scout existing notes infrastructure + dashboard mount points | FAST (scout) | none (read-only) | **DONE** |
| T2 | Storable notes section in Dashboard | WORKHORSE (sonnet) | `dashboard/NotesCard.tsx` (new), `dashboard/Dashboard.tsx` | **RUNNING** |
| T3 | Sidebar actionable items (last-word toggle, open text field) | WORKHORSE (sonnet) | `AppSidebar.tsx`, `state/speech-state.tsx` | **RUNNING** |
| T4 | Character-writing scratchpad + radical recognition | FRONTIER (design first) | TBD | NOT SCOPED — needs founder decision |

## Attempts (append-only)

- T1 dispatched — scout, read-only. → DONE.
  Findings: notes store is COMPLETE and reusable — `useNotes()` gives add/update/
  remove/forText, persisted to localStorage `lt.annotations.v1`, survives reload.
  No store extension needed for the Dashboard card. Annotation is keyed by `textId`.
  Sidebar mobile mount point: `AppSidebar.tsx` ~line 530, after Language Match,
  before "App settings". `lastWord` is a SINGLE in-memory value in speech-state and
  does NOT persist — a history + persistence is required for the toggle to be useful.
- T2 + T3 dispatched in parallel — write sets are disjoint (dashboard/* vs
  AppSidebar+speech-state), so no worktree isolation needed.

## Notes

T4 is deliberately unscoped: "radical recognition" could mean on-device stroke
matching against the existing `src/data/cjk/radicals.ts`, or a model call. That is a
product decision, not an implementation detail — surfacing to the founder rather than
guessing.
