# Spanish, French, and Japanese 101 purpose crosswalk

The [60-row source crosswalk](./language-101-spanish-french-japanese-crosswalk.json) pins each Spanish 101 stage-local lesson to the current Japanese 101 draft and private French 101 draft. It records titles, objectives or focus, source paths, repository revisions, and SHA-256 hashes. The Spanish source is `70cd3dd900b84e5052abe7a8f9e3a397f3000e8e`; the Japanese draft is `018e69872875ae15acc7381368bac199bf61171e` (draft PR #488); the French draft is `4ce799e176201f874a8a0091408ff33ce1ca4887` (draft PR #430). The French Master rows use the 20-lesson redesign rather than the earlier 1–3 pilot. The builder rejects missing, duplicate, or reordered lessons and changed Spanish objective provenance in French Foundation/Core.

The previously identified Master 14 outcome mismatch has a source-level correction in draft PR #488. Spanish Master 14 is **“Tell a daily routine in order.”** French Master 14 teaches a normal sequence and a specific interruption. Japanese Master 14 now teaches a usual routine with `ふだん`, `まず`, `それから`, and `さいごに`, followed by today's changed plan. Its earlier delayed-meeting scene is pinned intact as an unregistered language-specific extension. The lesson remains `master-japanese-basics:14`, `reviewed:false`; the revised Japanese audio is mechanically verified but awaits listening review. This source alignment is not qualified curricular approval.

The earlier [private Master 14 candidate](../content/japanese-basics/private-master-14-routine-candidate.json) was incorporated into the revised Japanese source and extended to 18 aligned Japanese/English turns. Draft PR #488 records the new source and audio hashes, six-mode and speaking updates, browser checks, and preserved delayed-meeting extension in [its parity ledger](https://github.com/adobetoby-maker/app.languagethreshold.com/blob/feat/japanese101-master14-routine-parity-2026-11-10/docs/japanese-program/101-master14-routine-parity-2026-11-10.md). Qualified Japanese review must still check naturalness, variant answers, and progression before release.

The Spanish Master source objectives deliberately revisit Foundation/Core grammar while its titles specify applied tasks. French Master redesigns replace repeated beginner Reader lines with new application tasks. This crosswalk compares *purpose and outcome*, not literal sentence translation. The remaining 59 pairings have not received qualified alignment review; a same-number mapping alone is insufficient evidence of parity. Each row remains `pending-qualified-review` in the JSON. The French and Japanese courses remain unreviewed drafts, and this audit does not establish runtime, native, offline, or audio acceptance.

Regenerate against these exact checkouts with:

```sh
python3 scripts/build-fr-ja-101-parity-crosswalk.py \
  --japanese-root /Users/drive/git-backups/lt-japanese101-master14-routine-parity-2026-11-10 \
  --french-root /Users/drive/git-backups/lt-french101-forms-foundation-2026-11-08
python3 scripts/build-fr-ja-101-parity-crosswalk.py \
  --japanese-root /Users/drive/git-backups/lt-japanese101-master14-routine-parity-2026-11-10 \
  --french-root /Users/drive/git-backups/lt-french101-forms-foundation-2026-11-08 --check
```
