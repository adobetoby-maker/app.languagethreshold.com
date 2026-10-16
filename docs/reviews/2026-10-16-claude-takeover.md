# Claude takeover checkpoint — October 16, 2026

Toby requested a checkpoint before Claude exhausts usage. This records observed state, not a claim that Claude has stopped.

## Current Claude session

Native desktop Code session **Languagethreshold.com model upgrades** was inspected directly. Weekly usage showed **99%**, resetting Saturday October 17 at 1 PM. The session was actively working on the phone lesson layout, after its earlier freeze. It then completed its phone screenshots and committed locally as `4380fd1` (Lesson first: Core 30 at the top, dashboard panels at the bottom). Git confirms all five UI files are saved and its working tree is clean. No push, merge or deploy was performed in that checkpoint. Do not restart or duplicate that session merely because it is slow or reaches an observation timeout.

The active source is `/Users/drive/lt-worktrees/lesson-first`, branch `fix/lesson-first`, based on `777dab7`. Five modified files: AppGuide, ModuleStudyGuide, FlashcardsStudio, LessonStackCard and PracticeStreakCard. The older `/Users/drive/lt-worktrees/app-haiku-5-5` remains at `9042951` with verification/foreman artifacts only; it is no longer the current layout worktree.

Claude reported type-check, lint and 416 tests passing. Its initial phone screenshot trial encountered first-visit onboarding covering the app; it subsequently reported successful initial/started-lesson screenshots. Codex has not independently accepted those final screenshots. Its final task stopped its port 3230 dev server and made the local commit. Preserve the worktree; do not restart a server until needed. A private local patch snapshot of the five UI files is saved under the existing restricted QA directory as `claude-lesson-first-takeover.patch`.

## Changes and reconciliation

Claude moved Core 30 first and routes lesson entry links to Core 30. These overlap Codex source `77fcaee`, already staged and phone-tested. Claude additionally removes the Complete toolkit catalog and Browse specialty modules button from App Guide, following Toby's direct instruction in that session; retains setup and the bottom module-change control; and scrolls to the Core 30 section through a ref.

Codex's tested change also resets both window and main scroll on entry. Reconcile deliberately: keep catalog removal and module-change access, retain robust scroll-container behavior, keep progress/dashboard material last, and retest Landscaping and Roofing on phones. Do not blindly cherry-pick both large reorder diffs.

A checkpoint coordination message was sent to the authorized Claude session, asking it to finish/save its current task, avoid new generation/workers, preserve Codex's branch, and report commit/status. Claude acknowledged that it would commit without pushing, merging or deploying; `4380fd1` is the verified result. Its existing unsent draft was restored without being submitted. No new Claude CLI job was started.

## Authoritative Codex state

- Worktree `/Users/drive/lt-worktrees/admin-exams`, branch `codex/admin-exams`; current evidence `4a34090`, application `77fcaee`.
- Draft [PR 37](https://github.com/adobetoby-maker/app.languagethreshold.com/pull/37).
- [Latest staged preview](https://language-threshold-62e75s2px-adobetoby-5572s-projects.vercel.app): 416 tests and guarded production build passed; 390×844 lesson entry and desktop guide order verified.
- Production was last verified at `f9f8685`. The Exams branch has not replaced production; recheck before any release.
- User's supplied phone screenshots were **Landscaper on the earlier a2dcbb9 preview**, not Roofing. Landscaping Lesson 1 passage/title mismatch is recorded in the module backlog.

## Next work after checkpoint

1. Reconcile and verify the final lesson layout; release only through the guarded project pipeline and preserve gated Exams behavior.
2. Continue protected speech evidence, consent and authorized reviewer playback. Keep raw recording collection disabled until the owner approves the proposed retention policy.
3. Complete actual reviewed audio/content, qualified human curriculum/language/domain decisions, calibration/equivalence and the pilot before official exams.
4. Roofing remains the first complete module. Upgrade the other modules against the parity backlog, including lesson-specific passages, vocabulary, levels, toolkit and all three checkpoints.

Canonical progress and evidence: `docs/reviews/2026-10-15-review-and-sequence.md`; specification: `docs/prd-assessments.md`; release gates: `docs/assessments/content-workflow.md`. No credentials or private exam keys belong in this repository.

## Integrated checkpoint

Codex incorporated the catalog removal into `5ae6d93`, preserving its tested scroll-container reset and progress-last layout. The exact combined preview passed Landscaping plan/open-lesson/guide checks and Roofing open/next/previous lesson checks at 390×844. Full release pipeline passed with 416 tests. It is staged, not promoted to the live domain; see the main review ledger for URL and evidence. Claude's `4380fd1` remains intact in its own worktree.
