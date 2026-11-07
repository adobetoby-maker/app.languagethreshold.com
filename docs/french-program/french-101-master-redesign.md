# French 101 Master curriculum redesign proposal

Status: **source-backed proposal, unreviewed**. Exact pair: French target / English support. This document does not register lessons, change published Spanish content, migrate progress, or approve language quality.

## What the source actually contains

The current Spanish 101 Master has 20 numbered lessons in five blocks (`A` teach-back, `B` case, `C` people, `D` document, `E` capstone), each with 20 card meanings and 12 Reader lines. Its objectives repeat Foundation or Core concepts in all 20 slots. A line-by-line comparison found **123 of 240 Master English Reader lines identical to earlier Foundation/Core English Reader lines**; every Master lesson repeats at least six of its twelve lines. Master 1–4 mirror Foundation introductions, articles, plurals and identity. Master 5–6 also revisit Foundation existence and negation. Master 7–20 revisit Core topics through the final connector lesson. The source files and their SHA-256 hashes, original objectives, repeated-line evidence and the proposed replacement map are pinned in [`french-101-master-curriculum-map.json`](./french-101-master-curriculum-map.json). Regenerate and verify with `python3 scripts/build-french-101-master-map.py` and `python3 scripts/validate-french-101-master-map.py`.

The Spanish Master structure describes applied tasks, but the current 12-line passages often append six earlier lines verbatim. Translating those exact English pairs into French would reproduce beginner practice under a Master label. The [Master 1–3 draft](https://github.com/adobetoby-maker/app.languagethreshold.com/pull/264) exposes this issue; it should remain a non-runtime reference until redesigned.

## Proposed Master outcome

Keep the 20 stage-local lesson numbers and intended `master-french-basics` identity. A Master lesson should require a longer, less prompted task than its Core prerequisite: interpret a short input, respond across multiple turns, handle the listed complication, and give a clear closing or recap. Use French register, reference, tense and discourse forms in context. The table specifies outcomes, not finished lesson prose or a CEFR certification claim.

| # | Proposed task | French focus | Prerequisites | Complication |
| --- | --- | --- | --- | --- |
| 1 | Introduce a new classmate to a group, adapt tu/vous and role information, and answer two follow-up questions without prompts. | tu/vous; je m’appelle; il/elle s’appelle; parce que | foundation:1, core:21, core:30 | The listener asks why the classmate joined and requests a more formal introduction. |
| 2 | Read a short supplies brief, reconcile what is already available with what is missing, and explain a revised packing list. | il faut; avoir besoin de; dans/sur; à la place de | foundation:2, core:14, core:23 | One listed item is unavailable; propose a substitute and confirm it. |
| 3 | Count and allocate shared materials to named recipients, explain a shortage, and agree who will bring the missing items. | il y a; il manque; lui/leur; chacun | foundation:3, core:24, core:30 | Two people need the same item; negotiate a fair allocation. |
| 4 | Distinguish a person’s role from a temporary condition, ask a clarification question and restate the confirmed facts. | être; se sentir; sembler; qui/quel | foundation:5, foundation:6, core:21 | The listener confuses who is responsible with who is available today. |
| 5 | Describe a room from two observations, distinguish people from objects, and explain what moved or is missing. | il y avait vs il y a; être à/se trouver; passé composé | foundation:7, core:18, core:26 | A missing item appears in a new location; update the report. |
| 6 | Recognize a misunderstood request, reformulate it politely, check the answer and summarize the agreement. | pardon; pourriez-vous répéter; si je comprends bien; donc | foundation:9, foundation:10, core:8 | The partner repeats the wrong item or time; correct it without guessing. |
| 7 | Describe a weekly study routine, contrast it with today’s exception and agree on a revised schedule. | imparfait habituel; présent exceptionnel; sauf/au lieu de | core:1, core:10, core:28 | A class time changes; distinguish habitual from one-off actions. |
| 8 | Extract a request and deadline from a message, write a concise reply, and confirm a new meeting time. | demander de; répondre que; conditionnel poli; convenir de | core:3, core:10, core:19 | The suggested time conflicts with another commitment. |
| 9 | Compare two candidate items using relevant properties, give a reason for the choice and check the other person’s preference. | plus/moins/aussi...que; meilleur; cependant | core:4, core:17, core:22 | The preferred item is unavailable; choose a second-best option. |
| 10 | Identify an owner from several clues, describe the item precisely and return it while confirming its ownership. | mon/ma/mes; celui/celle; le/la/les; appartenir à | core:5, core:17, core:23 | Two similar belongings have different owners. |
| 11 | Ask about two people’s preferences and a restriction, place an order and confirm that each person receives the right item. | aimer/préférer; sans; au lieu de; lui/leur | core:11, core:12, core:24 | One requested ingredient is unavailable; offer an acceptable alternative. |
| 12 | Combine ability, permission, location and timing to propose a plan that everyone can follow. | pouvoir; devoir; si + présent; d’abord/ensuite | core:10, core:13, core:19 | One member cannot attend the first time; revise the plan. |
| 13 | Read a short request, distinguish required from optional tasks, assign responsibility and confirm completion criteria. | il faut; devoir; avant de; pour que (optional extension) | core:14, core:24, core:30 | One task must be done before another can start. |
| 14 | Describe a normal sequence, then explain a specific interruption and the next action. | d’habitude; soudain; passé composé vs imparfait | core:16, core:26, core:28 | The routine is interrupted halfway; communicate the revised order. |
| 15 | Give multi-step directions using landmarks, ask the listener to repeat the route and correct a wrong turn. | tourner; traverser; à côté de; si...alors | core:9, core:18, core:30 | The usual entrance is closed; use another route. |
| 16 | Report what is happening now, state a near-future intention and explain what must finish first. | être en train de; aller + infinitif; avant de | core:19, core:20, core:30 | A current delay changes tomorrow’s plan. |
| 17 | Track two people and several objects across turns, use unambiguous references and repair a pronoun misunderstanding. | le/la/les; lui/leur; celui-ci/celle-là; reformulation | core:21, core:23, core:24 | The partner mistakes which object or person a pronoun refers to. |
| 18 | Narrate a completed outing in time order, include who went where and what happened, then answer follow-up questions. | passé composé avec avoir/être; d’abord/puis/finalement | core:26, core:27, core:30 | The partner asks which event happened first and why plans changed. |
| 19 | Explain what usually happened before, what happened once, and how the one event affected the routine. | imparfait habituel vs passé composé ponctuel; depuis | core:26, core:28, core:30 | A single event breaks the established habit; keep the timeline clear. |
| 20 | Open, clarify, compare, decide, report a past event and close a conversation with minimal prompting and suitable register. | tu/vous; clarifier; comparer; négocier; récapituler | core:22, core:24, core:26, core:28, master:1-19 | A plan changes mid-conversation; negotiate a response and recap the agreement. |

## Exact English pair conflict and safe migration

The previous draft batches pin every English card and Reader meaning to the Spanish source. That is useful provenance, but it conflicts with the proposed Master tasks: keeping those pairs verbatim would preserve the beginner readings and limit assessments to recalled beginner sentences. The redesigned French Master must author **new original French passages and matching English support lines**, along with new cards, speaking turns and checks, while retaining the old English pairs in immutable source-provenance files for audit. The new learner-facing English lines should be reviewed for exact correspondence to the new French; do not claim that they are the same as the legacy Spanish-source pairs. A source hash is evidence of lineage, not proof of Master-level quality.

The proposed course is not registered, so the existing French Master 1–3 draft has no learner runtime progress to migrate. Even so, retain stage-local numbers and intended IDs. Before any release, check for real saved records under the target IDs; if any exist, version the revised content and test that progress, saved cards and resume state remain tied to the learner's lesson, without deletion or reset. Keep the Spanish module and published Spanish files unchanged.

## Release gates

1. Resolve the Master-level content decision and author all 20 new objectives, readings, cards, speaking scenarios and checks from this map. The first four lessons should no longer merely reteach greetings, gender and plurals.
2. Have independent French language and curriculum review check register, idiom, sentence-by-sentence English correspondence, prerequisite load and assessment difficulty. Record exact findings and corrections. Qualified human review remains separate from AI review; keep `reviewed:false` until it occurs.
3. Build the exact French/English runtime pair with six modes, Reader, decks, dictionary, speaking, progress and offline support where offered. Verify no Spanish fallback or mixed-language audio.
4. Produce and listen-check French audio with text/voice/locale/hash/duration evidence. Test desktop, narrow iPhone and native app route if shipped, plus signed-in progress and offline behavior. Run required tests and `smoke:e2e` before a main push.

No Master lesson is released or verified by this map. The 68-track French program ledger remains a source audit, not a completion count.
