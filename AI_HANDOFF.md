# Language Threshold — Shared AI Handoff

> This is the live coordination record for Toby, Claude Code, and Codex.
> Read it before starting work and update it before ending a work session.

**Last updated:** 2026-07-26 09:25 America/Boise  
**Product owner:** Toby Anderton  
**Production:** https://app.languagethreshold.com  
**Canonical repository:** `adobetoby-maker/app.languagethreshold.com`  
**Production Vercel project:** `language-threshold-app`  
**Production branch:** `main`  
**Current shared initiative branch:** `codex/usability-onboarding`

---

## 1. Product North Star

Language Threshold is not a generic collection of language games. It helps a learner cross the threshold from recognizing language to using it in a real situation—especially professional, mission-specific, and personally meaningful situations.

The signature product loop is:

**Reader → tap any word → sentence-aware Word Card → Ask Tutor with context preserved → My Vocab → targeted practice → real-world use**

This continuity is the magic. The selected word remains connected to its sentence, passage, language, learner level, professional module, active grammar patterns, and saved vocabulary.

### Product rule

Do not remove strong tools merely to make the interface appear simpler. Reduce competing chrome, explain the relationship among tools, and reveal advanced tools progressively.

---

## 2. Roles

| Participant | Role | Primary contribution |
|---|---|---|
| Toby | Product owner and final decision maker | Intent, real-world usefulness, priorities, acceptance |
| Claude Code | Builder and independent product/UX critic | Implementation speed, production testing, broad live-flow review |
| Codex | Independent product/architecture critic and builder | System relationships, source-grounded review, onboarding/tool orchestration |

Claude and Codex are intentionally allowed to think differently. Disagreement is useful when it is documented with evidence. Neither agent should silently overwrite the other agent’s active work.

---

## 3. Required Session Contract

Every work session should establish the following before editing:

- **ROLE:** Who is acting and from which branch/worktree?
- **OBJECTIVE:** What outcome is being pursued?
- **CONTEXT:** What product evidence or user feedback motivates it?
- **CONSTRAINTS:** What files, flows, or concurrent work must not be disturbed?
- **OUTPUT CONTRACT:** What files, tests, screenshots, deployment, and handoff update will prove completion?

At session end, append a short entry under **Session Log** covering:

1. What changed?
2. What was verified?
3. What remains?
4. What branch and commit contain the work?
5. What should the next agent know before touching it?

---

## 4. Coordination Rules

1. `main` is production. Do not use it as a casual working branch.
2. Each implementation effort uses a named branch. Push early enough that the other agent can inspect it.
3. Before editing, read this file, `CLAUDE.md`, `README.md`, and relevant source files.
4. Add or update an entry in **Active Work** before changing overlapping surfaces.
5. If another agent owns the same files, inspect their branch/commit and coordinate before editing.
6. Keep commits small and intention-revealing.
7. Every non-production branch should receive a Vercel preview through Git integration.
8. Merge only after relevant automated checks and live viewport verification pass.
9. Update this handoff in the same branch/PR as the work it describes.
10. Facts in current source and deployment metadata supersede stale historical notes.

---

## 5. Current Deployment State

- Vercel Git integration was connected on 2026-07-26.
- Commit `e131d9a` triggered a clean Git-sourced production deployment.
- `app.languagethreshold.com` is aliased to the Vercel project `language-threshold-app`.
- New pushes to `main` deploy production automatically.
- New commits on feature branches should create preview deployments.
- Historical CLI deployments may show `gitDirty: 1`; do not use those as a source baseline.

### Current source baseline

`e131d9a808f49a25de6007d93e3c0ea8fdc5a5eb` — `chore: verify Vercel git auto-deploy`

---

## 6. Current Initiative: Usability and Onboarding

### Objective

Make the strongest learning experiences immediately understandable without weakening or deleting the broader toolkit.

### Current evidence

#### Claude live mobile review

- Walked eight production flows at a mobile viewport and performed coordinate-tap verification.
- **P0:** “Save your progress” occupies roughly 12% of every captured screen and visually dominates content.
- **P0:** Ask Tutor overlaps Reader text, Games statistics, and a Dashboard card.
- **P1:** `FILTER CHECK · No active module — filter inactive` exposes developer language to learners.
- **P1:** Grammar’s `GENERATING LESSONS…` state gives no time expectation.
- Strong experiences: onboarding role cards, Flashcards hierarchy, Speak empty state, theme toggle, and improved contrast.
- Games/Dashboard tap failures were test-script selector failures; real coordinate taps work.
- Verification gate cleared across four viewports with outside review.

