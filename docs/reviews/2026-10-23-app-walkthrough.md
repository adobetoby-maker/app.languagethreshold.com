# App walkthrough review — 2026-10-23

The previous 15-stop tour described sidebar icons without opening the corresponding screen on Next. Its Go there action closed the tour, hidden mobile sidebar targets had no useful spotlight, and some text described Word Match as spaced repetition.

The replacement is a persistent, nonmodal guide above the actual tab content. It shows a five-stop learning loop (Reader, Flashcards, Games, Speak, Dashboard), preceded by a lesson-path stop when the selected module has a curriculum. Back/Next use normal navigation. Play is opt-in and advances every nine seconds after the tab chunk loads; Pause, outside interaction, manual navigation and hiding the document stop playback. Exit/Escape/Finish return to the launching tab. Starting again restarts the sequence; account/module/language changes discard the old session. Existing access checks remain in place, and no demo action submits a lesson, starts a microphone or sends an AI conversation.

Validation:

- 2,350 Node tests pass.
- Typecheck and changed-file lint pass without errors/warnings.
- Playwright: six pass including setup; one desktop-navigation-only case intentionally skipped on phone. Covers Roofing's six real tabs on desktop and iPhone-sized Chromium, nonempty lesson-record preservation, multi-screen autoplay, pause, timer cancellation on exit, manual navigation pause, restart and the five-stop core sequence.
- Normal Chrome guest session manually clicked Reader → Flashcards → Games → Verbs → Speak → Dashboard; walkthrough persisted. Final demo reopened on Reader. No practice responses submitted.
- Reviewed captures at 390×844, 768×1024, 1440×900 and 1920×1080: controls fit, background screen remains usable, one walkthrough panel. Captures retained locally in /Users/drive/git-backups/app-demo-review/.
- Stage build and Vercel artifact validation pass (26.29 MiB server bundle). Existing dependency/build deprecation and side-effect warnings remain.

This change is prepared for review, not merged or deployed. Phone validation used Chromium emulation, not physical iPhone Safari. No database, credentials or progress-reset changes.
