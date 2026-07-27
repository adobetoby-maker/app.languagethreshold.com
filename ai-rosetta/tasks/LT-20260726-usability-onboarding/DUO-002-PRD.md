# Duo PRD: Language Threshold Entry, Discovery, and Signature Learning Loop

Duo task: `DUO-002`
Rosetta task ID: `LT-20260726-usability-onboarding`
Repository: `adobetoby-maker/app.languagethreshold.com`
Production: `https://app.languagethreshold.com`
Deployment: Vercel project `language-threshold-app`
Owner: Toby Anderton
Agents: Claude Code and Codex
Status: Shared brief — independent review begins next

> Source of truth: authored by Toby, delivered 2026-07-26. Saved verbatim in intent.
> Both agents work from this identical document.

## 1. Purpose

Improve the Language Threshold entry experience and mobile usability without reducing the depth or importance of its learning tools.

The application becomes rewarding once the learner starts using Flashcards or discovers the Reader-to-Tutor interaction. The problem is that a new learner may not understand where to begin or why each tool exists.

Toby's son found getting started too complicated. Once he reached Flashcards, he liked the application. He also wanted brighter colors.

The update must help users experience the product's core value quickly while retaining Reader, Tutor, My Vocab, Flashcards, Speak, Grammar, Games, Dashboard, and every other legitimate learning tool.

**This is not a Flashcards-only product. The complete toolkit is intentional and valuable.**

## 2. Product North Star

Language Threshold helps learners move from recognizing language to understanding it, remembering it, and using it in meaningful situations.

The signature learning loop:

```text
Reader
  → tap a word
  → understand the word in its sentence
  → ask the contextual Tutor
  → save it to My Vocab
  → practice it with Flashcards and other tools
  → use it in speech and real situations
```

The most important moment in the product:

> Open the Reader and tap a word. The word becomes understandable within its actual sentence, and the Tutor continues from that exact context.

That is the "magic" the entry experience must reveal.

## 3. User problem

A new user can see many tools but may not understand:

- which tool to open first;
- how the tools connect;
- why Reader is different from an ordinary translation app;
- that tapping a word opens contextual learning;
- that Tutor knows what the learner was reading;
- how words move into My Vocab and Flashcards;
- why Speak, Grammar, Games, and the Dashboard remain useful;
- whether account creation is required before experiencing value.

The application currently exposes too much navigation and account-related interface before the learner experiences its differentiating feature.

The goal is not to remove tools. The goal is to make the first step obvious and reveal the remaining tools progressively.

## 4. Existing evidence

### Toby's product direction

- Language Threshold originally began with Reader.
- Tutor emerged from clicking a word inside Reader.
- Reader → word → contextual Tutor is the core product experience.
- Every major tool has a learning purpose and should be evaluated before removal or de-emphasis.
- Flashcards are valuable but not more important than the complete learning system.
- The product should feel brighter, more inviting, and easier to begin.
- The signature interaction should be recorded for future advertisements.

### Child usability evidence

- Getting started felt complicated.
- Flashcards became enjoyable once reached.
- Brighter colors were requested.

Treat this as important usability evidence, not a request to make the product childish.

### Claude's mobile review

Claude tested eight production flows at a mobile viewport and found:

1. The "Save your progress" banner occupies approximately 12% of many screens and visually competes with the learning content.
2. The floating Ask Tutor control overlaps Reader text, Dashboard cards, and Games information.
3. Developer language appears to learners: `FILTER CHECK · No active module — filter inactive`
4. Grammar can remain on "GENERATING LESSONS…" without explaining what is happening or how long it may take.
5. Onboarding role cards are already effective.
6. Flashcards have a strong hierarchy.
7. Speak has a good empty state.
8. The theme toggle and contrast improvements are positive.
9. Automated failures when tapping Games or Dashboard were selector problems, not confirmed application failures.

### Codex's source/product review

Codex identified the Reader, Word Card, Tutor, vocabulary, and practice continuity as the primary differentiator. The toolkit should be presented as a connected learning system rather than unrelated tabs.

## 5. Prerequisites

Before implementation:

