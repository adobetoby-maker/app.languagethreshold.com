# Practice time bar

Owner request (2026-10-22): a thin progress bar that builds left to right so learners can see their work. Owner chose **today's practice time**, toggled **on/off in settings**, shipped **after the Friday demo** (branch only until then).

## Behavior
- 3px bar, gold accent (`bg-gold` / existing token), track at low-opacity border color. Fills left to right with today's active practice time / daily goal.
- Placement: the chip row and bottom tab row live in `AppSidebar.tsx` (`<nav aria-label="Primary">`, `position: fixed`, shown on phone and desktop). `<PracticeTimeBar />` is rendered once as the first child of that nav and is an absolute child at `-top-px`, so it covers the nav's top border and adds no height. It also owns the single 1s ticker. The desktop `TopNav` header is not used; one placement rule on both viewports.
- Settings: guests cannot open `/account` (sign-in wall), and push reminders already live on the Dashboard tab, so the switch and goal select are a `PracticeBarSetting` card under the reminder row in `dashboard/Dashboard.tsx`.
- Counting: idle counts while `now - lastInteraction < 60s` (exactly 60s idle stops). The interaction clock starts at app load. No counting while the bar is switched off. A learner must act once after load before any second counts (the interaction clock is module-level and starts empty, so remounts earn nothing). While `SubscriptionGate` shows a blocking screen (paywall overlay, missionary inline reminder, Foundation sign-in prompt) it renders `<PracticeBlocker />`; the bar is hidden and the ticker does not count. The gate still renders children blurred under the paywall, so the blocker, not unmounting, is the signal.
- Goal clamp snaps to the nearest of 5/10/15/20, ties go lower, junk becomes 10. Prune keeps today plus the 13 days before it.
- Cross-window: a re-read (tab visible, `storage` event) merges storage into memory taking the max seconds per day; settings come from storage. A failed read never wipes in-memory data.
- Goal pulse is a single Web Animations opacity pulse, only when one ticker beat (+1 second, same goal) crosses the goal; never on the first client value, a reload or a goal change; skipped under `prefers-reduced-motion`.
- Track is `bg-foreground/25`; the Dashboard card also shows a read-only "Today: N of M min" line. The bar stays `pointer-events-none` with no tooltip.
- The e2e spec seeds its own state and needs no `setup` project; run it through `scripts/with-supabase-public-env.mjs` or the app hangs on loading.
