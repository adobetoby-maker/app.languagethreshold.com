# French → English language program

This ledger is an inventory and work queue, not evidence of a released French course. It was generated from the read-only exact-pair module audit of app commit `7a2bef7428120af880a4340cc5ecf216a38f0f3d` on 2026-11-07. [Program issue #172](https://github.com/adobetoby-maker/app.languagethreshold.com/issues/172) links the effort; `tickets.json` records the 68 course issues (#173–#240) and `coverage.json` records source and stage gates.

The current catalog has **71 base courses**, not 70. Of these, **68 Spanish → English courses have an applicable French → English equivalent** under the owner's instruction to include French analogs of Spanish-only courses. The other three (`military`, `or-evs`, `fmg`) are explicitly English-target courses; they are listed as out of scope, not silently translated. Fifty-five French catalog cards exist today: 38 have partial authored material and 17 are catalog-only. Thirteen French analog catalog entries must be added. **No French track has a validated 10/30/20 course in this source audit.** These numbers describe source coverage, not production availability or language quality.

For all 68 French tracks, preserve the stable module ID and lesson/progress identities given in `coverage.json`. Build French grammar, pronunciation, regional/register choices, vocabulary, aligned readings, six modes, speaking, Reader, dictionary and cards from the anchored English objective and meaning, with independent language and domain review. A Spanish translation by itself is not a French course. Human approval, native-app playback, audio, and release are tracked separately. Do not mark a track complete because it has a catalog card, a generated draft, or passing structural tests.

The source audit command was:

```bash
node /Users/drive/.codex/skills/add-language-threshold-module/scripts/audit-module.mjs --repo /Users/drive/git-backups/lt-french-program-2026-11-07 --all --output /tmp/french-audit-2026-11-07.json
```

The audit helper needs this checkout's `esbuild` dependency. During the inventory, the worktree used an ignored `node_modules` symlink to the existing app checkout; no dependency files or app code were changed.