1. Complete `DUO-001`, restoring usable Vercel previews.
2. Verify the current GitHub `main` commit.
3. Verify the production commit and deployment.
4. Inspect all recent Claude theme, lighting, color, or contrast changes.
5. Preserve accepted work already completed.
6. Confirm both agent branches begin from the same commit.
7. Confirm neither branch contains unrelated uncommitted work.
8. Record the baseline in the Rosetta task folder.

Do not use an outdated SHA from this PRD without verifying GitHub.

## 6. Duo operating protocol

### Branches

```text
claude/usability-onboarding
codex/usability-onboarding
integrate/usability-onboarding
```

Claude and Codex must start from the same verified baseline.

### Independent phase

Claude Code and Codex must independently:

1. Read this shared brief.
2. Inspect the live application.
3. Inspect the relevant source.
4. Inventory every learner-facing tool.
5. Write their own plan.
6. Identify the product reasoning behind their proposed design.
7. Mark their work `independent-complete`.

During this phase:

- Claude writes only `CLAUDE_PLAN.md`.
- Codex writes only `CODEX_PLAN.md`.
- **Claude does not read `CODEX_PLAN.md`.**
- **Codex does not read `CLAUDE_PLAN.md`.**

Shared facts may be corrected in `BRIEF.md`, but proposed solutions remain independent.

### Implementation phase

Each agent may implement its own approach on its own branch. Each implementation should have its own Vercel preview. Neither agent may copy the other implementation before completing its own result.

### Cross-review

After both results are independently complete:

- Claude reviews Codex's branch and preview.
- Codex reviews Claude's branch and preview.
- Each identifies genuine strengths, risks, regressions, and ideas worth combining.
- Create `SYNTHESIS.md`.
- Toby chooses Claude, Codex, a hybrid, or further investigation.

Do not create the integration branch until Toby selects the direction. The implementation that is not chosen should become the primary independent QA perspective.

## 7. Required tool inventory

Before recommending navigation or onboarding changes, inspect every registered application tool and route.

At minimum: Reader, Word Card, Tutor, My Vocab, Flashcards, Speak, Grammar, Games, Dashboard, onboarding and role selection, account/progress-saving experience, and any additional active learner-facing modules found in source.

For each tool, document:

```text
Tool name:
Intended learner problem:
Why Toby likely built it:
What learning stage it supports:
What information it receives:
What information it produces:
How it connects to other tools:
Current entry point:
Current mobile usability:
What is already strong:
What is confusing:
Recommended change:
Keep, revise, combine, or defer:
```

**Do not remove or hide a tool solely because it receives less immediate attention than Flashcards.**

## 8. Required product changes

### 8.1 Simplify the initial entry

The first screen should answer: What is Language Threshold? What should I do first? What happens when I begin?

Provide one dominant first action, likely `Start Reading` or `Try the Reader`. The secondary action can allow users to explore all tools.

Communicate the signature interaction in plain language: *Open something you want to understand. Tap any word. Ask Tutor about it. Save it and practice it.*

Retain the useful onboarding role cards, but prevent them from becoming a barrier between the user and the first learning experience. Role selection should be quick, skippable when possible, remembered, and clearly connected to personalization.

### 8.2 Reach value quickly

A new learner should reach the first contextual word explanation within approximately 30–60 seconds.

Investigate providing a ready-to-use sample passage so a learner does not have to upload, paste, configure, or search before trying Reader. If guest or local-state support already exists, use it. Do not introduce a large authentication rewrite during this task.

### 8.3 Reveal the signature loop

When the learner first enters Reader, provide a subtle prompt such as `Tap any word to understand it here.`

After the first tap: make the selected word clear; show the explanation in the sentence's context; make Ask Tutor discoverable; explain that Tutor continues from the selected sentence; make saving the word to My Vocab understandable; show where future practice will occur.

Avoid a long tutorial that blocks interaction. Use contextual, dismissible guidance triggered by real actions.

### 8.4 Preserve contextual continuity

The following context must survive Reader → Tutor: selected word; full sentence; surrounding passage where appropriate; learning language; learner level or role where available; existing explanation; prior relevant Tutor context.

The Tutor must not behave like an unrelated blank chatbot after a word is selected.

### 8.5 Correct the progress banner

