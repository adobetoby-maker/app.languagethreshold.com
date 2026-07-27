# CLAUDE_PLAN — DUO-002 Entry, Discovery, and Signature Learning Loop

Agent: Claude Code
Branch: `claude/usability-onboarding`
Baseline: `8dff4f2b03f5e81a55894574e8ef3326d80d1116`
Status: `independent-complete`
Date: 2026-07-26

## Independence attestation (PRD §6)

I have **not** read `CODEX_PLAN.md`. Verified it does not exist on
`codex/usability-onboarding` @ `79da1c10`. I did not inspect that branch's
contents, and both subagents I dispatched were explicitly firewalled from it.

Disclosure: I read `AI_HANDOFF.md` §6 earlier, which contains Codex's
source/product review. I judge this *not* a violation because that same review
is reproduced as shared evidence in the PRD itself (§4). Flagged for Toby to
overrule if he reads the boundary differently.

## Evidence base

Two independent investigations, both from scratch on this baseline:

1. **Source inventory** — 31 `TabKey`s traced through `tab-registry.ts` and
   `app-state.tsx`, every learner-facing tool read, with `file:line` citations.
2. **Live-site review** — Playwright, clean-slate unauthenticated session, at
   390×844 / 430×932 / 1440×900. Screenshots in
   `scratchpad/duo002/`. (Chrome MCP could not control viewport size;
   Playwright was used instead, which also gave a true new-user state.)

---

## 1. Product reasoning — what is actually wrong

**The app does not have a "too many tools" problem. It has a "no spine" problem.**

That distinction drives every recommendation below, and it is why I am not
proposing to remove or hide tools.

The evidence for it:

- The signature loop **works and is genuinely excellent**. The live review
  confirmed the Word Card carries headword, IPA, POS, an `IN THIS SENTENCE`
  grammatical analysis, examples, collocations, and etymology — and that the
  Tutor prefill really does carry the word *and its full sentence*. The
  differentiating claim in PRD §2 holds up in production.
- But **nothing ever teaches the loop.** `OnboardingWizard.tsx:127-133` routes
  to `discussions` / `fieldPrep` / `guide` — never to Reader. `AppGuide`'s
  toolkit map omits 15 of 31 registered tabs. Word spans are styled
  `hover:text-gold` — **hover-only**, so on a phone there is no signal at all
  that words are tappable.
- And **the loop's last step does not pay off** (see §2, P0-1).

So the learner meets a wall of tools, is given no thread to pull, and if they
happen to find the thread anyway, it terminates in a save that appears to work
and doesn't. Toby's son's experience is the predictable output of that, not a
mystery.

**Corollary I want to state plainly:** the child's "brighter colors" request is
already solved and shipped. A warm cream light theme exists
(`--background: oklch(0.96 0.012 80)`, gold accents, strong contrast). It is
off by default (`app-state.tsx:190` hardcodes `darkMode: true`, and no
`prefers-color-scheme` query exists anywhere) and is reachable only through a
small unlabeled icon in a crowded bottom strip. Making it discoverable is close
to a free win and requires no new design work.

---

## 2. Findings, ranked

### P0-1 — "My Vocab" save does not reach Flashcards *(conflicting evidence — verify first)*

The live review found: after tapping MY VOCAB on the word *hidalgo*, zero
network requests fired, `lingualens.flashcards.v2` was unchanged, the Cards tab
read `ALL VOCAB (YOUR WORDS) 0`, and `/hidalgo/i` did not match anywhere in the
DOM. Meanwhile the button relabels to `STUDY YOUR SAVED WORDS →` and keeps that
state on reopen — **the UI reports success that did not happen.**

The source review disagrees in part: `WordCard.tsx:359-369` does dispatch
`ADD_VOCAB_ITEMS`, and `FlashcardsStudio.tsx:157-161` does dispatch
`SYNC_VOCAB`. So the word plausibly lands in `app-state.userVocab`
(`localStorage["lt.app.v2"]`) but never crosses into the flashcard store.

