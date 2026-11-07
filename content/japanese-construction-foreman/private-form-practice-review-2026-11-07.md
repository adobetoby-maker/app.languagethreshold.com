# Private Japanese Foreman form practice

`scripts/build-japanese-foreman-private-form-practice.py` derives two exact bilingual grammar examples from each of the 60 authored Japanese Foreman runtime drafts: 10 Foundation, 30 Core, and 20 Master lessons. The output has 120 stable source-hashed form IDs, a source-file SHA-256 inventory, and two tasks per authored example: recognize the English meaning and produce the Japanese sentence. The prompts use whole contextual Japanese forms. They do not assume Spanish person tables, stems, or conjugation endings, and no synthetic inflections are asserted.

The adapter in `src/lib/private-japanese-foreman-form-practice.ts` accepts only the exact Japanese target/English support pair. Its release gate is false and no live verb-game or lesson component imports the draft. No learner data or saved progress changes. This is a private practice input contract, **not** 60 reviewed Japanese verb lessons or a public game.

Qualified Japanese review is still required for form naturalness, readings, register, pedagogical progression, and accepted answer variants. Qualified construction/safety review remains required for provisional trade terms and the Master 2 garage-deck/deicing-water source claim. Until then, `reviewed:false` and `registered:false` remain accurate. Before any release, integrate with Japanese-specific UI controls and verify exact answer evaluation, six lesson modes, lesson identity, phone layout, offline behavior, and audio; do not reuse the Spanish conjugation engine or progress namespace.

Validation: deterministic `--check` for form and dictionary inventories; ten focused Node tests covering exact source pairs, stable IDs, language isolation and release gates; TypeScript `tsc --noEmit`; `git diff --check`.
