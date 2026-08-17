# Verification — Reader pinyin toggle for Chinese
**Date:** 2026-08-16 · worktree `lt-worktrees/pinyin-games`
**Files:** `src/components/reader/ParallelReader.tsx`, `src/components/reader/PinyinText.tsx`

| Spec item | Method | Observed | Result |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | no output, exit 0 | PASS |
| Lint | `npm run lint` | 0 errors (1 pre-existing react-refresh warning on app-state) | PASS |
| Toggle hidden on a non-Chinese passage | Playwright driving the live app on :3040, 1440×900 | Reader opened a Spanish passage: no Pinyin control, zero `<ruby>` elements | PASS |
| Language gating | inspection | `pinyinMode={selected.language === "Chinese" ? pinyinMode : "off"}`, matching the Japanese/Korean pattern | PASS |
| Language value is `"Chinese"` | Language union + `LanguageFirstStep.tsx:24` | union has `"Chinese"`; the card's label is "Chinese (Mandarin)" but its `id` is `"Chinese"` | PASS |
| Pinyin rendering above hanzi | — | NOT VERIFIED — see below | UNVERIFIED |
| Viewport coverage | WAIVED: the target surface (a Chinese passage showing pinyin) cannot be produced on this machine at any viewport — see below. Four viewports of a Spanish passage would prove nothing about pinyin. No visual claim about pinyin is made. | PASS |
| Outside input | foreman-worker (sonnet) built most of this and caught a real defect in my ticket: I specified `"Chinese (Simplified)"`, which exists only in the NativeLanguage union. Followed literally the toggle would have compiled, linted, passed review, and never appeared. It used `"Chinese"`. | PASS |

## Bug found and fixed during verification

`usePinyinSegments` early-returns when `enabled` is false, but `enabled` was missing from the
effect's dependency array. Toggling pinyin off then on flips `enabled` to true without
re-running the effect — no fetch, no readings, permanently bare text. Flipping the switch on
would have appeared to do nothing: the feature's primary interaction, silently dead.
Surfaced by the lint warning, fixed by adding `enabled` to the deps with a comment saying
why it must stay.

## NOT VERIFIED

Pinyin actually rendering. Reader library passages are LLM-generated and
`pinyin.functions.ts` calls Anthropic; there is no `ANTHROPIC_API_KEY` on this machine, so
every Chinese text in the library sits at "CHINESE · GENERATING…" with a disabled READ
button. Same root cause as the P2/P4 handwriting gaps noted below. Production has a valid
key — first real test is opening a Chinese passage and confirming pinyin sits above the
hanzi and the toggle survives a reload.

## Separate product bug found (not fixed — founder's call)

Selecting **Chinese (Mandarin)** at first run and pressing "Start reading" opens a **Spanish**
passage: *"Viajes: Comprar un Billete de Tren" — "Hola. Un billete a Madrid, por favor."*
Pane headers read ENGLISH | SPANISH while the top bar reads CHINESE. A new Chinese learner's
first screen is Spanish.

---

# Verification — P4: notes surfaces draw mode (f7d2aa8)
**Date:** 2026-08-16 · ledger: `.foreman/ledger.md`
**Files:** `src/components/notes/MultilingualNoteInput.tsx`,
`src/components/dashboard/NotesCard.tsx`,
`src/components/reader/NotesPanel.tsx`

| Spec item | Observed | Result |
|---|---|---|
| `MultilingualNoteInput` has `onKeyDown` prop | Prop in interface, destructured, forwarded after composition guard at line 154 | PASS |
| `onKeyDown` never fires mid-IME | Guard `if (composing.current \|\| e.nativeEvent.isComposing) return` is first check in internal handler | PASS |
| `NotesCard` add form uses `MultilingualNoteInput` | Import present, rendered when `adding` is true with `language={state.selectedLanguage}` | PASS |
| `NotesCard` add form has Draw toggle | `PenLine` icon button toggles `drawMode`; active/inactive class swap | PASS |
| `HandwritingCanvas` mounts conditionally | `{drawMode && <HandwritingCanvas onRecognized={text => setDraft(prev => prev + text)} />}` | PASS |
| `NoteRow` (NotesCard inline edit) same pattern | `useApp()`, `drawMode` state, `MultilingualNoteInput`, draw toggle, canvas — all present | PASS |
| `NoteCard` (NotesPanel drawer) same pattern | `useApp()`, `drawMode`, `MultilingualNoteInput autoFocus`, draw toggle, canvas — all present | PASS |
| `drawMode` resets on cancel | `cancel()` calls `setDrawMode(false)` in all three components | PASS |
| `drawMode` resets on commit | `commit()` calls `setDrawMode(false)` in all three components | PASS |
| Escape cancels editing | `onKeyDown` prop checks `e.key === "Escape"` → `cancel()` in all three entry points | PASS |
| `taRef` / focus `useEffect` removed from `NoteCard` | `useRef` and `useEffect` imports gone; `autoFocus` prop replaces them | PASS |
| tsc 0 errors | `npx tsc --noEmit` → empty output | PASS |
| Build clean | `npm run build` → `✓ Vercel Build Output API v3 artifact created` | PASS |

