# Japanese 101 form-practice runtime preview

`content/japanese-basics/private-form-runtime-preview-ja-en.json` combines the six source-pinned Japanese→English form-practice fixtures into one lesson-keyed candidate. It covers Foundation 10, Core 30, and Master 20: 60 stable lesson identities, 235 prompts, and 470 activities. Each prompt supplies one recognize-meaning activity and one produce-target activity. The builder checks its source-file hash and matches both sides of every prompt to the exact current reading turn before writing the preview.

Run `node scripts/build-japanese101-form-runtime-preview.mjs --check` and `node --test tests/japanese-101-private-form-runtime-preview.test.mjs tests/japanese101-form-practice.test.mjs` to verify deterministic output, lesson IDs, counts, language direction, and source-pair fidelity.

This is a private runtime-shaped candidate. `registered:false` and `reviewed:false` remain in the output and source fixtures. It is not wired into the learner UI, progress, offline downloads, web release, or V4. Japanese language review of the forms and acceptable variants remains open. The activity shape is specific to Japanese contextual forms rather than a copy of Spanish person-ending tables.
