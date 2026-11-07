# French Foundation draft review checkpoint — 2026-11-07

This checkpoint is for draft PR #241. It does not approve or publish a course. All `reviewed` fields remain `false` because no qualified human French or domain review has occurred.

## Roofing Supervisor, Foundation 7–10

- Current draft SHA-256: `a6ee25c74726f57e6bc461b8cae2076a3f32f714b8a8193172807bf87532bb55`.
- Fable and Opus each passed a scoped AI recheck of an earlier draft, SHA-256 prefix `377aa823`. Their reports identify three later minor changes: the stale *caída* note, duplicated `vous`-command explanation, and apostrophe consistency. The current draft shows the corrected *caída* note, a single command rule, and straight apostrophes in the cited lines. Those changes have **not** been rechecked by either model; the earlier pass cannot be transferred to the new hash.
- `python3 scripts/validate-french-roofing-pilot.py` passes source hashes, ordered English term/phrase pairs, readings, and verb counts for Foundation 1–10. This is structural/source validation, not linguistic approval.
- Remaining AI gate: one narrowly scoped Fable/Opus review of only the final changes, or an equivalent independent review that explicitly cites the current hash. Qualified French, roofing terminology, and safety review remain separate open gates.

## Travel Breakfast, Foundation 7–10

- Current draft SHA-256: `9e8d6b638555a66b5620ee4d3b41423f928cfd2efd1f042c1460b671c44b6096`.
- Initial Opus AI review identified four material issues in allergy dialogue, tree-nut wording, emergency-number notes, and a Spanish-language English card. Corrections are present in the draft and recorded in `content/french-travel-breakfast/ai-review-7-10-evidence.json`, but the scoped Opus recheck stopped at `budget_exhausted` without findings. Fable's full and two narrower fidelity attempts also stopped at `budget_exhausted` without findings. Neither review passed.
- `python3 scripts/validate-french-travel-breakfast-pilot.py` passes source hashes and exact English term/phrase/reading pairs for Foundation 1–10. The French-course `enFrenchCourse` display override is still not wired into runtime.
- Remaining AI gate: completed independent Fable fidelity review and Opus correction recheck against this exact draft. Qualified French, regional travel content, and allergy/safety review remain separate open gates.

## Invocation decision

No additional Claude CLI model invocation was made for this checkpoint. Multiple recent bounded Fable/Opus invocations returned `budget_exhausted` without usable review results, including narrower Travel Breakfast attempts. A further paid attempt without a confirmed available budget would risk cost without clearing a gate. `claude --version` reports 2.1.318; no non-billing budget status check was available in this workflow. Resume with a confirmed model budget and exact small review payload, recording model, scope, draft SHA-256, findings, corrections, and actual usage. Do not infer approval from a failed invocation or from the source validators.

No draft here is runtime registered. Core 1–30, Master 1–20, six modes, Reader, speaking, cards, dictionary, offline and audio integration, device acceptance, and production verification remain open for these tracks.
