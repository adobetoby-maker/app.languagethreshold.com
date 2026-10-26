# iPhone activity layout cleanup — 2026-10-25

## Behavior

Cards can be graded on either language face. The existing review action, scheduling, and success sounds remain in use. Lesson Recall cards also accept Again/Got it before revealing. Keyboard grades 1–4 work on either side; flip hints stay outside the card.

Phone Cards and Listening use stable working frames above the navigation. Long translations and answers scroll inside their own areas. Lesson Hear retains its answer/Next rows; Type retains its prompt, input and Check/Next positions. Repeated lesson introductions are hidden on phones where the sticky mode navigation already names the activity. Larger text can use scrolling instead of overlapping or shrinking text.

Reader starts with reading, library access, and visible voice controls; optional reading controls collapse. Its notes button sits in the library toolbar on phones, away from the passage. Reading navigation fits the phone width. More starts with account/navigation, while the Settings shortcut opens settings directly. Modules keeps search first and categories expandable. Practice Lab puts game choices before statistics. Optional purpose help follows activities.

No storage schema, migrations, account identity, reset actions, or progress algorithms were changed. Automated grading uses isolated browser fixtures. No actual customer progress was reset or deleted.

## Verification

- Phone entry audit: 31 tabs at 390×667 and 390×844, 62 cases passed. This checks entry overflow and visible control intersections, not every authenticated/AI path.
- Cards: 320×568, 375×667, 390×844; front/back grading, unchanged flip/next geometry and scroll position, lesson records unaffected.
- Listening: synthetic short/long question fixtures, stable answer/feedback/Next geometry; long text stays within its button.
- Lesson Recall, Hear and Type transitions; larger-text card fallback; Reader/More/Modules/Practice Lab entry and settings shortcut regressions.
- Existing card creation, usage translation, keyboard repeat, grading/sound settings checks retained.
- Fixed handwriting workspace and larger-text field overlap regressions retained.

Screenshots and per-page JSON are local under `/Users/drive/git-backups/iphone-cleanup-2026-10-25` and `/Users/drive/git-backups/iphone-cleanup-audit-2026-10-25`.

## Device acceptance

Browser phone emulation uses Chromium, not physical iPhone Safari. On an iPhone check: Cards flip/grade/next, Hear choose/next, Type with keyboard open, Write finger drawing, Reader next/notes/voice controls, and More versus Settings. Long libraries, passages and large-text accessibility fallbacks deliberately remain scrollable.
