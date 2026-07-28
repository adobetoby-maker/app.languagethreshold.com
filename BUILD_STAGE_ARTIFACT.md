# DUO-002 Hands Build Artifact

- Mission: `fb5416a6-7000-46b9-bea3-bce25c654c2c`
- Seat: `codex_hands`
- Stage: build
- Direction: Option A — Magic before map
- Status: implemented in the workspace; independent review and runtime verification required

## Workspace record

- Branch supplied by the final build specification: `claude/usability-onboarding`
- Starting commit: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`
- Current HEAD: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`
- Ending commit: none; the bounded build remains as uncommitted workspace changes
- `origin/main`: `8dff4f2 chore: verify auto-deploy after repo rename`
- Preview URL: none
- Production deployment: none
- Integration branch: none

`CODEX_PLAN.md` is marked `independent-complete`. No `CLAUDE_PLAN.md` or counterpart
implementation plan existed in this workspace, and none was read.

## Delivered build

### C1 — Structured Reader → Tutor continuity

- Added thread-bound `TutorSourceContext` carrying the tapped word, full sentence, centered
  passage window, Word Card explanation, and sentence index.
- Reader now derives passage context from a window centered on the tapped sentence instead of a
  fixed first-four-sentence slice.
- Word Card retains the learner-visible prose prefill while supplying structured context.
- Tutor requests retain that source context on follow-up turns and no longer derive the selected
  word from speech state.
- `/api/tutor` accepts the new context fields additively and includes them in its system context.
- Tutor visibly identifies the selected word and sentence above the thread.

### C2–C4 — Mobile correctness and honest system states

- Added one shared bottom-strip budget for bottom navigation, the Tutor control, and Reader
  MiniPlayer; applied safe scroll padding to the main learning containers.
- Removed learner-facing filter diagnostics. Counts are available only in development with
  `?debugFilters`; an active filter uses learner language.
- Grammar now advances through honest staged messages at 0, 4, and 10 seconds. A 20-second timeout
  reaches the existing actionable error and Retry path; no percentage is fabricated.

### C5–C9 — Entry, guidance, progress, and connected toolkit

- Replaced the blocking first-run wizard with one dominant `Start reading` action and a secondary
  `Explore all tools` action.
- First trial requires no account, upload, pasted text, subscription choice, profession, or level
  choice.
- Selected existing `seed-es-travel-train-ticket` as the default: Spanish A1, short, neutral,
  natural, and ten tappable sentences rather than the former C2 literary default.
- Profession and level personalization remain optional and reachable from Complete Toolkit.
  Selection still persists and retains the existing purchased/active-module effect.
- Added reusable, dismissible, action-triggered Reader guidance; it uses local storage and never
  blocks interaction.
- A successful save now says `Saved to My Vocab`, identifies Flashcards as the practice path, and
  offers a direct Flashcards action.
- The progress prompt is absent on cold load, becomes eligible only after a successful meaningful
  save event, hides while Word Card is open, remains dismissible, and occupies one 44px line
  (`5.21%` of an 844px viewport by code dimension).
- Added typed purpose, stage, accent, and gate metadata for all 31 existing `TabKey` values.
- Added a complete outcome-oriented catalog grouped as Understand, Remember, Use, Grow, and
  Specialize. Existing access gates remain intact; unavailable specialty actions route to the
  legitimate Modules path.
- Added a concise learner-purpose line to every registered tab without adding or removing a
  `TabKey`.

### C10–C11 — Visual treatment and demo source

- Preserved the ivory/midnight/gold system and the accepted contrast work while adding restrained
  reading, recall, speaking, and progress accents.
- Added a separate `gold-ink` semantic token so gold can remain luminous as decoration while new
  light-theme gold text remains readable.
- Increased changed primary action and icon-only targets to at least 44×44 CSS pixels and clamped
  Word Card to the mobile viewport.
- Created the real-interaction recording source documents:
  - `marketing/reader-tutor-demo/SCREENPLAY.md`
  - `marketing/reader-tutor-demo/SHOT_LIST.md`
  - `marketing/reader-tutor-demo/CAPTION_COPY.md`
- No raw video was committed.

## Tool inventory and product decisions

`CODEX_PLAN.md` contains the required field-by-field inventory for:

- all 31 registered tabs;
- Word Card;
- Tutor panel;
- onboarding/profession selection;
- progress-saving surface;
- My Vocab saved-word surface.

The primary mobile navigation remains curated. Complete Toolkit is the full map. My Vocab remains
the real shared `state.userVocab` collection surfaced through save continuity and Flashcards; no
fictional standalone route or cross-tool connection was introduced.

## Changed artifacts

New:

- `BUILD_STAGE_ARTIFACT.md`
- `CODEX_PLAN.md`
- `marketing/reader-tutor-demo/SCREENPLAY.md`
- `marketing/reader-tutor-demo/SHOT_LIST.md`
- `marketing/reader-tutor-demo/CAPTION_COPY.md`
- `src/components/onboarding/FirstRunEntry.tsx`
- `src/lib/learning-guidance.ts`

Modified:

- `src/components/SaveProgressBanner.tsx`
- `src/components/TabShell.tsx`
- `src/components/grammar/LevelSidebar.tsx`
- `src/components/guide/AppGuide.tsx`
- `src/components/modules/ModuleMatchPanel.tsx`
- `src/components/modules/ModulesPage.tsx`
- `src/components/onboarding/AppTour.tsx`
- `src/components/onboarding/OnboardingWizard.tsx`
- `src/components/reader/MiniPlayer.tsx`
- `src/components/reader/ParallelReader.tsx`
- `src/components/reader/WordCard.tsx`
- `src/components/tab-registry.ts`
- `src/components/tutor/TutorPanel.tsx`
- `src/routes/api.tutor.ts`
- `src/routes/index.tsx`
- `src/state/library-state.tsx`
- `src/state/tutor-state.tsx`
- `src/styles.css`

