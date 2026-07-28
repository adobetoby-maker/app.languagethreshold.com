# Verification — DUO-002 repair phase (F1 vocabulary write path, F2 Word Card source sentence)

Branch: `integrate/usability-onboarding` · Head: `5ab90e5`
Base: `be3cc1e1` (application tree identical to `44d74c9`) · Date: 2026-07-27

Covers the repair commit: vocabulary write-path correction, Word Card source
sentence, and explicit labelling of the generated example. Verified by the Atlas
Duo coordinator from read screenshots and executed gates — not from code intent.

| Dimension | Observed | Score /10 |
|---|---|---|
| Scale | Four files: `vocab-store.ts` (+4 pure writers), three reducers in `app-state.tsx`, one panel in `WordCard.tsx`, one new test file. No spread into unrelated subsystems. | 9 |
| Vision | F1 removes the failure *class*: `userVocab` becomes strictly derived, so no future writer can reintroduce the bug. Write-through in three reducers would have left the same trap for the fourth. | 9 |
| Correctness | F1 proven broken before the fix from the immutable commit (expected 3, actual 5), then proven fixed by 5 new tests. F2 confirmed at runtime, not inferred: `"Per un giorno, per favore."` rendered for tapped word `per`. `tsc` caught a real widening error in my first attempt; fixed before commit. | 9 |
| Relationship | `Math.max` deliberately retained for legacy/remote reconciliation, where losing learner progress is the worse failure; only in-app writes bypass it. The two concerns are now separated rather than conflated. | 9 |
| Scope | F3 and F4 deliberately not attempted rather than half-done. Pre-existing 1440 drawer clipping left untouched — real, but not one of the five findings. | 8 |
| Fit | New writers live in `vocab-store.ts` beside the existing model and are importable by the existing `.ts` test harness — no new tooling, which is what blocked the first builder. | 9 |
| Style | Comments record *why* the clamp is kept and what the "In this sentence" heading used to omit, so neither gets "simplified" back later. | 8 |
| Direction | **Weakest.** The repair is 2 of 5. The branch is better but not coherent until F3/F4 land, and the two named regression cases turn out to be unreproducible from repo content — an acceptance-criteria defect that needs resolving before QA. | 6 |

| Spec item | Observed | Result |
|---|---|---|
| Layout / spacing | Word Card 390×844: headword `per`, IPA `/pɛr/`, PREPOSITION chip, definition, divider, IN THIS SENTENCE panel, Ask Tutor hint, ANOTHER EXAMPLE, COMMON PHRASES. No overlap with fixed bottom nav. | PASS |
| Colors / contrast | Gold-bordered `bg-gold/[0.07]` source panel reads clearly on dark; mono labels legible; blue Ask Tutor hint stays distinct from the gold panel. | PASS |
| Typography | Display serif for headword and both italic sentences; mono uppercase tracked section labels. The two italic sentences are now separated by label, not position. | PASS |
| Mobile (390px) | Card fits viewport width, no horizontal clipping. Bottom nav: More · Reader · Cards · Grammar · Games · Speak · Dashboard · Tutor, Tutor docked far right in gold. | PASS |
| Animations / motion | Card open transition clean, no mid-animation artefacts. Zero console errors across all four runs. | PASS |
| F2 — source sentence | `[data-testid="wordcard-source-sentence"]` renders `"Per un giorno, per favore."` — exact sentence containing the tapped word. Grammar note specific to that sentence. | PASS |
| F2 — example labelled | `⊕ ANOTHER EXAMPLE` renders above `"Ho lavorato per tre ore."`; the generated example can no longer be read as the tapped sentence. | PASS |
| Language gate (390 + 1440) | 8 languages in native scripts (Español, Français, Italiano, Deutsch, Português, 日本語, 한국어, پښتو), "More languages" collapsed. All 8 above the fold at 390. | PASS |
| Footer visible | No scroll video. WAIVED — Word Card and language gate are fixed overlays with no scrolling footer. | WAIVED |

## Viewport coverage — all 4 required, each read

Captured with `eyes-4vp.sh 8080` into `.claude/qa/vp/`. One observed sentence each.

