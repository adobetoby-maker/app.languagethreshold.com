# Japanese 101 web acceptance sample — 2026-11-07

Source: `origin/main` at `33428b531bf9786abfa1ecb3cc1552cf53fef4c8`. Production sampled at `https://app.languagethreshold.com/` in headless Chrome with 1440×900 desktop and 393×852 touch/mobile emulation. The latter is a viewport check, not iPhone Safari or the V4 native app. The guest profile selected **Japanese target / English support**, and no account, payment, microphone, or persisted production progress was used.

## Automated source checks

Commands (run from the main checkout, using its existing dependencies):

```sh
node --test tests/japanese-basics-course.test.mjs tests/lesson-offline-pack.test.mjs tests/offline-lesson-worker.test.mjs tests/speaking-missions.test.mjs
node --test tests/core30-scope.test.mjs tests/core30-state.test.mjs tests/lesson-drafts.test.mjs tests/lesson-card-direction.test.mjs tests/speaking-mission-progress.test.mjs tests/speaking-auth-return.test.mjs tests/app-navigation.test.mjs tests/service-worker-privacy.test.mjs
```

Result: **38/38** and **50/50** passed. These cover exact-pair catalog/lesson definitions, 10/30/20 source shape, Reader seeds, six-mode definitions, cards and speaking mission mapping, scoped progress reducers, offline pack separation, and no Spanish borrowing at the source/worker level. They do not prove installed offline use or learner-visible language quality.

## Production guest checks

Opened the following exact-pair lesson URLs on both viewports, then selected See, Recall, Hear, Type, Say and Write through the visible lesson navigation:

- `https://app.languagethreshold.com/?tab=core30&module=japanese-basics&target=Japanese&native=English&lesson=1&way=see`
- `https://app.languagethreshold.com/?tab=core30&module=japanese-basics&target=Japanese&native=English&lesson=30&way=see`
- `https://app.languagethreshold.com/?tab=core30&module=master-japanese-basics&target=Japanese&native=English&lesson=1&way=see`
- `https://app.languagethreshold.com/?tab=core30&module=master-japanese-basics&target=Japanese&native=English&lesson=20&way=see`

All four opened the expected numbered Japanese lesson with English support on desktop and phone width. See and Say sections rendered; Recall, Hear, Type and Write exposed their practice kit, with Write opening its dedicated workspace. No horizontal document overflow was measured on the sampled See screens (`scrollWidth - clientWidth = 0`). This was a navigation/rendering check, not an answer-quality or microphone test.

Core 1 showed the Japanese sentence `まいにち にほんごを べんきょうします。` with its English meaning. Its **Open in full Reader** control routed to `?tab=reader&module=japanese-basics&target=Japanese&native=English`; the same sentence and “After class” title were present there. Recall displayed 12 Japanese/English terms and Study/Cards/Match choices; the source test confirms an authored deck. Say displayed the lesson-specific Japanese word bank and **Practise with AI here** control. The AI session was not started, so speech recognition, consent, response generation and conversation continuity remain open.

The guest URL `https://app.languagethreshold.com/?tab=core30&module=foundation-japanese-basics&target=Japanese&native=English&lesson=1&way=see` displayed the expected **Create a free account or sign in** gate on both viewports. Foundation lesson modes therefore could not be accepted as a guest.

## Remaining release gates

- Qualified Japanese full-course and generated-quiz review remains open; the continuity ledger records scoped AI reviews only. All `reviewed` flags remain false.
- Signed-in Foundation/Core/Master lesson practice, Reader return, account progress sync, and exact-pair preservation need a dedicated test account. No login credentials or user data were used here.
- Actual iPhone Safari, installed/offline lesson and Reader use, Japanese playback/listening quality, microphone conversation, V4 iPhone/Watch behavior and TestFlight acceptance were not tested here.
- Recorded Japanese audio is incomplete: the gated ten-clip pilot does not cover the 1,680-clip Japanese 101 inventory.

This is a bounded acceptance sample of a **mapped draft**, not a claim that the Japanese course or native apps are complete.
