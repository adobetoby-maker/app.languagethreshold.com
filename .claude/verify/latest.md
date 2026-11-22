# Visual verification — feature/language-packs (2026-11-22 04:25 MST)

Scope: French and Italian Core 60 language packs (34 modules each), Spanish unchanged, non-pack languages unchanged.
Evidence: 132 PNGs in /Users/drive/core60-languages/screens/pwa-r5/ captured after the last layout change (fa6b1c46d) at 375×812, 1440×900, 2560×1440 and 2560×1440@2x, with scrolled-to-end frames; the only later change is one cognate hint string (no layout impact).

| Dimension | Observed (one sentence) | Score /10 |
|---|---|---|
| Scale | Module library, lessons, Reader, Verbs and Practice Lab fill the column without crowding at every width; the 5K Reader study guide ends clear of the Study/Speak bar. | 7 |
| Vision | French and Italian read as one product with Spanish: same header, module cards, six lesson modes and Practice Lab grid. | 7 |
| Correctness | pwa-fr-03-lesson-type-375 shows "TYPE THIS IN FRENCH", "Type in French" and the French accent keys; the Italian -ble→-bile hint was wrong and is fixed in c58003e41. | 7 |
| Relationship | Card hierarchy, gold accents and labels (FRENCH on every Practice Lab card) are consistent; stat labels no longer collide at 2560. | 8 |
| Scope | Only language routing, French/Italian content and owner-listed fixes changed; Spanish captures match base. | 8 |
| Fit | Coming-soon states are consistent ("Bubble Pop and Verb Crush are not available in French yet" with COMING SOON, no PLAY). | 6 |
| Style | Dark navy, gold and serif headings unchanged from the shipped app. | 7 |
| Direction | Ready for production; content polish items are tracked below. | 8 |
| Mobile 375px | pwa-fr-03-lesson-type-375: French prompt, input and 10 accent keys visible above the mode bar; at the end of Type it the Previous/Next lesson cards sit partly under the fixed step tabs (minor). | PASS |
| Desktop 1440px | pwa-fr-01-module-picker-1440: "French 101 · Start from zero", 34 MODULES, Cognates Core 60 "in French", no Spanish. | PASS |
| 4K 2560px | pwa-fr-07-practice-lab-2560: every card labelled FRENCH, Verbs card shows a consistent COMING SOON state, stats readable. | PASS |
| 5K 2560px@2x | pwa-fr-05-reader-5k-end: French museum reading in two columns, "Course readings are not available in the French Reader yet" note, study guide ends above the bar. | PASS |
| Footer visible | -end frames scroll to documentElement.scrollHeight − innerHeight; the last content block is visible above the fixed Study/Speak bar. | PASS |
| Outside input | Opus outside reviewer (/Users/drive/core60-languages/audit/pwa-outside-review-r5.md): "Ship: yes" — no blockers in 132 screenshots, no Spanish on French or Italian screens; fix the Italian -bile hint the same day (done). | PASS |

Gate question: Would I show this to Toby right now without him asking? **YES.**

Open minors (not blocking): Type it end cards under the step tabs at 375; cognate pattern counts in headers exceed cards shown; notes widget overlaps the OPEN LIBRARY button edge at 1440/2560; Italian Say it card "paziente" without article; US-only copy (DOT, OSHA) on some module cards.