#### Codex source and product review

- The core differentiator is contextual continuity, not any single drill.
- The Word Card carries a Reader word and sentence into Tutor, pronunciation, My Vocab, and Flashcards.
- The Tutor also receives passage, learner level, native language, module/role context, saved vocabulary, and active patterns.
- The tools solve different transfer problems: exposure, recognition, structure, listening, production, pressure recall, and real-world field use.
- Navigation currently presents tools too flatly and under-explains their relationship.
- App Guide blurs Word Match with true scheduled Flashcards and omits several high-value tools.
- The first-run experience should demonstrate Reader → word click → Tutor → My Vocab before exposing the full toolkit.

### Agreed priority order

1. Collapse or demote the persistent Save Progress banner.
2. Prevent Ask Tutor from covering content; dock it or reserve reliable content clearance.
3. Hide inactive developer filter messaging.
4. Add a useful Grammar generation expectation and recovery state.
5. Rebuild first-run guidance around the signature Reader/Word Card/Tutor loop.
6. Organize tools by learning purpose and recommended next step without removing them.
7. Capture the signature loop for future advertising after visual changes stabilize.

---

## 7. Active Work

| Owner | Branch | Scope | Files/surfaces | Status | Last update |
|---|---|---|---|---|---|
| Codex | `codex/usability-onboarding` | Shared handoff and merged usability direction | `AI_HANDOFF.md` | In progress | 2026-07-26 |
| Claude Code | Add branch/commit here | Recent theme/contrast work and mobile live-flow review | Mobile chrome, theme, production verification | Review complete; implementation status to be added | 2026-07-26 |

Agents: update this table before beginning overlapping edits.

---

## 8. Decisions

| Date | Decision | Why | Owner |
|---|---|---|---|
| 2026-07-26 | Keep the full toolkit | Tools train different stages of language transfer; the problem is presentation, not lack of value | Toby |
| 2026-07-26 | Treat Reader → Word Card → Tutor as the signature loop | It preserves context and naturally feeds vocabulary retention and later practice | Toby |
| 2026-07-26 | Claude and Codex both review/work the product | Their different reasoning styles are intentionally complementary | Toby |
| 2026-07-26 | Use a shared repository handoff | Prevent duplicate work, hidden decisions, stale assumptions, and branch collisions | Toby |
| 2026-07-26 | GitHub is the source of truth and Vercel deploys from Git | Eliminates dirty CLI/source ambiguity and enables previews | Toby |

---

## 9. Verification Contract

Before calling a usability change complete:

- Run the repository’s relevant typecheck, lint, and build commands.
- Verify at desktop and representative mobile widths.
- Use coordinate taps when automated accessible-name selectors are ambiguous.
- Confirm Reader word click, Word Card, Ask Tutor, My Vocab, Flashcards, Games, and Dashboard remain operable when affected.
- Check that fixed chrome does not cover scrollable content or device safe areas.
- Confirm preview deployment commit SHA matches the branch commit.
- Record what was not tested.

---

## 10. Open Questions

- Should Ask Tutor become part of the bottom strip, a collapsible dock, or a floating control with universal reserved padding?
- After first dismissal, should Save Progress become a one-line chip, an account icon indicator, or disappear until meaningful unsaved progress exists?
- Should onboarding launch directly into a seeded Reader passage for every role, or use a brief role-specific transition first?
- Which professional scenario should become the first filmed advertisement: orthopedics, missionary, trades, or general travel?
- Should the old mirror repository and stale Cloudflare deployment files be formally retired?

---

## 11. Session Log

### 2026-07-26 — Codex

- Recovered the earlier Rocket Fuel/Rosetta Stone coordination protocol.
- Combined Claude’s live usability findings with Codex’s source/product analysis.
- Established this shared handoff on `codex/usability-onboarding`.
- Confirmed GitHub-triggered Vercel production deployment from `main` at `e131d9a`.
- No application code changed in this session entry.

### Handoff entry template

```md
### YYYY-MM-DD HH:MM — Agent

- ROLE:
- OBJECTIVE:
- CONTEXT:
- CONSTRAINTS:
- OUTPUT CONTRACT:
- Changed:
- Verified:
- Branch/commit:
- Remaining:
- Next-agent warning:
```
