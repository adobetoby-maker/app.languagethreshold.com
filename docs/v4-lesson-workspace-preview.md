# V4-style PWA lesson workspace

An open Core 60 lesson becomes the main workspace. The course button returns to its overview; the header menu opens the existing app drawer; the information button opens the lesson goal. Six practice modes remain at the bottom across phone, tablet, and desktop widths. Normal app navigation returns when the learner exits.

The existing lesson reading, word list, practice components, speaking missions, lesson links, mastery confirmation, account gates, and progress scope are retained. Mode segments indicate visits, not correctness or mastery. Optional course promotion is hidden during a lesson, and supplementary scene/verb practice follows the reading. Mode changes animate the visible panel without changing its React identity; reduced-motion preference disables the animation.

## Public preview

`/demo/lesson-workspace` is a separate interactive preview using the shared lesson header and mode bar plus published Foundation Roofing lesson 1 material. Demo practice is temporary and does not write account progress. It does not simulate AI responses or bypass authentication. Follow the actual-lesson link to try the production activity components on the branch deployment.

## Verification

- Unit suite: 2,970 passed.
- TypeScript and changed-file lint passed.
- Ten existing lesson-flow browser cases passed across desktop and phone-sized Chrome: plan entry, inline reading, speaking mission entry, next-step scrolling, previous/next lesson navigation. The local runner logged worker-shutdown timeouts outside passing test cases.
- Four focused reading/workspace cases passed cleanly after the final layout adjustment. These check details/menu controls, restoration on exit, no automatic mastery, reduced motion, and light/dark screenshots.
- Fable 5.2 at max effort reviewed the shared chrome. Its findings led to a scrolling header on short screens, measured sticky-header scroll clearance, and explicit focus return after closing details or navigation.
- Public demo browser coverage checks all six modes, retained temporary drafts, fetch recovery, theme changes, reduced motion, short landscape screens, and absence of account/progress requests.
- Physical iPhone Safari and installed-PWA acceptance remains an owner review step. No native V4 project, lesson source data, subscription configuration, or production deployment was changed by this PR.

Run the focused cases with the repository public-env helper and Playwright:

```sh
node scripts/with-supabase-public-env.mjs npx playwright test e2e/core30-plan.spec.ts --project desktop --project iphone-pwa --grep 'V4 lesson workspace'
```