**The live agent checked the flashcard key, not the app-state key.** That gap
is unresolved and is my first implementation task — I will not build on either
account until I have reproduced it directly. Three candidate causes, in order
of likelihood:

1. `vocabLang` mismatch — every consumer gates on it (`TutorPanel.tsx:184`,
   `PatternLab.tsx:483`), and a mismatch fails **silently**.
2. `SYNC_VOCAB` not firing on mount, or filtering the new item out.
3. The dispatch genuinely not landing.

Regardless of cause, the UI must never claim a save it cannot verify.

### P0-2 — Tappable words have no touch affordance
`hover:text-gold` on word spans. Hover does not exist on touch. The signature
interaction is **invisible on the product's primary platform**. No coach-mark,
no underline, no hint text in Reader.

### P0-3 — Developer diagnostics shipped to learners
`◈ FILTER CHECK · {surface}` at `ModuleMatchPanel.tsx:87`, **completely
ungated** — no `import.meta.env.DEV` guard at the component or any call site.
Renders as the *first element* in the content area on Reader, Cards, Grammar,
and Speak (4 of 8 primary tabs), at every viewport. ~7% of a 390px screen.

### P0-4 — New learners get the wrong content entirely
Onboarding **never asks which language the learner wants.**
`selectedLanguage` stays `"Spanish"` (`app-state.tsx:314`); Reader defaults to
`classic-quixote` (`library-state.tsx:70`), a **C2** text
(`all-seeds.ts:35-47`). Changing target language does not change the text
(`ParallelReader.tsx:89-98` early-returns; `library-state.tsx:431-437` only
re-selects when the entry is *unavailable*).

Net: a beginner who picks French reads 17th-century Cervantes, in Spanish,
with no explanation. 593 seeded texts across 9 languages exist and go unused.

### P1-1 — Floating Ask Tutor covers content on every primary tab
Fixed at `230,694 144×46` at 390px, never moves. Hit-testing beneath it found
it covering: Reader target text (`rocín`, `y`), **the flashcard tap-to-flip
target**, Grammar's empty-state instruction, the Language Match card, Speak's
Spoken Challenges, Dashboard's rank panel, and More's HOW XP WORKS.

Source confirms the mechanism: FAB at `lg:bottom-6` (24px) sits *inside* the
64px band `<main>` reserves for the desktop bottom nav (`index.tsx:149`). Open
panel at `bottom-4`, equal `z-40`, mounted later than `AppSidebar` — so on
mobile it is full-width and **buries the bottom nav including "More", the only
route to 16 of 22 sidebar tabs.**

Covering the flashcard flip target is arguably P0.

### P1-2 — Word Card shows a blank void for 3–5s
Polled at 1/2/3/5s: empty at 1–3s — a 316px bordered box containing only `×`
and `+2 XP`. No spinner, no skeleton. First-timers will read it as broken.
Grammar Studio already has the right pattern (spinner, ~4s, resolves cleanly).

### P1-3 — The save action is buried below the card fold
`PRONOUNCE / ASK TUTOR / MY VOCAB` sit at the bottom of a 675px card in an
844px viewport. Reaching them took **~2400px of in-card scrolling** past Common
Phrases, Related Words, and Origin. The loop's key action is its hardest to find.

### P1-4 — My Vocab has no home
There is **no `myVocab` TabKey**. The hinge of the signature loop and the
most-referenced shared object in the app is reachable only as a Flashcards
category or a builder nested inside Pen Pal. It is invisibly gated by
`vocabLang`. A **second, disconnected** saved-words store exists at
`match-state.savedVocab` — words banked in Language Match never appear.

### P1-5 — The answer to "where do I start?" is hidden in the 8th tab
`More` contains `Choose your field to get started` **and a real 15-stop
`App Walkthrough` with a `START TOUR` button** — behind the least prominent,
right-most nav item.