The "Save your progress" interface must not dominate every screen. Recommended: show the fuller explanation initially when appropriate; allow dismissal; collapse to a one-line chip after dismissal or first meaningful interaction; remember dismissal; provide a clear sign-in or save action without obstructing learning; do not repeatedly reopen on every tab.

The prompt should appear after the learner experiences value, not before every learning action.

### 8.6 Correct Ask Tutor overlap

The Ask Tutor control must never cover Reader text, Flashcards, Games statistics, Dashboard cards, buttons, or bottom navigation.

Evaluate: docking Tutor into the bottom navigation/control strip; reserving bottom scroll space; respecting mobile safe areas; moving the control contextually when the keyboard opens; using a persistent but non-obstructive action.

Required result: `No important content can scroll underneath an unreachable Tutor control.`

### 8.7 Remove developer language

Hide learner-facing diagnostic text such as `FILTER CHECK · No active module — filter inactive`.

Diagnostic information may appear only in development mode, in logs, or behind an explicit internal debug flag. If a filter is actively affecting learner content, replace diagnostics with plain learner language.

### 8.8 Improve Grammar loading feedback

Replace an indefinite loading message with a state explaining: what is being generated; that it may take a short period; whether progress is continuing; what the learner can do while waiting; how to retry after a genuine timeout or error.

Do not display a fabricated percentage. A staged status is acceptable (`Preparing your lesson… / Building examples… / Almost ready…`). Provide an actionable failure state.

### 8.9 Explain each tool's purpose

Every main tool should have a concise explanation of why it exists, in learner language, not feature language. Starting points (not mandatory final copy):

```text
Reader — Understand real text one word and sentence at a time.
Tutor — Ask questions about exactly what you are learning.
My Vocab — Keep the words that matter to you.
Flashcards — Strengthen recall before you forget.
Speak — Practice turning recognition into spoken language.
Grammar — Discover the patterns behind what you are reading.
Games — Build speed and confidence through short challenges.
Dashboard — See what you have learned and what to practice next.
```

The final language should emerge from each agent's independent review.

### 8.10 Make the toolkit feel connected

Communicate progression between tools: Reader word saved → My Vocab; My Vocab word → Flashcards; Flashcard weakness → recommended practice; Reader sentence → Tutor; vocabulary/grammar pattern → Speak; learning activity → Dashboard.

**Do not claim connections the application does not actually support.** If a connection is aspirational, document it as future work.

## 9. Visual direction

The update should feel brighter, more energetic, premium, inviting, modern, clear on mobile, and appropriate for both younger and adult learners. **Do not turn the application into a children's game.**

Explore a restrained semantic color system where different learning activities have recognizable accents without becoming visually chaotic.

Requirements: retain accessible text contrast; preserve working light and dark themes; preserve recent contrast/theme improvements; avoid excessive gradients and glowing effects; avoid color as the only indicator of meaning; keep content more visually important than account banners or navigation chrome; use animation only when it helps explain transition or success.

Claude's current lighting/color work must be inspected and reconciled rather than overwritten.

## 10. Mobile requirements

Test at minimum `390 × 844` and `430 × 932`, plus one desktop viewport.

Confirm: primary actions thumb-reachable; bottom navigation does not obscure content; Tutor does not overlap content; keyboard opening does not trap controls; modals and Word Cards fit the viewport; scrolling natural; role selection usable; sample Reader content opens; all tool tabs reachable; dismissal states persist; browser back behavior understandable; screen-reader labels exist for icon-only actions; touch targets sufficiently large.

**Do not report a tab as broken based only on a fragile automated selector.** Confirm failures with real coordinate taps or manual interaction.

## 11. Advertising screen capture

Create a clean recording of the signature experience:

```text
Open Language Threshold → enter Reader → view a natural passage → tap one meaningful word
→ see the contextual Word Card → open Tutor from that word → ask a sentence-aware question
→ receive a useful answer → save the word → show it available for practice
```

Deliverables:

```text
marketing/reader-tutor-demo/SCREENPLAY.md
marketing/reader-tutor-demo/SHOT_LIST.md
marketing/reader-tutor-demo/CAPTION_COPY.md
```