## NOT VERIFIED
`recognizeHandwriting` server fn 401s locally (local API key invalid). Draw canvas shows the Recognize button for Japanese/Chinese but the round-trip is unconfirmable without a physical device and valid key. First real test: draw 花 with Japanese selected (must return reading), then draw 花 with Chinese selected (must return pinyin — not kun'yomi).

---

# Verification — P3: iPad layout (9e36a5e, pushed)
**Date:** 2026-08-16 · ledger: `.foreman/ledger.md`
**Files:** `src/styles.css`, `src/components/TopNav.tsx`,
`src/components/AppSidebar.tsx`, `src/components/tutor/TutorPanel.tsx`

## What this does

Adds `@custom-variant desktop` = `(hover: hover) and (pointer: fine) and (min-width: 1024px)`.
iPad with Apple Pencil reports `hover: none` (primary input is touch), so it never matches
this variant and always gets the mobile layout regardless of viewport width. All 6 sites
in the layout shell that previously used bare `lg:` for desktop/mobile switching now use
`desktop:`, making them iPad-safe.

CSS variables also gated on the same query: `--lt-nav-height` (6.5rem stays on iPad to
account for the bottom nav that is still present), `.lt-safe-top-main` safe-area offset
(kept on iPad because TopNav is hidden there).

| Spec item | Observed | Result |
|---|---|---|
| @custom-variant desktop defined in styles.css | grep confirms `@custom-variant desktop (@media (hover: hover) and (pointer: fine)...)` | PASS |
| --lt-nav-height gated on hover media | grep confirms new media query, not bare min-width | PASS |
| .lt-safe-top-main gated on hover media | grep confirms new media query, not bare min-width | PASS |
| TopNav hidden desktop:block | `lg:block` → `desktop:block` confirmed in file | PASS |
| AppSidebar desktop:flex (icon sidebar) | `lg:flex` → `desktop:flex` confirmed in file | PASS |
| AppSidebar 3× desktop:hidden (strip, More btn, sheet) | all 3 sites confirmed in file | PASS |
| TutorPanel desktop:right-6 desktop:inline-flex | confirmed in file | PASS |
| tsc --noEmit | 0 errors | PASS |
| npm run build | clean, Vercel Build Output API v3 artifact created | PASS |
| Real iPad verification | NOT verified — Playwright webkit cannot simulate touch-primary pointer; must test on physical device | UNVERIFIED |

---

# Verification — separate Chinese recognition prompt, P2 (eaae5a6, pushed)
**Date:** 2026-08-16 · ledger: `.foreman/ledger.md`
**Files:** `src/fns/handwriting-recognize.functions.ts`,
`src/components/kana/HandwritingCanvas.tsx`

## Founder directive this implements

"We will need a separate hard coded prompt for Chinese. That way they do not overlap.
Learning is hard enough let alone when you are given the wrong thing."

The recogniser was Japanese-only in its system prompt, user text, tool description AND
field description — Chinese hanzi came back read as kanji with Japanese readings.
Confidently wrong, which for a learner is worse than a failed lookup.

| Spec item | Method — **re-checked by me, not taken from the report** | Observed | Result |
|---|---|---|---|
| Write set respected | `git status -- src/` | only the two intended files | PASS |
| Prompts genuinely separate | `grep '\${.*language'` | **no interpolation** — the two constant sets share nothing | PASS |
| Both sets present | grep | 6 references across JAPANESE_*/CHINESE_* constants | PASS |
| `language` has NO default | grep for default on the field | none found | PASS |
| Enum rejects others | worker's zod probe (script deleted after) | Japanese/Chinese accept; Pashto/English/undefined reject | PASS (worker-run) |
| Chinese prompt is Mandarin-specific | grep | 11 hits for pinyin / Mandarin / simplified | PASS |
| tsc / build | run by me | 0 errors; Vercel v3 artifact created | PASS |
| App still renders | `~/screenshot.js 3040`, PNG opened | first-run gate correct, ten languages incl. Chinese (Mandarin) 中文 | PASS |

## Why the design is shaped this way

- **Duplication is deliberate.** Two independent prompt/tool sets selected by a ternary, so
  either language can be tuned without touching the other. Flagged in the commit so a
  future "DRY it up" refactor does not reintroduce the overlap.
- **No default on `language`** is the real protection: a missed call site fails loudly
  server-side instead of silently getting Japanese treatment.
- **Two layers of defence** — the UI refuses to call the recogniser for an unsupported
  language ("isn't available for X yet"), and the zod enum rejects it anyway.
- **Pashto excluded on purpose.** Cursive Arabic with position-dependent letterforms is a
  different problem; bolting it onto a CJK recogniser is how you ship wrong answers.

## NOT VERIFIED

**Live recognition accuracy, for either language.** The local `ANTHROPIC_API_KEY` is
invalid, so the function 401s before a model responds. Routing is proven; output quality
is not. First real test on a working key should be a character that exists in BOTH scripts
(e.g. 車 or 花) — Chinese must return pinyin, not a kun'yomi reading.

No visual check of the new unsupported-language fallback state; the QA harness still
captures an unrelated project.

## Ledger state

P1 done (`efa7df6`), P2 done (`eaae5a6`). **P3** (iPad stops inheriting the desktop `lg`
layout) and **P4** (wire trace/convert into notes) pending. Reader pane vertical drift and
the unconsumed `MultilingualNoteInput` still open.

## Environment warning

The Data volume hit **100% (901Gi/926Gi, ~900Mi free)** during this session and blocked
every write — Bash, Write and Edit all failed ENOSPC, killing one worker mid-ticket. All
screenshots were cleared (~55MB) but that is a reprieve, not a fix. **Free real space
before starting P3**; a failed `npm install` on a full disk corrupts `node_modules`.

---

# Verification — Apple Pencil–native canvases, P1 (efa7df6, pushed)
**Date:** 2026-08-16 · **Baseline:** `7cfd6e6` · ledger: `.foreman/ledger.md`
**Files:** `src/components/kana/HandwritingCanvas.tsx`,
`src/components/kana/writing/CharacterCanvas.tsx`

## A bug in MY OWN ticket instruction, caught by real testing

The ticket told the worker to use `event.getCoalescedEvents?.() ?? [native]`. That is the
common pattern and it **reads** correctly. On WebKit it is wrong: the method **exists** and
returns an **empty array** for non-hardware-coalesced pointermove events, so `??` never
fires, the draw loop iterated zero times, and **no line was drawn on move at all**.

Code review would have passed this. It surfaced only because the worker drove real
PointerEvents and read back canvas pixels. Fixed to fall back on `length`, not nullishness.
**Lesson for the next session: on this project, "the code looks right" is not evidence.**

| Spec item | Method | Observed | Result |
|---|---|---|---|
| Pen draws | Playwright webkit, real PointerEvents + `getImageData()` | 0 → 712/1628 non-blank px | PASS |
| Palm rejection | touch stroke dispatched after a pen stroke | pixel count **unchanged** — touch ignored | PASS |
| Finger fallback preserved | touch stroke on a canvas that never saw a pen | does paint | PASS |
| Pressure drives width | two same-length strokes, different pressure | 732 px vs 1492 px coverage | PASS |
| Constant-0.5 guard | stroke at pressure exactly 0.5 | normal ~736 px stroke, not collapsed | PASS |
| Coalesced fix present | grep after the fact, by me | `coalesced && coalesced.length > 0 ? coalesced : [native]` in BOTH files | PASS |
| Write set respected | `git status` | only the two canvases (plus unrelated `ruvector.db` from the memory write, not committed) | PASS |
| tsc / lint / build | re-run by me, not trusted from the report | 0 errors; build → Vercel v3 artifact | PASS |
| Downstream consumers safe | code | CharacterCanvas normalises back to 300×300 for `scoring.ts` / `getCanvas()`, so scoring + TraceMode unaffected | PASS |

## NOT VERIFIED — stated plainly

- **No physical iPad or Apple Pencil.** Everything above is simulated PointerEvents in
  headless WebKit. Real pen feel, palm rejection against an actual resting hand, and
  pressure curve are unconfirmed.
- **devicePixelRatio math ran only at dpr=1.** The backing store came out 300×300, matching
  `CANVAS_SIZE`, so the `×dpr` retina path is code-verified but never exercised.
- No UI screenshot — the QA harness still captures an unrelated project ("you & I").

## Still open (see `.foreman/ledger.md`)

- **P2** — recognition hardcoded Japanese (`handwriting-recognize.functions.ts:28,43,51,57`).
  Chinese hanzi would return as kanji with Japanese readings: confidently wrong, worse than
  failing. **Pashto is a separate problem** (cursive Arabic, position-dependent forms) —
  do not bolt it onto the CJK recogniser.
- **P3** — iPad inherits the desktop `lg` layout; "native feel" is mostly layout work.
- **P4** — wire trace/convert into the notes surfaces.
- Reader pane vertical drift; `MultilingualNoteInput` still has no consumer.

---

# Verification — notes block via foreman run (b26c5c0, pushed)
**Date:** 2026-08-16
**Baseline:** `f5ef20c` · **Mode:** Full (Agent + real shell) · ledger at `.foreman/ledger.md`

## What ran

A read-only scout first, then two workers in parallel with **disjoint write sets**
(dashboard/* vs AppSidebar+speech-state), so no worktree isolation was needed.

The scout paid for itself: the notes store already exposes full CRUD (`useNotes()` →
`add`/`update`/`remove`/`forText`) persisted to `lt.annotations.v1` and surviving reload.
So **no second store was built** — the Dashboard card sits on what exists.

| Item | Method | Observed | Result |
|---|---|---|---|
| Workers' claims independently re-checked | ran `tsc`/`build` myself, did not trust reports | `npx tsc --noEmit` → 0 errors; `npm run build` → Vercel v3 artifact created | PASS |
| Write sets respected | `git status` | only `AppSidebar.tsx`, `Dashboard.tsx`, `speech-state.tsx` modified + 2 new files | PASS |
| Hydrate/persist race avoided | worker reports + pattern check | both new persisted values (`lt.speech.recentWords.v1`, `lt.sidebar.recentWordsOpen.v1`) use the skip-first-write ref from ParallelReader | PASS |
| `lastWord` not broken for Tutor | code | `lastWord`/`setLastWord` unchanged; `recentWords` added alongside | PASS |
| App still renders | `~/screenshot.js 3040`, PNG opened | first-run gate renders correctly — ten languages incl. Chinese (Mandarin) 中文 | PASS |

## MultilingualNoteInput — the design decisions, and why

Written by me, not delegated. Three things break a naive textarea for these scripts:
1. **IME composition** (ja/zh/ko) — publishing every `input` event fights the IME and can
   commit literal "nihon". Text is published only on composition commit, and Enter during
   composition is never treated as submit.
2. **Pashto is RTL** — `dir` derives from the language; saved notes render in their own
   *detected* script so a Pashto note is not reversed inside an LTR list.
3. **Fonts** — the app stack has no CJK or Arabic coverage, so those scripts were falling
   back per-glyph. Explicit stacks added for each.

## NOT VERIFIED — stated plainly

- **No UI screenshot of NotesCard or the new sidebar items.** The QA harness continues to
  capture an unrelated project ("you & I"), and both workers independently reported the
  same thing and correctly refused to fabricate a visual score against it. So these
  surfaces are compile-verified and build-verified, **not** eyeballed.
- **Recent-word tap speaks the word rather than reopening the WordCard** — reopening needs
  selection state owned by `ParallelReader`, outside the ticket's write set. Deliberate.
- **MultilingualNoteInput is not yet mounted anywhere.** It is a component with no
  consumer until the Dashboard/sidebar fields adopt it.

## Open / not scoped

- **iPad + Apple Pencil** (new direction). Pencil is reachable via Pointer Events
  (`pointerType === "pen"`, pressure/tilt, `getCoalescedEvents`), and iPadOS installs PWAs.
  But a Pencil scratchpad stores *strokes*, while the notes store holds *strings* — so it
  either needs its own storage or a recognition step. Product decision, not started.
- iPad currently hits the `lg` breakpoint and so gets the desktop layout — "native feel"
  there is layout work, not only input work.
- **Pane vertical drift** still open from earlier.

---

# Verification — furigana baseline, language pickers, WordCard X (31de475, e8ec8e5)
**Date:** 2026-08-16
**Files:** `src/styles.css`, `src/components/reader/WordCard.tsx`,
`src/components/TopNav.tsx`, `src/components/AppSidebar.tsx`,
`src/components/onboarding/OnboardingWizard.tsx`

**Playwright WebKit was installed for this round.** Chrome cannot reproduce the Safari
path, and it turned out to be the whole story — every finding below came from WebKit.

## 1. Furigana dropped the kanji out of the sentence

| Spec item | Method | Observed | Result |
|---|---|---|---|
| Why it only showed on the PWA | WebKit `CSS.supports('display','ruby')` | **false** — so the `@supports not (display: ruby)` fallback is the code path that runs on iOS, and never runs in Chrome | ROOT CAUSE |
| The defect | WebKit measurement, before | base bottom 617 vs neighbour 655 — **38px out of line**; reading overlapping the base | CONFIRMED |
| Attempt 1 — `position:absolute` on `<rt>` | WebKit | `rtPosition` stayed `static`; WebKit ignores positioning on the ruby-internal `<rt>` | REJECTED |
| Attempt 2 — `display:inline-block` on `<ruby>` | WebKit | computed display clamped back to `inline` | REJECTED |
| Actual fix — delete the fallback | WebKit | `rubyDisplay: "ruby"` (native), base bottom **623 == neighbour 623 (Δ0px)**, reading above base | PASS |

The fallback was solving a problem that does not exist: WebKit renders `<ruby>` natively and
correctly. Overriding it was the bug. WordCard carried the same flex-column override inline,
unconditionally on every browser — which is why the tapped-word card had the identical
defect. Its ruby layout overrides are gone; cosmetics (size/weight/colour) remain.

## 2. Chinese missing from the in-app language switcher

Five hardcoded `LANGUAGES` lists existed. `app-state` (canonical) and the first-run gate had
Chinese; **TopNav, AppSidebar, OnboardingWizard did not** — so Chinese could be chosen on
first run and never switched to afterwards. TopNav and AppSidebar now import the canonical
list rather than keeping a copy; OnboardingWizard (different shape) gets a Chinese entry.
Verified by code + tsc; **not** re-verified in the running switcher — an earlier probe
returned `[]` because the selector missed the menu, which is a harness miss, not evidence.

## 3. WordCard X did not close the card

| Spec item | Method | Observed | Result |
|---|---|---|---|
| Cause | code | no z-index — the card body rendered over the button, so taps hit content; only tap-outside worked | CONFIRMED |
| Fix verified | WebKit `elementFromPoint` at the button centre | resolves to the button (was the card body); 44px target | PASS |
| Closes | WebKit click | card present → absent | PASS |
| Findable | — | 12px muted-grey glyph → 20px gold X, stroke 2.5, solid bg, gold border | PASS |

## 4. Mobile sidebar sheet — top safe-area inset added

`[padding-top:calc(0.75rem+env(safe-area-inset-top))]`. Code-level only; the inset is 0 off
device so it cannot be exercised here.

## NOT DONE — the rest of the sidebar/notes request

Explicitly outstanding, and not started rather than half-built:
1. Sidebar has no actionable items
2. Scratchpad for character writing
3. Character / radical recognition
4. Last-words-selected toggle
5. Open text field
6. Storable notes section in the dashboard

These are features (handwriting capture, a recognition path, a persistence layer), not
fixes. `notes-state` and `NotesPanel` already exist and should be examined for reuse before
anything new is written.

## Still open from earlier

**Pane vertical drift** — restored `ParallelReader` predates `af6724f`/`b2bdc4e` (one grid
row per sentence pair). Two independently scrolling columns still accumulate drift.

---

# Verification — WordCard centring (04f8ede) + Chinese pinyin (5b4920c), pushed
**Date:** 2026-08-16
**Files:** `src/components/reader/WordCard.tsx`, `src/components/reader/PinyinText.tsx` (new),
`src/fns/pinyin.functions.ts` (new), `src/components/speak/LongPressWordText.tsx`,
`src/components/speak/SpeakingMissionsPreview.tsx`

## 1. The pop-up screen — WordCard — was the "off center"

Not the pane drift. The word popup positioned itself with JS-computed `left`/`top`
anchored beside the tapped word and had no safe-area handling. Another restore
regression: `ee7590a` ("center and fit modal to viewport") was undone by `26f278f`.

Now centred on the **safe area**, not the raw viewport: safe centre is
`50% + (topInset - bottomInset) / 2`, so on a notched phone the card sits optically
between the island and the home indicator. Width clamps to `min(100vw - 24px, CARD_W)`;
`max-height` subtracts both insets with `overflow-y`, so a long definition scrolls inside
rather than overflowing upward under the island.

| Spec item | Method | Observed | Result |
|---|---|---|---|
| Centred | opened a word card in the running Reader, measured rects | card centre **(215, 466)** == viewport centre **(215, 466)** | PASS |
| Fits on screen | same run | top 331 / bottom 601 in a 932px viewport | PASS |
| Renders correctly | PNG opened | card shows おはようございます, "IN THIS SENTENCE" context, +2 XP badge; visually centred | PASS |
| tsc / lint | — | 0 errors, lint clean | PASS |

## 2. Pinyin wired for Chinese Core Speaking

Chinese Core Speaking is **not** behind a review flag, so bare hanzi with no readings was
live for real users. Followed the existing per-language convention (FuriganaText /
HangulText) instead of inventing a new shape.

| Spec item | Method | Observed | Result |
|---|---|---|---|
| Pinyin renders | Chinese → Speak → Core Speaking → "to go", cache seeded | ruby=1, base **去**, reading **qù**, **offset 0.0px** | PASS |
| Visual | PNG opened | gold **qù** centred directly above 去, tucked into the leading — same treatment as furigana | PASS |
| Other languages untouched | code | `reading` prop defaults null; only Japanese→furigana, Chinese→pinyin | PASS |
| tsc / lint / build | — | 0 errors; 1 react-refresh warning (hook exported beside component, matches FuriganaText); build succeeds | PASS |

Tone correctness was designed for explicitly: one segment per hanzi, diacritics never tone
numbers, and in-context disambiguation of polyphonic characters (行 xíng/háng incl. 银行
yínháng, 了 le/liǎo, 长 cháng/zhǎng, 还 hái/huán, 得 de/děi/dé, 重 zhòng/chóng, 觉 jué/jiào),
neutral-tone particles, and citation tones for 不/一.

## Not verified — stated, not glossed

1. **Safe-area centring on real hardware.** Chrome reports 0 insets, so locally the maths
   reduces to plain centring (verified exact). The inset terms only engage on a notched
   device — needs a look in the PWA.
2. **Pinyin accuracy of actual model output.** The local `ANTHROPIC_API_KEY` is invalid, so
   rendering was verified by seeding the component's own cache. The readings the model
   really returns — especially the polyphonic cases above — have not been checked against
   production.

## Still open

**Pane vertical drift** — the restored `ParallelReader` predates `af6724f`/`b2bdc4e`, which
rendered one grid row per sentence pair. Two independently scrolling columns means unequal
sentence heights accumulate drift. Header alignment is fixed; lock-step pairing is not.

---

# Verification — reader pane headers + furigana preference reset (2108937, pushed)
**Date:** 2026-08-16
**File:** `src/components/reader/ParallelReader.tsx`

Both defects came from a device screenshot ("off center", "no furigana") and both were
**reproduced and measured in the running app**, not inferred from code.

## 1. The two pane header boxes did not line up

Both headers carry identical padding classes, but the target header contains an `h-7`
(28px) audio button while the native header is text-only, so padding-driven heights
diverged and the boxes ended at different y positions — exactly what was circled.

| Spec item | Method | Observed | Result |
|---|---|---|---|
| Cause | code read | same classes, different content height (`h-7` button vs text) | CONFIRMED |
| Fix | pinned both headers to `h-12`, dropped `py-3` | height no longer depends on content | PASS |
| After | measured both header rects in the running Reader | native **top 426 / height 48 / bottom 474**; target **top 426 / height 48 / bottom 474** — identical | PASS |

## 2. Furigana preference silently reset on every reload

The persist effect (deps `[furiganaMode]`) runs on mount in the same commit as the hydrate
effect, when state still holds its default `"above"` rather than the value just read from
localStorage — so it wrote `"above"` straight over a saved `"off"`.

| Spec item | Method | Observed | Result |
|---|---|---|---|
| Reproduced | tap "Off", then reload | tap → `stored:"off"`, `ruby:0` ✓; **reload → toggle Above, `stored:"above"`, `ruby:1`** ✗ | BUG CONFIRMED |
| First fix attempt was wrong | re-tested rather than assumed | a single `prefsHydrated` ref set inside the hydrate effect still let persist run with stale state — preference still lost | CAUGHT, not shipped |
| Working fix | each persist effect skips its first invocation (one ref per preference) | — | PASS |
| Verified — saved off survives | tap Off → reload | toggle `Off=true`, `stored:"off"`, `ruby:0` | PASS |
| Verified — seeded off hydrates | pre-seed `"off"` before load | toggle `Off=true`, `stored:"off"`, `ruby:0` (was `"above"`/`ruby:1` before the fix) | PASS |
| Same bug in sibling prefs | code | furigana **script** and Korean **romaja** persist effects had the identical race; both guarded | PASS |
| tsc / lint / build | `npx tsc --noEmit`, `npm run lint`, `npm run build` | 0 errors, clean, Vercel v3 artifact created | PASS |
| App renders | `~/screenshot.js 3040`, PNG opened | first-run gate renders correctly — wordmark, "What are you learning?", ten language cards incl. **Chinese (Mandarin) 中文**, Character Studio footnote | PASS |

**Note on user impact:** this explains the reported "no furigana" — the toggle was not being
left off by the user, the preference was being destroyed on every load.

## Not verified / still open

1. **Vertical drift between the panes** (the other half of "off center") is NOT fixed. The
   restored `ParallelReader` predates `af6724f`/`b2bdc4e`, which rendered **one grid row per
   sentence pair**; the current file renders two independently scrolling columns, so
   sentences of differing height drift apart. Header alignment is fixed; lock-step pairing
   is a larger refactor and was not attempted.
2. **Pinyin** — `src/fns/pinyin.functions.ts` written (one segment per hanzi, tone
   diacritics, polyphonic handling for 行/了/长/还/得/重/觉, neutral-tone particles) but
   **uncommitted**; the `PinyinText` component and wiring are not done.
3. **Japanese speaking still gated.** The clone is now linked to the Vercel project, but
   `VITE_JAPANESE_SPEAKING_REVIEWED` was not set and no redeploy was run — it is a
   build-time inlined var, so it needs both.

---

# Verification — furigana in Japanese Core Speaking (ff015e7, pushed)
**Date:** 2026-08-15
**Files:** `src/components/reader/FuriganaText.tsx`,
`src/components/speak/LongPressWordText.tsx`,
`src/components/speak/SpeakingMissionsPreview.tsx`

Core Speaking rendered bare kanji in the conversation transcript and the "words you may
use" reference, while the Reader, Flashcards and WordCard all show readings for the same
words. Added furigana to both, reusing the existing pipeline rather than duplicating it.

| Spec item | Method | Observed | Result |
|---|---|---|---|
| Reference chip renders furigana | Playwright, 430×932 @3x, Core Speaking → "Verb 5: to go" | chip shows 行く with **い centred above 行**; measured **offset 0.0px**, `font-weight: 500` | PASS |
| Kana-only vocabulary is left alone | same run, "Verb 1: to be — identity" | `である・です` renders with **no ruby** — correct, there is no kanji | PASS |
| Mission engine still intact | same run | catalog reports **1826 missions across 56 Japanese modules**, matching the `e35953b` smoke test exactly | PASS |
| One request path, not two | code | `useFuriganaSegments` extracted from FuriganaText; both FuriganaText and the new transcript renderer consume it, sharing cache `lt.furigana.v3` | PASS |
| Long-press survives | code | ruby wraps the same `<LongPressWord>`; plain tokenized fallback while readings are in flight | PASS |
| Other languages untouched | code | `furigana` prop defaults false; `showFurigana` is true only when `missionLanguage === "Japanese"` | PASS |
| tsc / lint / build | `npx tsc --noEmit`, `npm run lint`, `npm run build` | 0 errors; 0 lint errors (1 react-refresh warning for exporting a hook beside a component — same pattern already in library-state.tsx / speech-state.tsx); Vercel v3 artifact created | PASS |

## Dormant in production — stated plainly

Japanese Core Speaking is gated behind `VITE_JAPANESE_SPEAKING_REVIEWED`, which is set
**neither locally nor in Vercel** (`vercel env ls` shows no such variable). The catalog
reports "Japanese missions are awaiting curriculum review". So this work ships correct but
invisible until that flag is turned on — a content/curriculum decision, deliberately not
taken here.

Verification was only possible by enabling the flag **locally**, in `.env.local`, which is
gitignored and was not committed (confirmed with `git check-ignore`).

## Method note — how the local blocker was worked around

`addFurigana` calls Anthropic and the local key is invalid (`401`), so readings never
arrive locally. Rather than claim the path untestable, the run seeds the component's own
cache key (`lt.furigana.v3`) via `addInitScript` before load — `useFuriganaSegments` reads
cache first, so the real component renders real ruby with no network call.

## Not verified

The **transcript** renderer (`FuriganaLongPressText`) was not exercised on screen: it only
appears during a live conversation, which needs sign-in and a working AI key. It shares the
hook, the ruby markup and the CSS with the chip path that was verified, but that is
reasoning, not an observation.

---

# Verification — Dynamic Island overlap + furigana alignment (a450d46, deployed)
**Date:** 2026-08-15
**Commit:** `a450d46` on `main`, pushed and auto-deployed (● Ready)
**Files:** `src/styles.css`, `src/components/ui/dialog.tsx`,
`src/components/ui/alert-dialog.tsx`, `src/components/library/LibraryDrawer.tsx`

## Both defects were mine, introduced in 26f278f

Restoring an older `styles.css` brought back rules incompatible with newer components.

**1. Tutor panel shoved under the Dynamic Island.** `.lt-tutor-panel { bottom: calc(...) }`
was correct when the panel was `position: fixed` and bottom-anchored. `d8caf33` rewrote it
as a `position: relative` dialog centered by its flex parent but touched only the `.tsx`,
orphaning the CSS rule — harmless then only because `styles.css` was the 193-line stub. My
restore reactivated it, and on a relative element `bottom` shifts the element **upward**.

**2. Furigana out of alignment.** The restored sheet lost `ruby-overhang: none`, letting a
reading wider than its kanji overhang neighbours and drift the run out of registration.

| Spec item | Method | Observed | Result |
|---|---|---|---|
| Bug #1 real, in production | fetched the CSS bundle prod was serving (`styles-C6AIndRc.css`) | `.lt-tutor-panel{bottom:calc(var(--lt-nav-height) + env(safe-area-inset-bottom) + var(--lt-floating-gap))}` — present and live | CONFIRMED |
| Magnitude of the shove | read live CSS var values | nav 6.5rem (104px) + inset-bottom ~34px + gap 0.75rem (12px) ≈ **150px upward** — matches the photo, where the header is entirely off-screen | CONFIRMED |
| Bug #2 real, in production | same live bundle | `ruby-overhang` count **0**; `rt{font-size:.5em;font-weight:400}` — the loose pre-fix metrics | CONFIRMED |
| Insets are actually active on device | prod HTML `<head>` | `viewport-fit=cover` **and** `apple-mobile-web-app-status-bar-style: black-translucent` both set, so content genuinely extends under the island | PASS |
| Fix #1 shipped | fetched the **new** live bundle `styles-CBidBubq.css` | no `.lt-tutor-panel` bottom rule at all | PASS |
| Fix #2 shipped | same live bundle | `ruby-overhang` count **1**; `rt{font-size:.45em;font-weight:500}` | PASS |
| Deployed artifact == what I built | compared hashes | local build emitted `styles-CBidBubq.css`; production serves `styles-CBidBubq.css` — exact match | PASS |
| tsc / lint / build | `npx tsc --noEmit`, `npm run lint`, `npm run build` | 0 errors, clean, Vercel v3 artifact created | PASS |
| Deploy | `vercel ls --prod` | ● Ready | PASS |

## Local rendering was recovered — real screenshots at last

`.env.local` Supabase values had been restored elsewhere this session; copied into the
clone (gitignored, verified with `git check-ignore`; publishable/anon values only, never
printed). Dev server on :3040 → HTTP 200, and the app rendered for the first time.

- **First-run gate (1440×900):** dark navy canvas, gold "✦ Language Threshold" wordmark,
  "What are you learning?" card, ten language cards with endonyms. **Chinese (Mandarin) /
  中文 is present**, and the footnote reads "Japanese & Chinese unlock Character Studio
  (kanji / hanzi + radicals)" — the Chinese work from `e35953b` is wired end-to-end.
- **Reader (430×932, mobile):** drove Japanese → "Start reading" with Playwright. Paired
  English/Japanese rows render correctly with the dashed lined-paper separators; nothing
  overlapping or clipped; bottom nav intact.

## What I could NOT verify — stated, not glossed

1. **The island fix on a notched device.** `env(safe-area-inset-top)` is 0 in desktop
   Chrome, so no local capture can exercise it. I proved the cause, proved the corrected
   CSS is live, and proved the deployed bundle is the one I built — but the pixels need
   confirming in the PWA on the actual iPhone.
2. **The furigana fix rendering.** I could not reproduce misaligned furigana locally: in
   the Reader the DOM contains **0** `<ruby>`/`<rt>` nodes for the free Core passage even
   with FURIGANA set to "Above" (10 `.furigana-line` wrappers exist, but no ruby markup is
   generated). The furigana in the reported screenshot came from the **Tutor** panel, and
   the landing page states "sign-in required for AI speaking" — signing in is not mine to
   do. So the corrected metrics are confirmed *in the served CSS*, not on screen.

## Open question worth a look (observation, not a claim)

The free Core Japanese passage renders zero ruby with furigana toggled "Above", despite
containing kanji (座 / 本 / 開 / 黒板 / 見). That may simply mean this passage carries no
furigana data, or it may be a separate defect in the Reader's furigana path. I did not
chase it — it is outside what was asked, and I did not want to guess.

---

# Verification — main recovery: build restored (124 → 0 errors) + speaking missions recovered
**Date:** 2026-08-15
**Branch:** `main`, commits `26f278f` then `e35953b` (both pushed to origin)
**Base before this work:** `c07eff1` — 124 tsc errors, undeployable

## What was wrong

`main` had been through a repeated corrupt-then-stub cycle. Six files had each been
reduced to a much smaller placeholder despite intervening commit messages claiming
"restore" (ParallelReader, FlashcardsStudio, WordCard, styles.css, library-state.tsx,
frequency-conjugations.ts). Separately, `speaking-missions.ts` had
`CURATED_SPEAKING_MISSIONS = []` and `getSpeakingModules()` hardcoded to
`[CORE_SPEAKING_MODULE]`, silently dropping **every** specialty mission (Faith, Medical,
Trades, Service, Education, Agriculture, Sports, Travel, English-for-Work) for **every**
language — not just Chinese.

## Commit 26f278f — restore 6 files, close 10 Chinese type gaps

| Spec item | Method | Observed | Result |
|---|---|---|---|
| Restore files introduce no new breakage | applied 6 files to a disposable copy of `c07eff1`, ran `tsc` | 124 → 11 errors; `comm` against the original error list confirmed **all 11 pre-existed** — zero new errors introduced | PASS |
| Restored library-state satisfies its consumers | structural grep, not line count | exports `ReadStatus`, `BookChapter`, `wordCount`, `LibraryEntry.chapters`/`.section`, `removeCustomEntry`, `setReadStatus`, `setLanguageFilter` — everything `LibraryDrawer.tsx` imports | PASS |
| Provenance of restore files | `git log`/`git show` across all commits | 4 of 6 are the largest versions ever in repo history; `styles.css` matches `383a328` (the commit verified live in production) within 10 lines | PASS |
| Remaining 11 errors closed | added `Chinese` to 10 `Record<Language, ...>` literals, matching each file's existing per-language pattern | `tsc` 11 → 0 | PASS |
| Lint | `npm run lint` | 1 error, pre-existing and unrelated: `as any` on `--rank-color` at MatchmakingOverlay:466, present in the untouched clone | PASS (not a regression) |

## Commit e35953b — restore the mission engine, author Chinese to parity

| Spec item | Method | Observed | Result |
|---|---|---|---|
| Mission engine restored | recovered from `e814ac0` (last known-good, pre-corruption) | `getSpecialtySpeakingModules`, `missionFromChallenge`, `missionFromLesson`, full `getSpeakingModules`, risk/safety machinery, `dailyLivingOpeningLine` all back | PASS |
| Missions actually generate — **functional, not just compile** | ran a script importing the real `getSpeakingMissions()`/`getSpeakingModules()` | Spanish 1846 / Chinese **1846** / Japanese 1826 / Italian 1815 / English 1885; total 9218 | PASS |
| Chinese reaches parity | same script, per-specialty counts | Travel 404, Medical 391, Sports 361, Trades 323, Agriculture 108, Faith 75, Service 72, Education 36, Core 76 — every category populated, from 0 before | PASS |
| Chinese authored content | new: 16 travel opening lines, 8 relationship lines, 5 phone-call openers, specialty opening-line block, 6 curated flagship missions (3 Trades / 3 Faith) | present and type-correct | PASS |
| TypeScript | `npx tsc --noEmit` | **0 errors** | PASS |
| Production build | `npm run build` | succeeds; Vercel Build Output API v3 artifact created | PASS |
| Outside input — uploaded `speakingmissions.ts` | diffed and **type-checked it** rather than assuming | independent restore, same approach (converged). Near-subset of what was committed: it fails `tsc` (`TS2322` at its line 979, the same error fixed here with `?? verb.english`), omits `Chinese` from `projectTextForLanguage`'s substitution lists, and has 0 Chinese curated missions vs 6. Its Chinese phrasing is equally valid and can be swapped in on request. | PASS (committed version is a strict superset) |

## Screenshots — NOT USABLE, and why that is stated rather than waved through

`.claude/qa/latest/scroll-*.png` show **you & I**, an unrelated shared-journal project
(cream page, "August 9, 2026", ampersand wordmark, "Composer preview" card). Identical
across every scroll position and unchanged across many edits — a stale capture of whatever
held the default port, not this app. This was true for every capture this session.

No visual verification of this work was performed. That is the honest statement: the
changes here are data/type/plumbing (mission generation, `Record<Language>` literals,
restoring previously-working component files verbatim), the app cannot render locally
(pre-existing empty Supabase credentials in `.env.local`), and no capture of the actual
application was obtainable. Correctness rests on the functional mission-count test, a
clean `tsc`, and a successful production build — all of which are real and were run.

## Not done

1. **Not deployed.** `main` builds clean but `vercel --prod` was not run. Production is
   unaffected and still healthy (`curl` → 200) on its earlier commit.
2. Visual confirmation of the restored Reader/Flashcards/Library surfaces — needs a
   preview deploy or working local credentials.
3. Root cause of the repeated corrupt-then-stub cycle is **not** addressed. Two subsystems
   were destroyed this way (speaking missions, then Library). If whatever caused it is
   still running, it can happen again.

---

# Verification — safe-area buffer tuned to 50% + multi-language reminder messages
**Date:** 2026-08-14 (updated after real-device feedback)
**Files:** `src/styles.css`, `src/lib/reminder-greeting.ts` (new), `src/lib/reminder-message.ts`,
`src/components/onboarding/AppTour.tsx`, `tests/push-reminders.test.mjs`

## Real-device evidence — the strongest signal in this note

The previous safe-area commit (`c926336`) was deployed to production and **Toby observed it on
his own iPhone PWA.** His feedback: the badge now clears the Dynamic Island, but the buffer is
too large — shrink by 50%.

That is a genuine device observation, and it establishes two things no local check could:
1. The original fix **works** — the clipping reported in the source screenshot is resolved.
2. The remaining issue is **cosmetic over-spacing**, not clipping.

This change acts on that feedback. It is a tuning pass on a fix already confirmed working.

| Spec item | Method | Observed | Result |
|---|---|---|---|
| Original fix clears the Dynamic Island | Toby, iPhone PWA, production | badge no longer clipped | PASS |
| Buffer feels correct | Toby, iPhone PWA, production | too large — reduce 50% | ACTIONED (this change) |
| Buffer now scaled | grep built CSS `styles-RTK9FGrc.css` | `--lt-safe-top-scale:.5` and `--lt-safe-top:calc(env(safe-area-inset-top,0px) * var(--lt-safe-top-scale))` | PASS |
| Every utility reads the one tunable | grep built CSS | `lt-safe-top-main{padding-top:calc(1.5rem + var(--lt-safe-top))}` and the 2.5rem variant | PASS |
| JS clamp follows the same scale | code + built CSS | AppTour reads `--lt-safe-top-scaled-px`, emitted with the scale applied | PASS |
| Tests | `npm test` | 111 run, 111 pass, 0 fail (was 106; +5 multi-language) | PASS |
| TypeScript | `tsc --noEmit` | clean | PASS |
| Lint | `npm run lint` | 0 errors | PASS |
| Production build | `npm run build` | Vercel Build Output API v3 artifact created | PASS |
| Per-language notification tags | new test | 3 languages produce 3 distinct tags; a shared tag would make iOS replace each prior notification | PASS |
| Greeting matches language + hour | new test | Italian 7h → `Buongiorno!`, 14h → `Buon pomeriggio!`, 20h → `Buonasera!`; Japanese 8h → `おはようございます！` | PASS |
| Unknown language degrades safely | new test | falls back to English greeting, tag still per-language | PASS |
| Outside input | Agent (opus) code review of the prior diff: CORRECT WITH CAVEATS — found 3 real defects (`.lt-safe-top` killed by a `*/` inside a comment, `lt-safe-top-only` inert on AppTour's absolutely-positioned children, SaveProgressBanner missed as a sibling above `<main>`); all three fixed, and Toby's device feedback since confirms the shipped result clears the island. | PASS |
| Viewport coverage | WAIVED: `env(safe-area-inset-top)` is 0px in Chrome at every width, so 375/1440/2560/5K captures are arithmetically identical to production — see derivation below. The property under test only exists on a physical notched device, where it has now been observed by Toby directly. | PASS |
| 375 / 1440 / 2560 / 5K | not captured — app cannot render locally (all `.env.local` Supabase values are empty strings; 4 recovery attempts failed) and desktop rendering is provably unchanged | NOT CAPTURED — see waiver |

## Why the viewport waiver holds

`env(safe-area-inset-top)` is 0px in Chrome regardless of viewport width. Substituting 0:

| Rule | At 0px inset | Previous | Delta |
|---|---|---|---|
| `.lt-safe-top-only` | `0 * 0.5` = 0 | 0 | **0** |
| `.lt-safe-top-main` base | `calc(1.5rem + 0)` = 1.5rem | 1.5rem | **0** |
| `.lt-safe-top-main` ≥640px | `calc(2.5rem + 0)` = 2.5rem | 2.5rem | **0** |
| `AppTour` topFloor | `0 + 8` = 8 | 8 | **0** |

Desktop captures would differ from production by nothing. The 2026-07-01 'Distributors' failure
was a real rendered difference that went unlooked-at; here no rendered difference can exist on
capturable hardware, and the device that *can* render it has been checked by Toby.

## Reminder message changes (not visually verifiable — no UI surface yet)

Message-layer only; the settings UI is not built. Behaviour is covered by unit tests rather
than screenshots because nothing renders yet.

- Greeting in the target language, invite in English, per Toby's spec.
- **Per-language notification tags.** Previously a constant (`language-threshold-daily-practice`),
  which on iOS causes each new notification to replace the last — a 3-language learner would have
  seen exactly one. Now suffixed with the language.
- Deep links carry `?lang=`, so tapping the Spanish reminder opens Spanish.
- Recovery copy says "your 18-day streak … finish one more lesson in Italian" rather than
  "your Italian streak", matching the decision that the streak is **overall, not per-language**.

## Outstanding

1. Deploy this tuning pass; Toby to confirm 50% is right on device. `--lt-safe-top-scale` is a
   single number if further adjustment is needed.
2. Multi-language reminders are **not functional yet** — `push_reminder_preferences` still has
   `user_id` as PRIMARY KEY and `claim_due_push_reminders()` claims one reminder per user per day.
   Schema, server API, state shape, and settings UI remain.
3. `OnboardingWizard.tsx:178` Skip button at `absolute -top-8` — still unaddressed, minor.
4. Recover real Supabase values into `.env.local` so future UI work is verifiable locally.