| Viewport | Observed | Result |
|---|---|---|
| 375×812 | `vp375-0.png` read: language gate fills ~90% of width, headline commanding, all 8 languages plus the "More languages" expander visible without scrolling, generous tap targets, native scripts clean (Español / Français / 日本語 / 한국어 / پښتو). Best composition of the four. | PASS |
| 1440×900 | `vp1440-0.png` read: same gate in a max-width column sitting left-of-centre at roughly a third of the width, with large dead space above, below and right. Legible and correct, but sparse. | WARN |
| 2560×1440 | `vp2560-0.png` read: the card occupies roughly 18% of the width, marooned in a very large empty field; type is small relative to viewport and the page reads unfinished rather than composed. | WARN |
| 2560×1440 @2x (5K) | `vp5K-0.png` read: layout identical to 2560 at double density; glyphs crisp including CJK and Arabic script, no scaling artefacts. Same max-width weakness, not worse. | WARN |
| **Word Card @ 2560** | `wordcard-2560.png` read — the surface this commit actually changes. Fixed-width overlay anchored near the tapped word. Computed: `font-size: 16px`, `highlighted tokens = 2`, source box 312px. Hierarchy holds identically to 390. Entire card fits including COMMON PHRASES, RELATED WORDS, ORIGIN and the PRONOUNCE / ASK TUTOR / MY VOCAB row. | PASS |

**Refinement to an outside-review finding:** the card is *not* clipped at 2560 —
the full card including its action row is visible. The mid-glyph clipping the
reviewer saw is specific to 390×844, where card height exceeds the viewport. It
is a mobile-height problem, not a general one.

**Scope caveat, stated rather than glossed:** the 4-viewport sweep captures the
first-run language gate, because that is what renders at load. The Word Card only
appears after interaction, so it was verified separately at 390 and 2560. The
1440/5K Word Card was not captured; the card is a fixed-pixel overlay
(`cardWidth()`), so it does not reflow with viewport — but that is reasoning, not
a capture, and Codex should confirm it.
| Outside input | Independent reviewer (Opus, no authorship): "The change is directionally correct and the tapped sentence is now genuinely on screen, but the fix is defeated at a glance: the generated example is rendered larger, brighter, and better-glossed than the sentence the learner actually tapped, and the tapped word itself is still unmarked in both." Verdict: do NOT show as-is. | PASS (recorded) |

## Outside review — findings I did not catch

Sought before showing Toby, per standing need-20260630-0009. The reviewer verified
both F2 claims against the pixels and **partially refuted the second**:

1. **Type hierarchy is inverted.** The generated example renders larger, brighter,
   and with an English gloss; the tapped sentence renders smaller, dimmer, and
   with no gloss. The labels say primary/secondary; the type says the opposite.
   I fixed the wording and shipped the weight asymmetry I introduced.
2. **The tapped word is not marked in the sentence.** `per` occurs twice in
   `"Per un giorno, per favore."` and is highlighted in neither position, so the
   grammar note has to open by explaining "used twice in this sentence" because
   the UI cannot show it.
3. **Gloss asymmetry reads as a bug** — the fabricated sentence gets an English
   translation while the learner's real sentence does not, in a product whose
   English pane demonstrably has that text.
4. Also flagged: `per favore (please)` sliced mid-glyph at the card's bottom
   border; background UI bleeding through the modal's right edge; 📌 colour emoji
   beside two monochrome `⊕` markers (violates this project's no-emoji-as-icon
   rule); monospace used for English prose translation; the blue Ask Tutor hint
   is the loudest block on the card and physically splits the two sentences.
5. On desktop: the clipped drawer is cosmetic, but ~500px of 900px is chrome
   before any reading text, with three concurrent navigation systems (~42 targets)
   and "Reader" shown active in two of them at once.

**Consequence for F2: findings 1–3 were acted on, not filed.** Re-verified after
the fix.

