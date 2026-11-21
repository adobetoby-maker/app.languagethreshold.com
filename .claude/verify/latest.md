# Visual verification — feature/language-packs, verifier fix pass (2026-11-21 14:40 MST)

Smoke on the dev server, port 8791, system Chrome via Playwright. Normal build for Spanish, QA build
(VITE_LT_QA=1) for French. Captures: 1440×900 and 375×812, read with the Read tool. Not captured:
2560 4K and 2560@2x (no layout change in this pass beyond copy and one onboarding panel).

| Spec item            | Observed                                                                 | Result  |
|---|---|---|
| Layout / spacing     | es roofing Core 60 at 1440: Spanish 101 card, review card, "Name the Roof System" lesson card, dock and Ask Tutor as before. fr dictionary at 1440: 3-column word grid, 8972 entries, chips All/Core/Construction/Medical | PASS |
| Colors / contrast    | Dark theme unchanged; gold primary buttons and muted body text readable on both pages | PASS |
| Typography           | Serif headings and sans body as before; French accents render (à, 1,30 m) | PASS |
| Mobile (375px)       | es roofing at 375: cards stack, dock fits six ways, no overlap | PASS |
| Animations / motion  | No motion changed in this pass | PASS |
| Onboarding native question | English picked at 1440: "What is your native language?" lists Spanish, Arabic, Hindi, Chinese (Simplified), Portuguese | PASS |
| No Spanish on French pages | QA build text scan of fr Core 60, guide, modules, speak, exams pages: no Spanish markers. The fr dictionary shows one catalog note comparing with Spanish (upstream catalog content) | PASS |
| Spanish unchanged    | Spanish modules, curricula and lesson definitions hash-identical to HEAD; lesson-content prompts byte-identical; missions differ only by the neutral module blurb | PASS |
| Viewport 2560 4K / 5K | Not captured in this pass | PENDING |

Nothing on this branch is deployed, pushed or merged.
