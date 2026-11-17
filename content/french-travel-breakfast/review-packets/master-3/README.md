# French Breakfast Master 3 — source-only review packet

This packet preserves the current Spanish→English Master 3 source in a French→English **draft for repository review**. It is inert: no owner page, catalog import, learner mode, scoring, audio, offline pack, progress write or V4 registration reads it. `reviewed` and every release gate remain false.

The current source has 23 cards and 18 aligned Reader turns in an Oaxaca market fonda. Carmen coaches her 15-year-old niece Sofi to order café de olla and pan de yema from doña Eustolia, pay with a 50-peso bill and handle a hot clay mug. The archived French draft instead moved the scene to a Montréal café with hot chocolate, a generic pastry and a dollar bill. Its 23 English card and 18 Reader source anchors still match the current source exactly, but the French answers do not. `master-3.json` retains the stable lesson key `master:3`, pins both current source files and the archive hashes, and uses revision-scoped candidate card/Reader IDs. Prior draft IDs appear only as references; saved-item migration is undecided.

## Authorship and self-check

- Safe-mode Claude CLI alias `haiku` first returned **Sonnet 5.5** metadata (`haiku-output.json`); it is not credited as Haiku. A second full-name `claude-haiku-5-5` call returned verified **Haiku 5.5** metadata (`haiku-output-verified.json`) and the 23/18 candidate.
- A safe-mode **Opus 5.5** read-only critique (`opus-output.json`) identified wrong `paie-lui`, a formal-request mismatch, hot-mug pronoun ambiguity, source glosses embedded in answer strings, `puesto`/`étal` inconsistency and a pejorative rendering of *fonda*.
- A safe-mode **Fable 5.2** correction (`fable-output.json`) restored current scene details and corrected those concrete issues. The author then added Reader 5 quotation marks, a water-made chocolate gloss in Reader 8, and the named bread in Reader 18. `build.py` records these deterministic edits; `validate.py` checks the current source rows, hashes, IDs, 23/18 counts, false gates and audio estimate.

These model results and structural checks are **not qualified French, source, food or dictionary review**. The source itself leaves the referent of Spanish *lo* across “hold it,” “do not touch it,” “leave it” and “taste it” somewhat ambiguous; the proposed French switches between *la tasse* and *le café*. A qualified reviewer must settle the referent and hot-vessel sequence, the formal request to doña Eustolia, named Oaxacan food senses, and French register before any learner answer is selected. The packet has no authored six-mode prompt/answer set or speaking mission. The current source grammar and English speaking objective are pinned for later authoring.

## Audio and progress

The 41 candidate French strings would create 82 distinct two-voice clip/listening decisions. The read-only count is 2,145 submitted characters, approximately **$0.06435** gross at the previously used $30 per million characters. No synthesis, technical media check, reuse or listening approval occurred. Changed text retires the archived clip scope. Stable learner progress and saved-item migration need a separate exact-pair decision before any registration.

Run `python3 content/french-travel-breakfast/review-packets/master-3/build.py` and then `python3 content/french-travel-breakfast/review-packets/master-3/validate.py` from the repo root.
