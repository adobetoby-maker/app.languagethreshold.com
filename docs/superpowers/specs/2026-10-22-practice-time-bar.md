# Practice time bar

Owner request (2026-10-22): a thin progress bar that builds left to right so learners can see their work. Owner chose **today's practice time**, toggled **on/off in settings**, shipped **after the Friday demo** (branch only until then).

## Behavior
- 3px bar, gold accent (`bg-gold` / existing token), track at low-opacity border color. Fills left to right with today's active practice time / daily goal.
- Placement: attached to the persistent app bar on every tab. On phone the chip bar sits above the bottom nav (TabShell) — put the line on that bar's top edge. On desktop, the same component's edge. One component, one placement rule; no layout shift (absolute positioned, no added height).
- Width transitions ~400ms ease-out; when the goal is reached, one short pulse then stays full. Respect `prefers-reduced-motion` (no transition/pulse).
- Accessible: `role="progressbar"`, `aria-valuemin=0`, `aria-valuemax=goal seconds`, `aria-valuenow`, `aria-label="Today's practice: 6 of 10 minutes"`. Tapping/hovering may show that label as a small tooltip (optional; keep simple).
- Hidden entirely when the setting is off.

## What counts as practice time
- Count 1 second per second only while `document.visibilityState === "visible"` AND the learner interacted (pointerdown, keydown, touchstart, or speech/audio activity is not required) within the last 60 seconds.
- Single interval ticker (1s) mounted once at app shell level; pause when hidden. Batch-save to storage at most every 10s and on `visibilitychange`/`pagehide`.
- Day key = learner's local date (YYYY-MM-DD). New day → starts at 0. Keep only the last 14 days.

## Storage
- Device-local only (localStorage), namespaced like existing device prefs (`lt.practice-time.v1`). All reads/writes wrapped in try/catch; the bar renders 0 if storage is unavailable. No server/schema changes, no migrations.

## Settings
- In the existing settings/account surface (find where theme/voice/reminder prefs live; `src/routes/account.tsx` is a candidate): a "Practice bar" on/off switch (default **on**) and a daily goal select: 5 / 10 / 15 / 20 minutes (default **10**). Persist device-local.

## Non-goals
- No account sync, no team-admin reporting, no streaks, no notifications. (Possible later.)

## Tests
- Unit tests for the pure time logic (tick counting with idle cutoff, hidden pauses, day rollover, 14-day pruning, goal clamping).
- e2e: bar visible by default, has progressbar role; toggling off in settings hides it; 375px and desktop.

## Implementation decisions (2026-10-22)
- Placement: the chip row and bottom tab row live in `AppSidebar.tsx` (`<nav aria-label="Primary">`, `position: fixed`, shown on phone and desktop), not in `TabShell.tsx`. The bar is mounted from `TabShell` (one ticker, one bar) and portaled into that nav as an absolute child at `-top-px`, so it covers the nav's top border and adds no height. A one-line mount inside `AppSidebar` would be cleaner if that file may change. The desktop `TopNav` header is not used; one placement rule on both viewports.
- Settings: guests cannot open `/account` (sign-in wall), and push reminders already live on the Dashboard tab, so the switch and goal select are a `PracticeBarSetting` card under the reminder row in `dashboard/Dashboard.tsx`.
- Counting: idle counts while `now - lastInteraction < 60s` (exactly 60s idle stops). The interaction clock starts at app load. No counting while the bar is switched off. A tab shows nothing on a paywall screen (the gate does not render `TabShell`).
- Goal clamp snaps to the nearest of 5/10/15/20, ties go lower, junk becomes 10. Prune keeps today plus the 13 days before it.
- Cross-tab: the tab re-reads storage on becoming visible and on `storage` events; a failed read never wipes in-memory data.
- Goal pulse is a single Web Animations opacity pulse, only when the goal is crossed while watching, skipped under `prefers-reduced-motion`.
- `playwright.config.ts` `testMatch` lists do not include `practice-bar.spec.ts`; add it to the `desktop` and `iphone-pwa` projects to run it from the standard config. The spec seeds its own state and needs no `setup` project.
