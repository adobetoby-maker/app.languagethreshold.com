# Private Japanese Foreman dictionary adapter

The adapter in `src/lib/private-japanese-foreman-dictionary.ts` indexes the 1,016 provisional Japanese→English exact pairs from `private-dictionary-draft-ja-en.json`. It keeps source IDs, card occurrences, and all 11 ambiguous Japanese headwords with their separate English senses. A Japanese headword or English gloss returns only an exact full-string match for the explicit Japanese target/English support pair. It does not infer inflections, strip particles, or reuse Spanish content.

`JAPANESE_FOREMAN_DICTIONARY_RELEASED` is false, and the learner-facing dictionary does not import this inventory or adapter. The release lookup returns no results. This is a private integration contract, not a published dictionary or user progress migration.

Before registration, qualified Japanese and construction reviewers must resolve the 11 sense ambiguities, verify readings/register and the Master 2 garage-deck/deicing claim and other safety/code terms, and author part of speech and inflection data (currently null on all 1,016 entries). App integration must then verify exact-pair search, lesson links, phone layout, offline behavior, and saved-card ownership. The release gate must remain closed until those checks and audio acceptance are documented. No audio was produced here.

Validation: `node --test tests/japanese-foreman-dictionary-runtime.test.mjs`, `python3 tests/japanese-foreman-private-dictionary.test.py`, deterministic `python3 scripts/build-japanese-foreman-private-dictionary.py --check`, and `tsc --noEmit` passed in the sparse worktree.