### P1-6 — Three simultaneous navigation systems, and they disagree
Desktop 1440 shows a 15-item left rail + 15-item two-row top nav + 7-item
bottom bar with overlapping destinations. Source confirms three hand-maintained
lists (`TopNav.tsx:37-57`, `AppSidebar.tsx:90-154`, `AppSidebar.tsx:374-382`)
whose union covers 25 of 31 tabs. **6 tabs have no nav affordance at all**
(`soccer`, `baseball`, `orEvs`, `fmg`, `climbing`, `fishing`); **3 are
desktop-only** (`kana`, `anatomy`, `modules`) — a Japanese learner on a phone
cannot reach Kana Pad.

### P1-7 — No mobile sign-in path after banner dismissal
`AuthButton` renders only in `TopNav` (`lg:block`). Once `SaveProgressBanner`
is dismissed — which persists permanently — a mobile user has **no way to
create an account anywhere in the app.**

### P2 — Confirmed, lower impact
- Reader is a 2-column split at 390px: ~175px columns, 2–4 words per line.
- ~46% of the first Reader screen is chrome before one word of content.
- Sticky `+2 XP` badge and `×` overlap card body copy with no scrim.
- Bottom chrome ~98px (11.6%); tab labels at `text-[8.5px]`.
- Arena LEADERBOARD pill overlaps its title at 390px.
- Tutor panel wastes ~420px vertical; prefilled prompt visually clipped.

### Reported as broken but **verified NOT broken** — do not "fix" these
Honesty matters more here than a longer defect list:
1. **Banner dismissal works correctly** and persists across tab change *and*
   reload. It is 12.3% of a 390px viewport — but that is a text-wrap effect
   (7.1% at 430px, 3.0% at 1440px), not a fixed cost.
2. **Grammar generation is not indefinite** — ~4s with a visible spinner,
   yielding 6 A1 lessons. The earlier report caught it mid-load.
3. **Theme toggle works** both directions.
4. **Zero console errors and zero page errors** across the full 8-tab sweep.

PRD §4 lists items 1, 2 and 4 as known problems. On this baseline they are not.
`BRIEF.md` should be corrected — this is exactly the "shared facts may be
corrected" path in §6.

---

## 3. Plan

Sequenced so the highest-value, lowest-risk work lands first. Nothing here
removes a tool.

### Phase 1 — Make the loop actually complete (P0)
1. **Reproduce and fix the My Vocab save.** Verify against `lt.app.v2` *and*
   the flashcard store. Fix root cause. Then make the success state
   **conditional on verified persistence** — never relabel optimistically.
2. **Give words a touch affordance.** Persistent non-hover styling (subtle
   dotted underline or tinted ground) + a one-time dismissible Reader hint:
   `Tap any word to understand it here.` (PRD §8.3 wording).
3. **Gate the diagnostics.** Wrap `ModuleMatchPanel`'s header in
   `import.meta.env.DEV`. Where a filter genuinely affects content, replace it
   with plain learner language.
4. **Ask for the language in onboarding**, and make Reader honor it — select a
   level-appropriate seed text for the chosen language, not `classic-quixote`.

### Phase 2 — Reveal the loop (P0/P1)
5. **Route onboarding to Reader** with a seeded passage, ending on one dominant
   action (`Start Reading`). Keep role cards — they work and they keep their
   promise — but move `Just exploring` above the fold (currently y=817 in an
   844px viewport).
6. **Surface the existing App Walkthrough.** It already exists and is good; it
   is merely buried in the 8th tab.
7. **Promote the Word Card action row** above the fold, or pin it.
8. **Add a Word Card loading state** — reuse Grammar Studio's spinner pattern.

### Phase 3 — Stop the chrome from fighting the content (P1)
9. **Fix Ask Tutor overlap.** Dock into the bottom strip or reserve real
   scroll clearance + safe-area. Acceptance is PRD §8.6 verbatim: *no important
   content can scroll underneath an unreachable Tutor control.* Verify by
   hit-testing beneath the pill on all 8 tabs, not by eye.
