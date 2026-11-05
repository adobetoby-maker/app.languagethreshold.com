# Study minutes, lessons, streaks and reminders

Native V4 and the website use the same authenticated study-activity storage in Supabase. Exercise marks remain local/Watch; this change syncs active seconds, completed lesson identities, qualifying streak dates and the daily minutes goal.

- Active foreground practice counts after interaction; idle for 60 seconds, background time and suspended clock gaps earn no time.
- Finishing all six modes earns one native lesson completion. Individual answers and games are practice, not whole lessons.
- A completed lesson or the configured daily minutes goal earns a streak day. Existing website qualifying days also sync, without inventing lesson completions for old streaks.
- Shared curriculum lesson IDs include target/native languages, source module and source lesson number. Completing the same lesson on phone and website counts once, with the earliest completion date.
- Per-device daily seconds only increase on retries. Different devices' counters add; lesson IDs and streak dates union. Simultaneous independent device sessions are counted separately.
- Phone saves and browser contributions are account-specific. Guest phone activity can be claimed once, not copied into successive accounts. The old browser-wide timer has no account provenance; historical browser minutes are not uploaded automatically.
- Phone retries on a 30-second loop and foreground/session changes. Website retries every 30 seconds, online, focus and visibility changes. Failed requests retain device data.
- Speak has no streak/time HUD; speaking practice still contributes time.
- Native reminder windows schedule the next seven days and refresh on use. Remaining windows for today are removed when the shared goal is reached. Opening the app refreshes the next week. OS notification permission and delivery remain controlled by iOS.
- Website push delivery reads fresh server activity and the shared minutes goal at each due window, even when the website is closed. Window schedules remain device-specific.
- No new TestFlight upload is part of this change.

Validation: 2,878 website unit tests passed before final identity/streak refinements; 32 focused time/sync tests passed after those refinements. Browser smoke: 101 passed, 22 skipped. Authenticated REST integration verified monotonic retries, additive devices, lesson deduplication, shared goal writes, separate accounts, denied anonymous access, invalid-value rejection, and deletion of disposable QA users. Migration applied and registered as 20261104131231; RLS enabled and RPC uses security invoker.
