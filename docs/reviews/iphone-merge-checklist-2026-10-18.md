# iPhone merge acceptance

Target: [current QA Preview](https://lt-main-recovery-qa-20261018.vercel.app), runtime `77ce283`. Use Safari and an email/password test account. Google returning to the live site does not count as Preview acceptance.

- [ ] **Reader and layout:** open a saved private text; check both language columns, word popup, scrolling and controls in portrait/landscape. Play sentence audio, stop it, lock/unlock and return.
- [ ] **Offline:** open the saved text online first. Enable Airplane Mode with Wi-Fi off, refresh, then close/reopen Safari. The cached text should remain readable; unavailable actions should say so.
- [ ] **Reconnect:** restore network and retry any queued Reader change. Reload: no missing or duplicated text and no remaining sync warning.
- [ ] **Account privacy:** sign out through More. Guest must not show the private text. Sign back into the same account and open its cloud copy.
- [ ] **Lesson and Exams:** open the Roofing plan, use See/Type/Write, enter a labeled test draft and refresh. Check previous/next/Exit and the Exams return link. Keep official exam drafts unsubmitted and lesson mastery unchanged.

Send the iPhone model, iOS version and pass/fail for each row, plus a screenshot for any failure. Physical checks supplement the separate desktop Reader expiry/re-auth trial; they do not approve curriculum, calibrated exams or real pilots. Main merges deploy production, so merge after the Reader trial, this checklist and normal PR review are accepted.
