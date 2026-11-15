# French Breakfast Foundation 6 — private source-aligned team packet

Disposition: **conditional owner-only review**, with exact visible caveats. The original #475 draft substituted French foods and Lyon/Grenoble for the pinned Mexican chilaquiles/beans/salsa/Oaxaca/Puebla scene. Haiku restored setting but left common food words untranslated and collapsed the source tú/usted contrast. Opus identified these; Fable corrected to standard French food terms and source-specific tu/vous. A source-grounded self-check confirmed Opus's `verbs` observation applies to the separate Reader lesson object; the lesson card JSON alone has no `verbs` field.

The packet contains 16 exact source English/Spanish cards and original kinds, nine exact-English Reader lines, six Reader-linked forms, six draft modes and source speaking task. Stable key `foundation:6`; all learner, audio and progress gates false. Card 8 flags Mexican salsa verde versus generic French sauce verte. Card 13 flags the immutable source's formal usted on the card versus informal tú to the same guest in Reader line 7. French -ar/-er/-ir progression cannot map exactly; this remains a qualified-review issue. No audio is attached; old private audio for changed French strings is invalid. Food-domain notes are separate from learner notes.

Source snapshot at origin/main `a9d3a834fcba4e0efb7a780fb52de51503d32b4e`: course SHA-256 `94621cca4158b76c69435f35eb1dfdc4893df553afaccb8a1963bdd9e6d80e79`, Reader SHA-256 `e11886cd3e030534ba8f8b8e92515c528e07c2875f20a58034faed2bc3d0f78a`. Private baseline #475 `5cc469f5a54828c48238ccdf411238ed2e3e2c08`. The archive contains full source snapshots and runs independently of a worktree: `python3 /Users/drive/lt-review/french-breakfast-teams-2026-11-14/foundation-6/validate_packet.py`.

Actual direct Claude CLI --safe-mode metadata:
- haiku: `claude-haiku-5-5`, is_error=False, raw=/Users/drive/lt-review/french-breakfast-teams-2026-11-14/foundation-6/haiku-output.json
- opus: `claude-opus-5-5`, is_error=False, raw=/Users/drive/lt-review/french-breakfast-teams-2026-11-14/foundation-6/opus-output.json
- fable: `claude-fable-5-2`, is_error=False, raw=/Users/drive/lt-review/french-breakfast-teams-2026-11-14/foundation-6/fable-output.json

Self-check: source hashes compared with current origin/main, validator passed, card/Reader meaning and IDs inspected, and all gates confirmed false. AI critique/correction is not qualified French or Mexican-food approval, audio listening, or learner release. No tracked repository edits, push, synthesis or registration.

Correction after self-check: the pinned Reader object also carries full Spanish verb paradigms (see `sourceVerbParadigms` in packet). The packet preserves those exact source paradigms, but does not yet author full French counterparts (`frenchVerbParadigmsAuthored:false`). This is an explicit progression gap, and an owner preview must show it rather than imply lesson completion.
