# Spanish, French, and Japanese 101 purpose crosswalk

The [60-row source crosswalk](./language-101-spanish-french-japanese-crosswalk.json) pins each Spanish 101 stage-local lesson to the current Japanese 101 draft and private French 101 draft. It records titles, objectives or focus, source paths, repository revisions, and SHA-256 hashes. The Spanish source is `70cd3dd900b84e5052abe7a8f9e3a397f3000e8e`; the Japanese draft is `5e8e3cc0bc89849ccbc5a6df2e7c7cde25715d96` (draft PR #485); the French draft is `4ce799e176201f874a8a0091408ff33ce1ca4887` (draft PR #430). The French Master rows use the 20-lesson redesign rather than the earlier 1–3 pilot. The builder rejects missing, duplicate, or reordered lessons and changed Spanish objective provenance in French Foundation/Core.

One outcome mismatch needs curriculum review before release: Spanish Master 14 is **“Tell a daily routine in order.”** The French redesign Master 14 teaches a normal sequence and a specific interruption. Japanese Master 14, **“Handle a delayed meeting,”** teaches an intended meeting, a train delay, quoted message, and completed arrival. This is useful Japanese conversation content, but its current task does not establish the ordered daily-routine outcome at the same lesson slot. A qualified reviewer should decide whether to add that outcome to Master 14 and preserve the delayed-meeting scene as a language-specific extension, or place the routine outcome elsewhere with an explicit dependency. Keep the existing stage-local ID and progress association; any text/audio change requires new exact-source audio validation. No learner lesson or audio is changed by this crosswalk.

The Spanish Master source objectives deliberately revisit Foundation/Core grammar while its titles specify applied tasks. French Master redesigns replace repeated beginner Reader lines with new application tasks. This crosswalk compares *purpose and outcome*, not literal sentence translation. The remaining 59 pairings have not received qualified alignment review; a same-number mapping alone is insufficient evidence of parity. Each row remains `pending-qualified-review` in the JSON. The French and Japanese courses remain unreviewed drafts, and this audit does not establish runtime, native, offline, or audio acceptance.

Regenerate against these exact checkouts with:

```sh
python3 scripts/build-fr-ja-101-parity-crosswalk.py \
  --japanese-root /Users/drive/git-backups/lt-japanese-aru-form-2026-11-09 \
  --french-root /Users/drive/git-backups/lt-french101-forms-foundation-2026-11-08
python3 scripts/build-fr-ja-101-parity-crosswalk.py \
  --japanese-root /Users/drive/git-backups/lt-japanese-aru-form-2026-11-09 \
  --french-root /Users/drive/git-backups/lt-french101-forms-foundation-2026-11-08 --check
```