Explicitly unchanged:

- `src/lib/ai-gate.ts`
- `src/routeTree.gen.ts`
- `wrangler.jsonc`
- `vercel.json`
- auth, pricing, subscription, Stripe, and database code

## Technical checks

| Check                                | Exact result                                                                                                                                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git diff --check`                   | Exit `0`                                                                                                                                                                                                              |
| ESLint on all changed TypeScript/TSX | Exit `0`; `0` errors, `5` warnings. Warnings are existing Fast Refresh/export and one unused-disable warning in the two modified state provider files.                                                                |
| `npx tsc --noEmit`                   | Exit `2`; errors only in `dictionary/verbProfiles.ts`, `SubscriptionGate.tsx`, and `api.stripe-webhook.ts`. All three files are byte-identical to baseline (`git diff --quiet ...` exit `0`).                         |
| `npm run lint`                       | Exit `1`; `76,003` problems: `75,947` errors and `56` warnings across broad pre-existing formatting/generated-dictionary debt. Changed-file lint has no errors.                                                       |
| `npm run build`                      | Exit `0`; Vite client and SSR builds completed, server bundled, and Vercel Build Output API v3 artifact was created. Warnings: existing chunks over 500 kB, unused TanStack imports, and side-effect import warnings. |
| Built diagnostic scan                | `0` matches for `Filter check`, `filter inactive`, or `No active module` in `dist/client` and `.vercel/output`.                                                                                                       |
| `npm run rosetta:check`              | Script is absent; command exits `1`. The final spec records that it must not be added without approval.                                                                                                               |
| Test script                          | No `test` script exists in `package.json`; no automated test suite was implied or reported.                                                                                                                           |

Dependencies were installed from the existing lockfile with `npm ci --ignore-scripts
--prefer-offline`; neither `package.json` nor the lockfile changed.

## Accessibility evidence

Palette calculations use OKLCH → linear sRGB relative luminance:

| Changed text/background pair                |  Contrast |
| ------------------------------------------- | --------: |
| Foreground / light background               | `15.41:1` |
| Muted foreground / light background         |  `6.61:1` |
| Gold ink / light background                 |  `5.96:1` |
| Gold ink / 10% gold-tinted light background |  `5.65:1` |
| Sky 700 / light background                  |  `5.21:1` |
| Violet 600 / light background               |  `5.23:1` |
| Emerald 700 / light background              |  `4.78:1` |
| Foreground / dark background                | `17.75:1` |
| Muted foreground / dark background          |  `9.39:1` |
| Gold / dark background                      |  `8.05:1` |
| Gold / dark card                            |  `7.41:1` |
| Sky 300 / dark card                         | `10.39:1` |
| Violet 300 / dark card                      |  `9.31:1` |
| Emerald 300 / dark card                     | `11.41:1` |
| Midnight / filled gold action               |  `7.41:1` |

Sky 600 used by the new entry loop is confined to an `aria-hidden` decorative icon; learner
meaning is also stated in adjacent text.

These calculations are code-level evidence, not rendered visual proof.

## Blocked or unverified evidence

- A1 deployment truth remains unresolved. The repository contains both Cloudflare and Vercel
  paths; per the final specification, no preview deploy was attempted and neither config changed.
- Local visual QA was attempted, but the sandbox rejected listeners on both `127.0.0.1:8080` and
  `127.0.0.1:3000` with `EPERM`. No browser tab could be opened.
- Read-only production inspection was also unavailable under the environment's network/tool
  restrictions.
- Therefore no preview URL, screenshots, real-coordinate-tap transcript, request-payload capture,
  keyboard-open capture, scroll-to-bottom capture, timing run, or recording is claimed.
- T1–T11 and T13–T20 require runtime/visual review. T12 has build-artifact scan evidence only.
- T2b newcomer comprehension remains `UNVERIFIED`; recruiting six participants requires founder
  authorization and agent timing cannot substitute for comprehension.
- No vertical or landscape recording was produced. C11 source documents are complete, but
  acceptance criterion 19 and milestone M6 remain blocked.

## Risks and review focus

No runtime regression is confirmed because runtime inspection was unavailable. The independent
reviewer should concentrate on:

1. Capture first-turn and second-turn `/api/tutor` payloads after tapping a word in sentence 5+;
   verify word, full sentence, centered passage, language, level, Word Card explanation, thread,
   and optional module context.
2. Exercise optional profession selection, reload, and confirm both specialty routing and the
   module block in Tutor.
3. Verify successful save → My Vocab → Flashcards continuity without re-entry.
4. Measure the entry CTA above the fold and three cold-run times at 390×844 and 430×932.
5. Sweep every primary surface to its true bottom with nav, Tutor, MiniPlayer, and soft keyboard
   present.
6. Verify progress-prompt timing, Word Card suppression, 44px footprint, dismissal, tab-change,
   and reload persistence.
7. Force Grammar timeout/error and Retry, then inspect Flashcards, Speak, Games, Dashboard, Word
   Card, catalog, browser-back behavior, and both themes with real taps.
8. Review all 31 catalog entries against their legitimate access gates and learner-purpose lines.
9. Reconcile the visual result against baseline `919c74e` before accepting the brighter pass.

## Authority and external-state record

This seat made reversible workspace changes only. It did not push, merge, deploy, create an
integration branch, mutate production data, change credentials or permissions, publish an
advertisement, recruit participants, or write to any external system. GitHub main and Production
were not changed by this seat. Production's current rendered state was not independently observed.

This artifact does not mark the result verified or approved. The next authorized action is
independent runtime/visual review after Toby or DUO-001 resolves which platform serves previews.
