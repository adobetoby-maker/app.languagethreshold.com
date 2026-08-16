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
| P1 | Make existing canvases Apple Pencil–native | WORKHORSE | `kana/HandwritingCanvas.tsx`, `kana/writing/CharacterCanvas.tsx` | **RUNNING** |
| P2 | Generalise recognition beyond Japanese (Chinese; decide Pashto) | WORKHORSE | `fns/handwriting-recognize.functions.ts` + its callers | PENDING |
| P3 | iPad layout — stop inheriting the desktop `lg` layout | FRONTIER | TBD | PENDING (needs design pass) |
| P4 | Wire trace / convert into the notes surfaces | WORKHORSE | `notes/*`, `dashboard/NotesCard.tsx` | BLOCKED on P1 |

## Why P1 is first

Zero hits for `pointerType`, `pressure`, `getCoalescedEvents` or `touch-action` in the
canvases. So today: no palm rejection (a resting hand draws), no pressure variation, and
strokes coarser than the Pencil actually reports. This is the gap the founder feels first.

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

- P1 dispatched.
