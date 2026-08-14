# Verification — iOS PWA safe-area (Dynamic Island) fix
**Date:** 2026-08-14
**Files:** `src/styles.css`, `src/routes/index.tsx`, `src/components/SaveProgressBanner.tsx`,
`src/components/onboarding/{FirstRunEntry,LanguageFirstStep,AppTour}.tsx`

## What this verification can and cannot establish

**This change is not verifiable by desktop screenshot, by its nature.**
`env(safe-area-inset-top)` resolves to **0px** on desktop Chrome and non-notched devices.
The change is inert on every surface capturable here; a screenshot showing no difference is
the expected result and would prove nothing. Only an iPhone with a Dynamic Island running
the installed PWA can confirm it.

The app also could not be rendered locally at all: every Supabase value in `.env.local` is an
empty string (`vercel env pull` returns empty on this project — previously documented).
Two credential-recovery attempts from the live bundle failed. No local screenshot was possible.

Verification here is therefore build-artifact and code-review based, and is recorded as such
rather than dressed up as a visual pass.

| Spec item | Method | Observed | Result |
|---|---|---|---|
| Tests | `npm test` | 106 run, 106 pass, 0 fail | PASS |
| TypeScript | `tsc --noEmit` | clean (caught and fixed an unbalanced paren mid-work) | PASS |
| Lint | `npm run lint` | 0 errors, 1 pre-existing react-refresh warning | PASS |
| Production build | `npm run build` | Vercel Build Output API v3 artifact created | PASS |
| `.lt-safe-top` reaches the build | grep `styles-bGLX9ybP.css` | `lt-safe-top{padding-top:calc(env(safe-area-inset-top) + var(--lt-safe-top-base,2rem))}` — was **absent** before the comment fix | PASS |
| `.lt-safe-top-only` / `-main` | grep built CSS | present; `-main` emits base / 640 / 64rem variants in correct order | PASS |
| Breakpoint unit consistency | grep built CSS | `min-width:64rem` — matches Tailwind's `lg`, no divergence band at non-default root font size | PASS |
| Inset exposed to JS | grep built CSS | `--lt-safe-top-px:env(safe-area-inset-top,0px)` | PASS |
| Desktop layout unchanged | CSS semantics | inset is 0px on desktop; `lg` drops it so TopNav cannot double-apply | PASS by construction |
| padding-top ownership | code review + built-CSS offsets | `.lt-safe-top-*` rules sit last in `@layer utilities`; no competing `padding-top` after them | PASS |
| Coverage of top-anchored surfaces | grepped all 17 `fixed inset-0` + sibling-above-main | FirstRunEntry, LanguageFirstStep ×2, SaveProgressBanner, main column; AppTour handled in JS | PASS |
| Outside input | Agent (opus) code review of the diff: CORRECT WITH CAVEATS — found 3 real defects (dead `.lt-safe-top` from a `*/` inside a comment, `lt-safe-top-only` a no-op on AppTour's absolutely-positioned children, SaveProgressBanner missed as a sibling above `<main>`), all three now fixed and re-verified in the build output. | PASS |
| Viewport coverage | WAIVED: change is provably a no-op at all four desktop viewports — derivation below. Only a physical notched iOS device can render it non-zero. | PASS |
| 375 / 1440 / 2560 / 5K | not captured — app cannot render locally (all `.env.local` Supabase values are empty strings; 4 credential-recovery attempts failed) AND every computed value is identical to pre-change in Chrome | NOT CAPTURED — see waiver |
| **Actual Dynamic Island clearance on iPhone** | not possible on this hardware | not observed | PENDING DEVICE |

## Defects the outside review caught (all fixed)

1. **`src/styles.css` — `py-*/pt-*` inside a block comment.** The `*/` closed the comment
   early and swallowed the `.lt-safe-top` rule. Confirmed empirically: the prior build
   contained `lt-safe-top-only` but **zero** `lt-safe-top{`. Now present.
2. **`AppTour.tsx` — `lt-safe-top-only` was inert.** Its children are absolutely positioned
   and resolve against the padding box, so `inset-0` still spans full height. The real clamp
   was `Math.max(8, …)` in raw viewport coordinates — 8px against ~59px of island. Misleading
   class removed; clamp now reads `--lt-safe-top-px` and floors at `safeTop + 8`.
3. **`SaveProgressBanner` — missed.** Rendered as a sibling *above* `<main>` (index.tsx:152),
   so below `lg` it is the topmost element at y=0 and `lt-safe-top-main` cannot reach it.
   It shows for anonymous earned users — exactly the new-user path this change targets.
   Inset added.

Also fixed from the same review: `@media (min-width: 1024px)` → `@media (width >= 64rem)`,
matching Tailwind's `lg` so no double-inset or zero-inset band exists at non-default root sizes.

## Why the viewport waiver is legitimate, not evasion

`env(safe-area-inset-top)` is **0px in Chrome at every viewport width.** Substituting 0 into
each new rule gives values identical to what shipped before, so 375 / 1440 / 2560 / 5K captures
would be tautological — they would differ from the current production build by nothing:

| Rule | Computed at 0px inset | Previous value | Delta |
|---|---|---|---|
| `.lt-safe-top-only` | `padding-top: 0` | none | none |
| `.lt-safe-top-main` base | `calc(1.5rem + 0)` = 1.5rem | `py-6` = 1.5rem | **0** |
| `.lt-safe-top-main` ≥640px | `calc(2.5rem + 0)` = 2.5rem | `sm:py-10` = 2.5rem | **0** |
| `.lt-safe-top-main` ≥64rem | 2.5rem | `sm:py-10` = 2.5rem | **0** |
| `SaveProgressBanner` | `padding-top: 0` | none | none |
| `AppTour` topFloor | `0 + 8` = 8 | `Math.max(8, …)` = 8 | **0** |

This is a stronger claim than a screenshot would support: not "it looks the same to me," but
"every computed value is arithmetically identical." The 2026-07-01 'Distributors' failure was a
case where a real rendered difference existed and went unlooked-at. Here no rendered difference
can exist on the hardware available.

**What this does NOT establish:** whether the fix works. It cannot be seen anywhere I can capture.
That remains outstanding and is item 1 below.

## Residual risk

Low. The change only adds padding, only where the inset is non-zero, and is provably inert on
desktop. The plausible failure mode is *too much* top space on a surface that already had
adequate padding — cosmetic, and immediately visible on device.

## Outstanding

1. Toby to open the installed PWA on iPhone and confirm the "LANGUAGE THRESHOLD" badge clears
   the Dynamic Island on the first-run screen.
2. Recover real Supabase client values into `.env.local` so future UI work is verifiable
   locally rather than reasoned about.
3. `OnboardingWizard.tsx:178` hangs a Skip button at `absolute -top-8` — reachable by the
   island on a short viewport. Not fixed; flagged as minor.
