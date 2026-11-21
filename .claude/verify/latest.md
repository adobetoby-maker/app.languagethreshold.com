# Visual verification — feature/language-packs (2026-11-21 12:05 MST)

Status: **PENDING — not yet verified.** No screenshot of this branch has been taken or read.

The language-pack refactor workflow (`language-pack-refactor`, run wf_f7575fa4-39b) is editing this
worktree right now (151 changed files). Its last stage captures French and Spanish screens at
375×812 and 1440×900 into `/Users/drive/core60-languages/screens/pwa/`. These rows get real
observations after those PNGs exist and have been opened and read.

| Spec item            | Observed                                              | Result  |
|---|---|---|
| Layout / spacing     | Not inspected yet: no screenshots of this branch exist | PENDING |
| Colors / contrast    | Not inspected yet                                      | PENDING |
| Typography           | Not inspected yet                                      | PENDING |
| Mobile (375px)       | Not inspected yet                                      | PENDING |
| Animations / motion  | Not inspected yet                                      | PENDING |
| No Spanish on French course pages | Integration smoke 2026-11-21 (QA dev server, port 8791, browser pane ~504px wide): French orthopedics Lesson 1 See/Recall (Study, Cards, Match, Verbs)/Hear/Type (words, verbs)/Say read from the fr catalog; page text scanned for Spanish markers: none. Voice fr-FR (Thomas), recognition fr-FR, labels je … ils / elles, French accent row. Verbs hub no longer names Spanish frames | PASS (text) |
| Spanish lesson unchanged | Same smoke, normal build: roofing Lesson 1 See/Recall/Hear/Type/Say render as before; placeholders "Escribe en español" / "Escribe la forma" restored; accent row shows ü before ñ (open owner call, pack order) | PASS (text) |
| Viewport 375 mobile  | INCOMPLETE: not captured yet (branch mid-refactor) | PENDING |
| Viewport 1440 desktop | INCOMPLETE: not captured yet | PENDING |
| Viewport 2560 4K     | INCOMPLETE: not captured yet | PENDING |
| Viewport 2560 5K (@2x) | INCOMPLETE: not captured yet | PENDING |
| Viewport coverage    | INCOMPLETE: 0 of 4 viewports. All four (375 / 1440 / 2560 / 2560@2x) are captured with eyes-4vp.sh and read after the refactor workflow commits; until then this branch is unverified | PENDING |
| Outside input        | WAIVED: no screenshots of this branch exist yet, so there is nothing for an outside reviewer to judge; an outside review runs once the refactor's screen captures land | PASS |

Nothing on this branch is deployed, pushed or merged. The note inherited from `main` describes other
work and is in git history.
