# Practice time bar

Owner request (2026-10-22): a thin progress bar that builds left to right so learners can see their work. Owner chose **today's practice time**, toggled **on/off in settings**, shipped **after the Friday demo** (branch only until then).

## Behavior
- 3px bar, gold accent (`bg-gold` / existing token), track at low-opacity border color. Fills left to right with today's active practice time / daily goal.
- Placement (after main's navigation change): the phone's primary nav (`AppSidebar.tsx`, `fixed`, now `desktop:hidden`) and the desktop `TopNav` header (`sticky`) are the persistent app bars. `<PracticeTimeBar edge="nav" />` sits on the nav's top edge, `<PracticeTimeBar edge="header" />` on the header's bottom edge, both absolute (no added height). Only the one matching the `desktop` media query renders, so the page holds exactly one bar. `<PracticeTimeTicker />` is mounted once in `AppSidebar` and owns the single 1s ticker.
- Settings: main moved device preferences to the phone "App settings" sheet (`AppSidebar.tsx`) and the desktop "Learning settings" popover (`TopNav.tsx`). `PracticeBarSetting` (switch, daily goal, "Today: N of M min") sits in both; the Dashboard card is gone.
- `AppGuide.tsx`: "How Core 30 works" is read in render and spent in an effect. The old render-phase `removeItem` lost the request when React retried a discarded render, which the once-a-second bar updates exposed (core30-plan 7d).
- Counting: idle counts while `now - lastInteraction < 60s` (exactly 60s idle stops). The interaction clock starts at app load. No counting while the bar is switched off. A learner must act once after load before any second counts (the interaction clock is module-level and starts empty, so remounts earn nothing). While `SubscriptionGate` shows a blocking screen (paywall overlay, missionary inline reminder, Foundation sign-in prompt) it renders `<PracticeBlocker />`; the bar is hidden and the ticker does not count. The gate still renders children blurred under the paywall, so the blocker, not unmounting, is the signal.
- Goal clamp snaps to the nearest of 5/10/15/20, ties go lower, junk becomes 10. Prune keeps today plus the 13 days before it.
- Cross-window: a re-read (tab visible, `storage` event) merges storage into memory taking the max seconds per day; settings come from storage. A failed read never wipes in-memory data.
- Goal pulse is a single Web Animations opacity pulse, only when one ticker beat (+1 second, same goal) crosses the goal; never on the first client value, a reload or a goal change; skipped under `prefers-reduced-motion`.
- Track is `bg-foreground/25`. The bar stays `pointer-events-none` with no tooltip.
- The e2e spec seeds its own state and needs no `setup` project; run it through `scripts/with-supabase-public-env.mjs` or the app hangs on loading.