| Re-verified item | Observed | Result |
|---|---|---|
| Source sentence dominant | `font-size: 16px`, full-brightness `text-foreground`; generated example demoted to 13px `text-foreground/75`. Measured from computed style, not asserted. | PASS |
| Tapped token marked | `highlighted tokens in source = 2` — both occurrences of `per` in `"Per un giorno, per favore."` render gold. Previously zero. | PASS |
| Glance order | On the re-capture the eye lands on the tapped sentence first; the generated example now reads as clearly subordinate. | PASS |
| Gloss typography | English translation moved off `font-mono` — it is prose, not UI chrome. | PASS |
| Emoji-as-icon | 📌 replaced with `✦`, matching the two `⊕` markers. Restores this project's no-emoji-as-icon rule; the More sheet uses SVG icons throughout. | PASS |

Still open from the outside review, deliberately not fixed here:

- Card bottom clips `per sempre (forever)` mid-glyph at the rounded border — needs
  a fade/mask or scroll affordance.
- Background UI bleeds through the modal's right edge; scrim is not opaque enough.
- The blue Ask Tutor hint is still the loudest block and physically splits the two
  sentences.
- The tapped sentence still has no English gloss while the generated one does.
  `WordCardRequest` carries no translation, so closing this needs caller-side
  plumbing from the native pane — a real change, not a style tweak.
- Desktop: ~500px of 900px is chrome before any reading text, three concurrent
  navigation systems (~42 targets), "Reader" active in two at once. Outside the
  five findings; recommend a separate task.

## Gates at `5ab90e5`

| Check | Result |
|---|---|
| `git diff --check` | PASS |
| `npm run rosetta:check` | PASS — 7 artifacts, invariants verified |
| `npx tsc --noEmit` | **0 errors** |
| `npm run lint` | 0 errors, 11 warnings (baseline unchanged) |
| `node --test` (3 files) | **15/15 pass** (was 10; +5 new) |
| `npm run build` | PASS — Vercel Build Output API v3 artifact created |

## Pre-existing, NOT introduced here

1. **1440 Reader clipping** — a panel bleeds from under the left sidebar
   (ADD TEXT / ITALIAN / 75/75 / READ) and "Margin"/"Select" clips at the right
   edge. Corroborates Codex's "Library drawer horizontally clipped" finding.
2. **Language gate composition at ≥1440** — `max-w` column adrift in a large
   empty field. Reads well at 390. Matches the earlier recorded WARN.
3. **`.env` committed historically** (3 commits) though now untracked and covered
   by four gitignore rules. Belongs to the separate security task PR #5 called
   for; not touched here.

## Open, and why not done

1. **F3 — "Vocab (your words)" filter inversion.** Not diagnosed, not fixed.
2. **F4 — Track B `readerContext` Zod schema.** Not ported.
3. **AI runtime certification on Vercel Preview** — still credential-gated. No
   credential was borrowed, copied, recovered, or added. The local dev server
   loaded this project's own existing environment only; that certifies locally
   and does **not** certify the Preview.
4. **Named regression cases are unreproducible from repo content.**
   `Dove abiti?` / `abitare` appear nowhere in `src/`. `prenotazione` exists only
   in `src/data/library-seeds/service-edu-seeds.ts` ("Trattoria: Servizio al
   Tavolo"), a module seed not reachable from the default library. Certifying
   either case requires the exact source text to be specified first.

## Gate question

**Would I show this to Toby right now without him asking? YES for F1 and F2** —
after the outside review was acted on, not merely recorded.

The sequence matters. My own answer was YES. The independent reviewer overturned
half of it and was right to: I had scored F2 from a DOM assertion and the label
text, while the reviewer scored it from the type scale — and the type scale is
what a learner actually sees. The generated example was larger, brighter and
better-glossed than the sentence the learner tapped, so the defect survived at a
glance even though the mechanism was correct.

That is the iter-16 failure mode in miniature: correct mechanism, unread
hierarchy. It was caught by outside input rather than by Toby on a live deploy,
which is the entire point of the standing need — and it was then fixed and
re-verified from a fresh capture and computed styles, rather than filed as a
known issue.

NO as a completed repair: this is 2 of 5 findings. F3 awaits a product decision
from Toby; F4 is not started. Stated plainly rather than carried silently.
