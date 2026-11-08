# Japanese Breakfast private audio scope

This is an unsynthesized sizing inventory for the Japanese-target/English-support Breakfast & Cafés 60-lesson private source draft in PR #424. It covers Foundation 1–10, Core 1–30 and Master 1–20. All course sources are `reviewed:false`, `registered:false`, `audio:none`; this inventory has the same private release state.

| Scope | Count |
| --- | ---: |
| Authored draft lessons | 60 |
| Card front placements | 833 |
| Reader line placements | 577 |
| Speaking opening placements | 60 |
| Speaking word-bank placements | 345 |
| Unique exact Japanese strings | 1,278 |
| Proposed Aoede + Charon clips | 2,556 |
| Unicode characters per voice | 15,306 |
| Two-voice Unicode-character projection | 30,612 |

The machine-readable [exact-text inventory](private-audio-scope-ja-en.json) contains the original strings, their SHA-256 hashes and every lesson/field occurrence. Its sorted exact-text concatenation SHA-256 is `89f2783c8fbbb2fd0a6aa03d6fcfcd26f673054131f9c577d4421c645fa29f9c`. It deduplicates identical bytes only, with no punctuation, spacing, case or script normalization. That intentionally avoids silently reusing a recording for a different line. The projected character count is Unicode code points, not a provider billing quote; obtain current billing terms before a paid batch.

Source file SHA-256 hashes are in the JSON and verified by `scripts/build-japanese-travel-breakfast-private-audio-scope.py --check`. Included fields are Japanese card fronts, aligned Japanese Reader lines, speaking openings and Japanese word banks. English support, mode instructions and unwritten AI responses are outside this scope. If source text changes, regenerate the inventory before any synthesis plan.

The Core 2/6 and Master 11/15 focus-description corrections and fourteen Say-mode prompt rewrites from draft PR #429 are included here. They changed seven source-file hashes but no card front, Reader line, speaking opening or word-bank text. The exact-text hash and all counts above are unchanged. This cross-stack synchronization is still private and unreviewed.

Proposed voices: `ja-JP-Chirp3-HD-Aoede` and `ja-JP-Chirp3-HD-Charon`. No paid synthesis was performed. Before playback or native packaging: resolve Japanese and food/allergy/medical domain review, select a bounded approved text batch, synthesize with exact locale/voice IDs, verify text and recording hashes/durations, obtain qualified listening approval, then test browser/iPhone/Watch routing and offline behavior. In particular, allergy, burn, emergency and hot-drink lessons require specialist review. No generated clip or approval is inferred from an inventory.
