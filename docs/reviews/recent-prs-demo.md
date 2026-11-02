# Recent PR integration review — 2026-11-02

Baseline: main 475c588ebad14fd309b4a1274ea116234566b031.

- #65 is merged and retained.
- #66 is partially represented in main: exact-pair authored words and lesson remounting exist. Integrated remaining language-role helper, documentation, tests and short-phone card frame; kept main Spanish-pattern vocabulary and phrase handling.
- #80 grouped navigation and left drawer are absent from main. Integrated options while retaining main moreView settings behavior, menu event, scrollBody and NativeLanguage control.
- #81 deferred game providers and timing bridge are absent from main. Integrated while retaining current identity remount, mission menu and selected-module startup.
- #82 focused streak panel/reminder copy is absent from main; integrated.
- #83 optional partner-line translation/feedback controls are absent from main; integrated with current speaking layout.

Conflicts resolved on this combined preview branch, not by overwriting original PR branches. Generated SEO dates are regenerated from the combined source rather than restored from old branches. No production merge requested by this preview task.

Demo entry: /review-demo.html. Speaking needs authenticated acceptance; no fabricated conversation is used.

## Verification

- 2,837 unit tests passed; TypeScript passed; lint had warnings only.
- Stage build, deployment-target guard and Vercel artifact verification passed.
- Original focused browser run: 16 passed, one skipped, one failed because the old Core test clicked a hidden legacy tab. Updated it to use the visible Recall Cards control and measure available viewport space when the bottom navigation is hidden. Rerun: Core multi-language phone check passed (ten target languages plus Roofing/Nursing, 320×568 and 375×667); speaking phone rerun passed all three checks.
- Hosted 390×844 checks: demo hub and left drawer have no horizontal overflow and no page errors; demo endpoint returns HTTP 200.
- Pinned preview: https://language-threshold-fk6aiddfj-adobetoby-5572s-projects.vercel.app/review-demo.html (application commit 1f476cb1d470a29051b36fe8d14e92765c00120f; subsequent edits only update test/docs files).
- Signed-in live AI conversation acceptance remains pending.
