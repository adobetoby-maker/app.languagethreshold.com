# French 101 form-practice runtime preview

The private exact French→English preview at `content/french-basics/private-form-runtime-preview-fr-en.json` assembles eight source-pinned fixtures against the three current private stage runtimes. It has 60 stable lesson keys, 329 prompts, and 658 activities: one recognize-meaning and one produce-target activity per prompt. All 284 Reader-linked prompts were matched to their exact source turn, including speaker labels where present. The remaining 45 authored contrasts are marked separately for French review.

Run `python3 scripts/build-french101-form-runtime-preview.py --check` to verify source hashes, pair direction, stable IDs, counts, Reader alignment, and deterministic output. This candidate retains `registered:false` and `reviewed:false`; it is not connected to learner UI, saved progress, offline, web release, or V4. French-language and curriculum review of the prompts, contrasts, and accepted answer variants remains open.

`node scripts/build-french101-form-review-sheet.mjs` creates `/Users/drive/lt-audio/french-101/form-review-2026-11-09.html`. It pins the exact preview hash, shows each French answer beside its English cue, and filters Reader-linked prompts from authored contrasts. It can export a reviewer’s observations as JSON; these observations do not change course review flags.
