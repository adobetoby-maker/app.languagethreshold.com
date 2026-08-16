# Handoff — app.languagethreshold.com (session ending 2026-08-16)

Durable memory for the next session. Start by reading `.foreman/ledger.md` (active run),
then `.claude/verify/latest.md` (what was verified, and what was NOT).

---

## 1. The root cause behind most of this session

`main` was restored from an older snapshot in **26f278f** to fix 124 tsc errors. That
restore fixed the build but **silently reverted five newer fixes**. Each surfaced later as
a separate "bug" on Toby's phone:

| Reverted fix | Symptom it caused | Re-fixed in |
|---|---|---|
| Tutor panel centring (d8caf33) | panel shoved ~150px up under the Dynamic Island | a450d46 |
| Furigana metrics + `ruby-overhang` | readings drifting out of registration | a450d46 |
| Pane header heights | the two reader header boxes not lining up | 2108937 |
| WordCard centring (ee7590a) | tap-a-word popup off-centre, no safe-area | 04f8ede |
| WordCard `z-10` on close button | the X did nothing; only tap-outside closed it | e8ec8e5 |

**Lesson: a restore is not a fix.** If another restore ever happens, diff the restored
files against the commits that touched them since, don't assume newest-largest is best.

---

## 2. Hard-won facts — do not relearn these

- **iOS Safari fails `@supports (display: ruby)`** even though it renders `<ruby>`
  natively and correctly. So any `@supports not (display: ruby)` block IS the iOS code
  path and never runs in Chrome. Overriding ruby layout there dropped the kanji off the
  sentence baseline. **The fix was deleting the fallback** (31de475).
  WebKit also *ignores* `position:absolute` on `<rt>` and *clamps* `<ruby>` to
  `display:inline` — both were tried and rejected. Don't retry them.
- **Persist effects must skip their first invocation.** They run in the same commit as the
  hydrate effect, while state still holds its default, so they write the default over the
  hydrated value. This bug has now been fixed three times: furigana mode, romaja mode,
  recentWords. Copy the `useRef(true)` skip pattern in `ParallelReader.tsx`.
- **Chrome cannot verify this app's real behaviour.** Playwright **webkit** is installed
  and is the only way to reproduce the PWA path.
- **Local `ANTHROPIC_API_KEY` is invalid** → every AI server fn 401s locally. Verify
  render paths by seeding the component's own localStorage cache instead.
- **The QA screenshot harness captures an unrelated project ("you & I").** It is stale and
  wrong. Never score against it; never fabricate a visual verdict from it.
- **Duplicated constants drift.** Chinese was missing from 3 of 5 hardcoded `LANGUAGES`
  lists, so it could be picked at first run but never switched to. TopNav/AppSidebar now
  import the canonical list from `app-state`.

---

## 3. State of the product

- **Japanese speaking is LIVE.** `VITE_JAPANESE_SPEAKING_REVIEWED=true` set in Vercel
  production and redeployed on 2026-08-16. This released content that had been gated
  pending curriculum review — including a Core Speaking "relationships and intimacy"
  section. Worth a content spot-check.
- Mission catalog restored and verified functionally: Spanish 1846 / Chinese 1846 /
  Japanese 1826 / Italian 1815 / English 1885 across 56–58 modules.
- Chinese reached parity: character core, grammar patterns, curated missions, pinyin.
- Recovery point tag/branch: `known-good-20260815-1546` → `e35953b`.

---

## 4. Existing capability — CHECK BEFORE BUILDING

Two features were nearly rebuilt from scratch before scouting found them already present:

- **Notes**: `useNotes()` in `src/state/notes-state.tsx` has full CRUD, persisted to
  localStorage `lt.annotations.v1`, survives reload.
- **Handwriting**: `src/fns/handwriting-recognize.functions.ts` (Anthropic vision →
  character + reading + meaning), `kana/HandwritingCanvas.tsx`,
  `kana/writing/CharacterCanvas.tsx`, **`kana/writing/TraceMode.tsx`** (draw on top of a
  character), `writing/scoring.ts`, `PenPalMode.tsx`.

**Scout first. This repo is larger than it looks.**

---

## 5. Open work

Active run — see `.foreman/ledger.md`:
- **P1 (running)**: make the canvases Apple Pencil–native (pointerType/pressure/coalesced/
  palm rejection/touch-action/HiDPI). Biggest felt gap on iPad.
- **P2**: recognition is hardcoded Japanese (`handwriting-recognize.functions.ts:28,43,51,57`).
  Chinese hanzi would return as kanji with Japanese readings — confidently wrong.
  **Pashto is a separate problem** (cursive Arabic, position-dependent letterforms); do not
  bolt it onto the CJK recogniser.
- **P3**: iPad inherits the desktop `lg` layout — "native feel" is mostly layout work.
- **P4**: wire trace/convert into the notes surfaces.

Also open:
- **Reader pane vertical drift.** The restored `ParallelReader` predates `af6724f`/`b2bdc4e`
  which rendered one grid row per sentence pair. Two independently scrolling columns still
  accumulate drift. Header alignment is fixed; lock-step pairing is not.
- `MultilingualNoteInput.tsx` exists but has **no consumer** yet.
- Recent-word tap speaks the word rather than reopening the WordCard.
- Pinyin correctness unverified against real model output (local key invalid).

---

## 6. Founder's design intent for handwriting (verbatim intent, 2026-08-16)

Wants **both** modes, recognition never a guess:
- Ink stays ink by default (annotate / work out understanding).
- Convert to a character on demand — hold-to-convert, or a "script writer" toggle.
- Draw **on top of** an existing character to deconstruct it — pure ink, never auto-recognise.
- Target: **iPad + Apple Pencil, installed as a PWA.**
