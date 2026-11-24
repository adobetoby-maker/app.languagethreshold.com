# French Roofing candidate schema normalization

Baseline: exact main `82f7a259dcbbbd40448ce40e4e1969ad1884ec35` (#803), fetched and verified before edits. All60 local candidate files matched that baseline. This deterministic source-only pass changes43 candidate files and does not reauthor teaching content.

| Missing explicit metadata | Before | After |
|---|---:|---:|
| Dictionary row `registered:false` | 209 | 0 |
| `gates.qualifiedEnglish:false` | 33 | 0 |
| Exact original `sourceObjectiveEnglish` | 18 | 0 |
| Exact original `sourceSpeakingEnglish` | 18 | 0 |
| Explicit original-scope held/incomplete status | 18 | 0 |

Missing original-scope fields were in Core1–18. Their original objective and speaking mission were copied verbatim from each pinned source packet, including source-language direction where present; the new status explicitly says supplemental candidate content does not establish completion. Existing source/objective statuses were preserved.

The independent validator compares each current candidate to the exact Git baseline. It removes only the authorized additions and requires the resulting object to equal the baseline. This preserves every authored string, source face/hold, ID, activity, form, dictionary sense, speaking revision, earlier draft and option. It also checks each packet hash and every underlying source-file hash, exact original-scope text, false gates and null selected French/audio. The independent validator passed all60 candidates and240 underlying source-pin checks; existing per-candidate validators passed60/60.

```sh
python3 scripts/validate-french-roofing-candidate-normalization.py \
  --baseline 82f7a259dcbbbd40448ce40e4e1969ad1884ec35
```

Machine-readable counts and exact changed paths are in `docs/french-program/roofing-candidate-schema-normalization-2026-11-24.json`.

No AI call, qualified-review claim, runtime/owner-page registration, recording, audio scope, offline pack, progress migration or V3/V4 identity change occurred. All draft selections remain null and all gates false. Original specialist objectives remain incomplete. Foundation speaking reconciliations from #800/#802/#803 are preserved exactly.

Next substantive bounded work: Core1–3 contextual speaking/French-scaffolding reconciliation, preserving all source faces, teaching arrays and original-scope holds. Full60 numbered coverage remains distinct from qualified teaching, audio, runtime and device acceptance.