10. **Give My Vocab a home** — a real tab, and make the `vocabLang` gate
    visible instead of silent ("Your saved French words are hidden while you're
    learning Spanish").
11. **Add a mobile sign-in entry point** independent of the banner.
12. **Reduce Reader chrome above the text** and reconsider the 2-column split
    at 390px.

### Phase 4 — Brighter, and connected (P1/P2)
13. **Make light theme reachable for new users** — offer it in onboarding
    and/or respect `prefers-color-scheme`. Tune the light `:root` block
    (`styles.css:48-82`): the gold at L 0.74 has poor contrast on L 0.96 ivory.
    Then sweep the hardcoded dark-only utilities (`prose-invert`,
    `text-sky-300`, `bg-[#06101e]`, `<Toaster theme="dark">`).
14. **Add per-tool purpose lines** (PRD §8.9) — starting from Toby's copy, in
    learner language.
15. **Fix the nav lists.** Derive from one source rather than three
    hand-maintained arrays. Restore reachability for the 6 orphaned tabs and 3
    desktop-only tabs.

### Explicitly deferred — flagged, not touched
- **All monetization is disabled** via three separate `DEMO MODE` overrides
  (`SubscriptionGate.tsx:23`, `subscription-state.tsx:59`, `ai-gate.ts:57`)
  while 42 modules display prices and `/account` shows live Stripe links.
  Out of scope per §12, but Toby should know this is the live state.
- **Simulated social features are undisclosed** — Language Match opponents are
  generated client-side (`MatchmakingOverlay.tsx:36-46`) and the leaderboard is
  8 seeded fake players (`leaderboard-state.tsx:76-113`). Nothing discloses it.
  Product/ethics call, not a usability fix.
- **Incoherent XP economy** — 0 XP for some tools, 3–15 for others, plus 5 XP
  merely for visiting a tab. Needs a design decision, not a patch.
- **Two orphaned components** imported nowhere: `FreePreviewBanner.tsx`,
  `StatusBar.tsx`.

---

## 4. Tool disposition (PRD §7)

Full per-tool inventory with the 13-field template is held in the source
investigation. Summary disposition — **nothing is cut**:

| Tool | Disposition | Reason |
|---|---|---|
| Reader | **Revise** | Core. Reduce chrome, fix language/level selection, add touch affordance |
| Word Card | **Revise** | Crown jewel. Loading state + promote actions |
| Tutor | **Revise** | Excellent, badly placed. Fix overlap; send tapped sentence in API context |
| My Vocab | **Revise + promote** | Loop hinge with no home. Needs a tab |
| Flashcards | **Keep** | Strong hierarchy, real SM-2. Protect per §15.14 |
| Speak | **Keep** | Good empty state. Protect per §15.15 |
| Grammar | **Keep** | Loading is fine; remove diagnostics only |
| Games / Dashboard | **Keep** | Fix Tutor overlap only |
| Onboarding | **Revise** | Add language step; route to Reader; reorder roles |
| App Guide / Walkthrough | **Promote** | Already good, merely hidden |
| Account / progress | **Revise** | Add mobile entry point |
| 20 secondary tools | **Keep** | Restore nav reachability; add purpose lines |

---

## 5. Risks

1. **My Vocab root cause may be wider than the button.** If it's `vocabLang`,
   the same silent gate affects Tutor, Pattern Lab, Daily Story and Pen Pal.
   Scope could grow — I will report before expanding.
2. **Nav unification touches every screen.** Highest regression risk in the
   plan. Sequenced last deliberately.
3. **Light-theme sweep is broad** — hundreds of hardcoded dark-only utilities.
   Phase 4 fixes the entry path first; the full sweep may need its own task.
4. **Onboarding language step interacts with module activation**, which already
   maintains three drifted copies of `FIELD_PREP_IDS`.
5. **DUO-001 unconfirmed.** Without working previews there is no preview link
   for cross-review (§15.4).

## 6. Open questions for Toby

1. **DUO-001 status** — are Vercel previews working? Blocks implementation.
2. **Is the My Vocab save meant to require an account?** If so the UI must say
   so; today it reports success either way.
3. **Light theme as the new-user default**, or offer it during onboarding?
4. **Language step in onboarding** — add it, or infer from the role/module?
5. Confirm `BRIEF.md` should be corrected on the three §4 items that do not
   reproduce on this baseline.