Record one vertical mobile version and one clean landscape master when practical; ~30–45 seconds; no personal information; no production user information; no browser errors; no developer console; no private environment values; no fake interaction.

Suggested structure:

```text
0–4s:   "Reading another language shouldn't stop at translation."
4–10s:  Open a real passage in Reader.
10–16s: Tap a word and reveal its meaning in context.
16–26s: Ask Tutor why the word is used that way in this sentence.
26–34s: Save the word to My Vocab.
34–42s: Show it ready for targeted practice.
Final:  "Understand it. Ask about it. Remember it. Use it."
```

Do not commit a large raw video into Git history. Store the recording in an approved artifact location and link it in `FINAL_HANDOFF.md`.

This task produces advertising source material; it does not authorize publishing an advertisement.

## 12. Non-goals

Do not: remove valuable learning tools; rebuild the entire application architecture; replace the authentication system; redesign the marketing website; change subscription pricing; add a new database; change production Supabase data; expose service-role credentials to previews; implement every aspirational connection between tools; merge directly to `main`; deploy Production without Toby's approval.

## 13. Verification flows

Each agent must test these flows on its own preview:

1. **New learner** — open preview → understand the product → identify the first action → begin Reader
2. **Signature interaction** — Reader → tap word → contextual Word Card → Tutor → contextual answer
3. **Vocabulary continuity** — save word → find in My Vocab → locate corresponding practice path
4. **Flashcards** — open → understand due count → enter a deck → complete a card interaction
5. **Speak** — open → understand the empty state → identify how to begin
6. **Grammar** — open → request/generate content → understand loading state → verify success or actionable failure
7. **Games and Dashboard** — open each tab using real taps → confirm content accessible → confirm Tutor does not overlap
8. **Progress prompt** — dismiss or collapse → change tabs → reload → confirm appropriate persistence
9. **Mobile obstruction** — inspect the bottom portion of every primary screen; confirm no controls cover meaningful content
10. **Themes** — test light and dark for contrast, consistency, and brighter treatment

## 14. Technical validation

```bash
npm run rosetta:check
npx tsc --noEmit
npm run lint
npm run build
```

If an existing unrelated failure occurs: identify it precisely; prove whether it predates the branch; do not conceal it; do not expand scope without approval.

**Record exact results rather than saying only "tests passed."**

## 15. Acceptance criteria

Ready for Toby's selection when:

1. Both independent plans exist.
2. Both agents truthfully record that they did not read the other plan prematurely.
3. Both branches start from the same verified baseline.
4. Both implementations have usable preview links.
5. A new learner has one obvious first action.
6. The Reader interaction is demonstrated within 30–60 seconds.
7. Tapping a word clearly exposes contextual value.
8. Tutor retains the selected word and sentence context.
9. The progress banner no longer dominates every screen.
10. Ask Tutor does not cover content.
11. Developer filter language is removed from learner views.
12. Grammar provides meaningful loading and failure feedback.
13. Every legitimate tool has been reviewed and its purpose documented.
14. Flashcards retain their strong hierarchy.
15. Speak retains or improves its strong empty state.
16. The visual system is brighter without losing contrast or maturity.
17. Mobile flows work with real taps.
18. The advertising screenplay and shot list exist.
19. A clean Reader → word → Tutor recording is produced.
20. Claude and Codex complete cross-reviews.
21. `SYNTHESIS.md` explains agreements and disagreements.
22. No production deployment or merge occurs without Toby's approval.

## 16. Required handoff from each agent

Report: branch; starting commit; ending commit; preview URL; files changed; flows tested; automated checks; screenshots or recordings; accessibility findings; what improved; what remains confusing; product decisions made; technical compromises; regressions found; what the other agent should examine; whether Production and GitHub remain unchanged.

The final handoff must make it possible for Toby to compare both approaches without reading every commit.

## 17. Decision expected from Toby

```text
Option A — Claude implementation
Option B — Codex implementation
Option C — Explicit hybrid
Option D — Additional investigation
```

For a hybrid, specify exactly: which entry experience; which visual system; which progress-banner behavior; which Tutor docking behavior; which tool explanations; which onboarding guidance; which implementation branch or commits supply each element.

Only after Toby records the decision may the integration branch be created.
