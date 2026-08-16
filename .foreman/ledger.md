# Foreman ledger — Apple Pencil / iPad PWA block

**Baseline commit:** `f4afc6b`
**Repo:** isolated clone `scratchpad/main-test-copy`, tracks `origin/main`
**Mode:** Full (Agent tool + real shell). Codex not consented.

## THE KEY FINDING — read before writing any code

Most of the handwriting feature **already exists**. Do not rebuild it.

| Capability | Where it already lives |
|---|---|
| Handwriting → character recognition | `src/fns/handwriting-recognize.functions.ts` (Anthropic vision; returns text + reading + meaning) |
| Drawing surfaces | `src/components/kana/HandwritingCanvas.tsx`, `src/components/kana/writing/CharacterCanvas.tsx` |
| **Draw on top of a character** ("work out my understanding") | `src/components/kana/writing/TraceMode.tsx` |
| Stroke scoring | `src/components/kana/writing/scoring.ts` |
| Pen-pal writing mode | `src/components/kana/writing/PenPalMode.tsx` |
| Reachable already | `kana` + `characters` tabs in `tab-registry.ts` |

## Founder's design intent (2026-08-16)

Wants BOTH modes, with recognition as an explicit act, never a guess:
- Default: **ink stays ink** (annotate / work out understanding).
- Convert to a character on demand — hold-to-convert, or a "script writer" toggle.
- **Draw on top of an existing character** to deconstruct it. This mode must never
  auto-recognise; it is pure ink over a rendered glyph.
- Target device: **iPad + Apple Pencil, installed as a PWA.**

## Tasks

| # | Task | Seat | Write set | Status |
|---|---|---|---|---|
| P1 | Make existing canvases Apple Pencil–native | WORKHORSE | `kana/HandwritingCanvas.tsx`, `kana/writing/CharacterCanvas.tsx` | **DONE** (efa7df6) |
| P2 | SEPARATE Chinese recognition prompt (no overlap with Japanese) | WORKHORSE | `fns/handwriting-recognize.functions.ts`, `kana/HandwritingCanvas.tsx` | **DONE** (eaae5a6) |
| P3 | iPad layout — stop inheriting the desktop `lg` layout | FRONTIER | `styles.css`, `TopNav.tsx`, `AppSidebar.tsx`, `tutor/TutorPanel.tsx` | **DONE** (9e36a5e) |
| P4 | Wire trace / convert into the notes surfaces | WORKHORSE | `notes/*`, `dashboard/NotesCard.tsx`, `reader/NotesPanel.tsx` | **DONE** (f7d2aa8) |

## Why P1 is first

Zero hits for `pointerType`, `pressure`, `getCoalescedEvents` or `touch-action` in the
canvases. So today: no palm rejection (a resting hand draws), no pressure variation, and
strokes coarser than the Pencil actually reports. This is the gap the founder feels first.

## P2 — FOUNDER DIRECTIVE (2026-08-16)

"We will need a separate hard coded prompt for Chinese. That way they do not overlap.
Learning is hard enough let alone when you are given the wrong thing."

Two SEPARATE prompt constants and tool schemas — NOT one parameterised prompt. The
duplication is deliberate; do not "clean it up" later. `language` is required with **no
default**, because a default lets a missed call site silently get Japanese treatment —
the exact failure being designed out. A confidently-wrong reading taught to a learner is
worse than a failed lookup.

First P2 attempt was BLOCKED by a full disk (ENOSPC) and made zero changes. Re-dispatched.

## P2 note — recognition is hardcoded Japanese

`handwriting-recognize.functions.ts:28,43,51,57` all say "Japanese". Chinese hanzi would
come back read as kanji with Japanese readings — confidently wrong, which is worse than
failing. **Pashto is a separate problem**: cursive Arabic, letters change shape by
position; do NOT bolt it onto the CJK recogniser. Surface as its own decision.

## Standing constraints (carried forward — all learned the hard way)

- `npx tsc --noEmit` 0 errors; `npm run lint` 0 errors.
- Local `ANTHROPIC_API_KEY` is **invalid** → AI server fns 401 locally. Verify render
  paths by seeding the component's own localStorage cache. Do not chase the 401.
- Chrome cannot reproduce the iOS path. Playwright **webkit** is installed — use it.
- **Never override native `<ruby>` layout.** WebKit fails `@supports (display:ruby)` but
  renders `<ruby>` correctly; overriding it drops the base off the baseline (fixed 31de475).
  WebKit also ignores `position:absolute` on `<rt>` and clamps `<ruby>` to `display:inline`.
- Any persist effect **must skip its first invocation**, or it writes default state over
  hydrated state. Bug fixed three times now (furigana, romaja, recentWords).
- Safe-area: use `--lt-safe-top`, not raw `env()`.
- The QA screenshot harness captures an unrelated project ("you & I"). Do NOT score
  against it and do NOT fabricate a visual verdict from it.

## Attempts (append-only)

- P1 dispatched. → DONE, verified independently (tsc/build re-run by foreman).
  **Caught a bug in the ticket instruction itself:** `getCoalescedEvents?.() ?? [native]`
  is wrong on WebKit — the method EXISTS and returns an EMPTY ARRAY, so `??` never fires
  and the draw loop ran zero times (no line drawn on move). Fixed to test `length`.
  Surfaced only by driving real PointerEvents and reading canvas pixels.
  Verified: pen draws; touch-after-pen ignored; touch-only still draws; pressure changes
  coverage; the 0.5 default is guarded. NOT verified: no physical iPad/Pencil; dpr math
  only ran at dpr=1.
- P2 DONE (eaae5a6), verified by foreman: no interpolation between the two prompt sets,
  `language` is z.enum with no default, UI + zod both refuse unsupported languages.
  UNVERIFIED: live recognition accuracy either language (local API key invalid). First
  real test should be a character in BOTH scripts (車 / 花) — Chinese must return pinyin.
- P3 DONE (9e36a5e). Approach: @custom-variant desktop = (hover:hover)+(pointer:fine)+1024px.
  iPad with Apple Pencil reports hover:none (primary input is touch), so it never matches
  and always gets the mobile layout regardless of viewport width. 4 files changed:
  styles.css (variant def + 2 media query updates), TopNav, AppSidebar (3 sites), TutorPanel.
  tsc: 0 errors. Build: clean. UNVERIFIED: real iPad (Playwright webkit cannot simulate
  touch-primary pointer capability; must test on physical device).
- P4 DONE (f7d2aa8). Draw-to-convert wired into all three note entry surfaces (NotesCard add form,
  NoteRow edit, NoteCard in NotesPanel). MultilingualNoteInput replaces bare <textarea> everywhere.
  onKeyDown passthrough prop added to MultilingualNoteInput (fires after composition guard).
  autoFocus replaces taRef+useEffect in NoteCard. tsc: 0 errors. Build: clean.
  UNVERIFIED: actual draw→recognize flow on physical iPad (local API key invalid; 401 on recognizeHandwriting).
  NEXT: ship P1–P4 diff to origin/main (currently isolated clone only).
- (superseded) P2 (recognition beyond Japanese) is the highest-value remaining ticket, and it
  carries a founder decision on Pashto — do not let a worker bolt Arabic script onto the
  CJK recogniser.
