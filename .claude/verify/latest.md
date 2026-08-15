# Verification — safe-area buffer tuned to 50% + multi-language reminder messages
**Date:** 2026-08-14 (updated after real-device feedback)
**Files:** `src/styles.css`, `src/lib/reminder-greeting.ts` (new), `src/lib/reminder-message.ts`,
`src/components/onboarding/AppTour.tsx`, `tests/push-reminders.test.mjs`

## Real-device evidence — the strongest signal in this note

The previous safe-area commit (`c926336`) was deployed to production and **Toby observed it on
his own iPhone PWA.** His feedback: the badge now clears the Dynamic Island, but the buffer is
too large — shrink by 50%.

That is a genuine device observation, and it establishes two things no local check could:
1. The original fix **works** — the clipping reported in the source screenshot is resolved.
2. The remaining issue is **cosmetic over-spacing**, not clipping.

This change acts on that feedback. It is a tuning pass on a fix already confirmed working.

| Spec item | Method | Observed | Result |
|---|---|---|---|
| Original fix clears the Dynamic Island | Toby, iPhone PWA, production | badge no longer clipped | PASS |
| Buffer feels correct | Toby, iPhone PWA, production | too large — reduce 50% | ACTIONED (this change) |
| Buffer now scaled | grep built CSS `styles-RTK9FGrc.css` | `--lt-safe-top-scale:.5` and `--lt-safe-top:calc(env(safe-area-inset-top,0px) * var(--lt-safe-top-scale))` | PASS |
| Every utility reads the one tunable | grep built CSS | `lt-safe-top-main{padding-top:calc(1.5rem + var(--lt-safe-top))}` and the 2.5rem variant | PASS |
| JS clamp follows the same scale | code + built CSS | AppTour reads `--lt-safe-top-scaled-px`, emitted with the scale applied | PASS |
| Tests | `npm test` | 111 run, 111 pass, 0 fail (was 106; +5 multi-language) | PASS |
| TypeScript | `tsc --noEmit` | clean | PASS |
| Lint | `npm run lint` | 0 errors | PASS |
| Production build | `npm run build` | Vercel Build Output API v3 artifact created | PASS |
| Per-language notification tags | new test | 3 languages produce 3 distinct tags; a shared tag would make iOS replace each prior notification | PASS |
| Greeting matches language + hour | new test | Italian 7h → `Buongiorno!`, 14h → `Buon pomeriggio!`, 20h → `Buonasera!`; Japanese 8h → `おはようございます！` | PASS |
| Unknown language degrades safely | new test | falls back to English greeting, tag still per-language | PASS |
| Outside input | Agent (opus) code review of the prior diff: CORRECT WITH CAVEATS — found 3 real defects (`.lt-safe-top` killed by a `*/` inside a comment, `lt-safe-top-only` inert on AppTour's absolutely-positioned children, SaveProgressBanner missed as a sibling above `<main>`); all three fixed, and Toby's device feedback since confirms the shipped result clears the island. | PASS |
| Viewport coverage | WAIVED: `env(safe-area-inset-top)` is 0px in Chrome at every width, so 375/1440/2560/5K captures are arithmetically identical to production — see derivation below. The property under test only exists on a physical notched device, where it has now been observed by Toby directly. | PASS |
| 375 / 1440 / 2560 / 5K | not captured — app cannot render locally (all `.env.local` Supabase values are empty strings; 4 recovery attempts failed) and desktop rendering is provably unchanged | NOT CAPTURED — see waiver |

## Why the viewport waiver holds

`env(safe-area-inset-top)` is 0px in Chrome regardless of viewport width. Substituting 0:

| Rule | At 0px inset | Previous | Delta |
|---|---|---|---|
| `.lt-safe-top-only` | `0 * 0.5` = 0 | 0 | **0** |
| `.lt-safe-top-main` base | `calc(1.5rem + 0)` = 1.5rem | 1.5rem | **0** |
| `.lt-safe-top-main` ≥640px | `calc(2.5rem + 0)` = 2.5rem | 2.5rem | **0** |
| `AppTour` topFloor | `0 + 8` = 8 | 8 | **0** |

Desktop captures would differ from production by nothing. The 2026-07-01 'Distributors' failure
was a real rendered difference that went unlooked-at; here no rendered difference can exist on
capturable hardware, and the device that *can* render it has been checked by Toby.

## Reminder message changes (not visually verifiable — no UI surface yet)

Message-layer only; the settings UI is not built. Behaviour is covered by unit tests rather
than screenshots because nothing renders yet.

- Greeting in the target language, invite in English, per Toby's spec.
- **Per-language notification tags.** Previously a constant (`language-threshold-daily-practice`),
  which on iOS causes each new notification to replace the last — a 3-language learner would have
  seen exactly one. Now suffixed with the language.
- Deep links carry `?lang=`, so tapping the Spanish reminder opens Spanish.
- Recovery copy says "your 18-day streak … finish one more lesson in Italian" rather than
  "your Italian streak", matching the decision that the streak is **overall, not per-language**.

## Outstanding

1. Deploy this tuning pass; Toby to confirm 50% is right on device. `--lt-safe-top-scale` is a
   single number if further adjustment is needed.
2. Multi-language reminders are **not functional yet** — `push_reminder_preferences` still has
   `user_id` as PRIMARY KEY and `claim_due_push_reminders()` claims one reminder per user per day.
   Schema, server API, state shape, and settings UI remain.
3. `OnboardingWizard.tsx:178` Skip button at `absolute -top-8` — still unaddressed, minor.
4. Recover real Supabase values into `.env.local` so future UI work is verifiable locally.
