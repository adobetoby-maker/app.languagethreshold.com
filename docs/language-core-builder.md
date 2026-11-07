# Language Core Builder

This is the reusable course map for adding a **target language learned from a specified native language** to Language Threshold. It maps the existing Spanish 101 → English track to a Japanese 101 → English draft. The stages and learner actions mirror Spanish; the grammar and script sequence are authored for Japanese. A mapped draft is not a reviewed or released course.

## Baseline and status

Source audit: Japanese 101 draft branch `feat/japanese-101-course` (November 3, 2026, Mountain time), using `add-language-threshold-module/scripts/audit-module.mjs`. The Spanish baseline was audited at app `44767ef636305ab30de4579b3710d23a49d75cad`.

| Exact pair | Catalog | Valid authored lessons | Teaching/reading/speaking/Reader mapping | Review state |
| --- | --- | --- | --- | --- |
| Spanish → English, `spanish-basics` | Supported | Foundation 10, Core 30, Master 20 | 60/60 mapped | Draft; public-file `reviewed: false` |
| Japanese → English, `japanese-basics` | Draft branch | Foundation 10, Core 30, Master 20 | 60/60 mapped | Draft; `reviewed: false`, no fluent approval |

The Japanese 101 branch has distinct lesson text, English-aligned readings, vocabulary, three cloze checks per lesson, six practice modes, Reader entries, cards, and speaking missions. Its source of truth is `content/japanese-basics/`, built by `scripts/build-japanese-basics.py`; use `--check` to detect stale outputs. Existing Japanese Reader furigana, speech locale, flashcard reading hints, conjugation cards, and kanji study data remain separate. The Japanese Construction Foreman Core is also separate and still lacks a complete authored course. Spanish 101 itself still needs fluent review and has no registered offline lesson pack; source mapping does not prove release readiness.

Japanese 101 needs qualified review of grammar, naturalness, translations, level progression, and beginner script support. Current draft readings are mainly kana and do not yet teach a complete kanji/furigana progression. Its `verbs` lesson-content arrays are empty because the shared form-table trainer models Spanish/English person paradigms; Japanese forms appear in authored grammar and dialogue but do not yet have an equivalent trainer. Narrow-phone Foundation Lesson 1 opened without horizontal overflow in a local QA session; full stage, microphone, physical-device audio, offline, and persistence acceptance remain unverified.

## The mirror rule

Keep the **10 + 30 + 20 stages, six See/Recall/Hear/Type/Say/Write modes, lesson identity, Reader handoff, cards, speaking, review, and progress ownership**. Mirror the teaching *purpose* of each Spanish step, never its literal grammar or example sentences. A Japanese lesson must use natural Japanese, a coherent dialogue, English meaning, appropriate register, and script support. Introduce kanji only with contextual readings; provide furigana where it helps learners, and make kana usable without mandatory romanization. Distinguish dictionary forms, polite/plain forms, particles, counters, and sentence-final nuance rather than forcing Spanish conjugation concepts onto Japanese.

### Clinical vocabulary fidelity

For medical modules, teach the actual term, its direct meaning, and its grammatical use. Keep clinical specificity in both languages, including in cards, Reader lines, speaking prompts, and dictionary entries. Do not replace a term with a vague paraphrase, omit it, or add generic cautions or hedges solely because it appears in a medical context. Check terminology and translation accuracy; put any genuine source ambiguity in the authoring ledger for correction or terminology review. Clinical use remains the learner's or clinician's judgment.

### Foundation 10: start reading, hearing, and surviving a conversation

| # | Spanish 101 step | Japanese 101 mirror: focus and learner outcome |
| --- | --- | --- |
| 1 | Greetings and clear vowels | Greetings; Japanese sound units and hiragana あ–お. Greet and give a name with です. |
| 2 | El, la, un and una | Hiragana rows and basic nouns. Japanese has no articles or noun gender; identify people and objects with これ/それ and は. |
| 3 | One thing or several | Finish core hiragana and introduce katakana. Express one/more than one through quantity and context, not noun plural endings. |
| 4 | Who is speaking? | Self and others; 私, names, and omitted subjects. Ask and answer who someone is, with a polite baseline. |
| 5 | Ser: identity and origin | Identity, occupation, and origin with ～です/～から来ました. Introduce は versus が only in a narrow, contextual contrast. |
| 6 | Estar: location and condition | Location/existence: あります for things, います for people/animals; ～に and simple condition words. |
| 7 | Hay: what exists | Ask what is in a room or nearby: ～があります/います, どこ, and location words. Recycle the existence contrast. |
| 8 | Numbers and age | Numbers, age with ～歳, and first counters. Count real items without treating bare numbers as universal counters. |
| 9 | Simple questions and no | Questions with か and question words; negative polite forms. Ask for something and give a clear no. |
| 10 | Ask for help and review | Repair conversation: わかりません, もう一度お願いします, ゆっくりお願いします. Review hiragana/katakana and basic exchanges. |

### Core 30: build a usable sentence system

| # | Spanish 101 step | Japanese 101 mirror: focus and learner outcome |
| --- | --- | --- |
| 1 | Regular -ar verbs | Verb dictionary versus polite ～ます forms; make present/future statements about study and work. |
| 2 | Regular -er verbs | Verb groups and common ～ます patterns, including する and 来る; avoid a false one-to-one Spanish class analogy. |
| 3 | Regular -ir verbs | Polite past ～ました and negative ～ません; say what happened and what did not. |
| 4 | Adjective agreement | い-adjectives versus な-adjectives; describe people and things without gender agreement. |
| 5 | Mi, tu and su | Possession and relationship with の; name whose item it is and use natural omitted pronouns. |
| 6 | Tener: possessions and needs | Have/exist with あります/います and need with 必要です/～がいります in simple contexts. |
| 7 | Ir and the contraction al | Motion verbs 行きます/来ます/帰ります; destination に/へ and route/departure から. |
| 8 | Questions with qué and cuál | 何 and どれ/どの; distinguish asking what from choosing which. |
| 9 | Where, when and why | どこ, いつ, どうして; answer with place, time, and a short reason. |
| 10 | Time and schedules | Clock time, days, and ～に for scheduled time; arrange a meeting. |
| 11 | Gustar: one thing or many | 好き/嫌い and ～が; say preferences naturally without copying the Spanish subject pattern. |
| 12 | Querer: wants | ～がほしい and ～たい; distinguish wanting a thing from wanting to do something. |
| 13 | Poder: ability and permission | できます, ～てもいいですか, and ～てはいけません; ability and permission are different. |
| 14 | Necesitar and tener que | Necessity with ～なければなりません/～ないといけません, taught through practical requests. |
| 15 | Hacer and daily activities | します and noun + します; describe ordinary activities and commitments. |
| 16 | Reflexive routines | Daily routines in sequence; Japanese does not use Spanish-style reflexive pronouns. |
| 17 | This, that and those | これ/それ/あれ versus この/その/あの + noun; choose an item accurately. |
| 18 | Location prepositions | に/で and position nouns 上/下/中/隣; distinguish being somewhere from doing something there. |
| 19 | Future plans with ir a | Intention and plans with ～つもりです/予定です; time words and present forms. |
| 20 | Actions happening now | ～ています for an action in progress; contrast ongoing action and result states carefully. |
| 21 | Saber and conocer | 知っています versus わかります and できます; distinguish knowing a fact, understanding, and ability. |
| 22 | Comparisons | より/ほうが and いちばん; compare two useful options without changing adjective forms. |
| 23 | Direct object pronouns | Object particle を and natural ellipsis; avoid inventing a Spanish-style object-pronoun lesson. |
| 24 | Indirect objects: to whom? | Recipient に, giving あげます/くれます/もらいます with speaker perspective. |
| 25 | Personal a | People as objects and destinations: を versus に; make the Japanese contrast explicit instead of copying a Spanish rule. |
| 26 | Regular completed past actions | Plain and polite past; say what happened yesterday and sequence events. |
| 27 | Ir and ser in the past | Irregular past of 行く/来る/する and copula でした; report where you went and what something was. |
| 28 | Past routines with the imperfect | Past habits with よく/いつも + past, versus one completed event; no Japanese imperfect tense. |
| 29 | Por and para: first contrasts | Purpose with ～ために/～に and cause with ～ので/～から in beginner-safe contexts. |
| 30 | Connect ideas and review | そして, でも, それから, だから; tell a coherent short story and review particles/forms. |

### Master 20: apply the same core in longer, less prompted tasks

| # | Spanish 101 application | Japanese 101 mirror: communicative task |
| --- | --- | --- |
| 1 | Introduce a classmate | Introduce a classmate politely; name, origin, role, and one follow-up. |
| 2 | Pack for a first class | Read a supplies note and pack the right items; kana and basic counters. |
| 3 | Prepare materials for a group | Coordinate quantities, recipients, and materials for a small group. |
| 4 | Identity or current condition? | Distinguish identity, current state, and where someone is. |
| 5 | Describe a room accurately | Describe what and who are in a room using あります/います and location terms. |
| 6 | Ask instead of guessing | Clarify a misunderstanding, repeat a request, and confirm the answer. |
| 7 | Explain your study routine | Explain a routine with polite present forms and time markers. |
| 8 | Read and write a short message | Read a short message, reply with a plan, and confirm a time. |
| 9 | Choose and describe an item | Compare items using い/な adjectives and この/その/あの. |
| 10 | Return the right belongings | Identify ownership, describe a lost item, and return it politely. |
| 11 | Order around different preferences | Ask preferences, order for two people, and check an unwanted ingredient. |
| 12 | Make a plan everyone can do | Negotiate ability, permission, and timing. |
| 13 | Explain what needs doing | Give a short task list, distinguish need from permission, and confirm completion. |
| 14 | Tell a daily routine in order | Tell a routine with sequence markers and one change to the plan. |
| 15 | Give directions on campus | Give and verify directions using に/で/へ and position nouns. |
| 16 | Separate now from tomorrow | Contrast an action in progress with a future intention. |
| 17 | Refer back without repeating | Continue a conversation using context and natural ellipsis. |
| 18 | Tell what happened yesterday | Narrate a completed outing in polite past. |
| 19 | Contrast a habit and an event | Contrast what usually happened with a specific past event. |
| 20 | Spanish 101 final conversation | Handle a Japanese multi-turn everyday scenario: greet, clarify, choose, plan, report, and close politely. |

## Build each new language core

1. **Define the exact pair and scope.** Use a separate base module ID (for example `japanese-basics`) and stable `foundation-`, Core, and `master-` IDs. Do not attach Japanese data to `spanish-basics`, rename shipped Spanish lessons, or reset progress.
2. **Map concepts before words.** Extract all 60 Spanish objectives as the structural reference, then write a target-language progression like the map above. Record what does not translate directly and the target language's script, register, morphology, segmentation, and audio needs.
3. **Author one source of truth.** For each lesson write its objective, focus, contextual word/phrase set with English meanings, original target-language dialogue or reading with sentence-aligned English, appropriate morphology/verb examples, speaking card, and review dependency. Preserve truthful draft/review fields and provenance. Generate the app's curriculum, Reader, decks, practice, and public lesson files from that source rather than maintaining divergent copies.
4. **Connect the shared experience.** Register the exact pair in catalog and stage manifest; wire See/Recall/Hear/Type/Say/Write, Reader handoff, deck direction, lesson-linked speaking, dictionary links, checkpoints, and account-scoped progress. Verify that Spanish or another language cannot supply content when Japanese is missing.
5. **Audit and verify.** Run the exact-pair module audit. Test Foundation 1/10, Core 1/15/30, Master 1/20, each of six modes, Reader, flashcards, speaking, and persistence on desktop and a narrow phone. Test Japanese text fit and furigana by inspection. Separate source completeness, fluent review, preview, production, and offline evidence in the ledger.

For Japanese specifically, review kana/kanji progression, furigana policy, natural word segmentation, pitch/voice behavior, honorific/polite register, and translations with a qualified Japanese speaker. A text pack can work offline while AI conversation cannot; do not claim offline audio until a device test proves it.

## Source entry points and remaining gaps

Spanish source: `src/data/core60/es/foundation-spanish-basics.json`, `src/data/spanish-basics-core.json`, `src/data/core60/es/master-spanish-basics.json`, plus `src/data/spanish-basics-practice.json` and `src/data/spanish-basics-readers.ts`. Japanese draft source: `content/japanese-basics/{foundation,core,master,master-extensions}.json`; builder `scripts/build-japanese-basics.py`; app wiring `src/data/japanese-basics.ts`, `src/data/japanese-basics-readers.ts`, `src/data/japanese-basics-practice.json`, and stage files in `src/data/core60/ja/`. Shared wiring: `src/data/modules.ts`, `src/data/core60/manifest.ts`, `src/data/speaking-missions.ts`, `src/lib/lesson-words-core.ts`, `src/lib/offline-lesson-tracks.ts`. Other Japanese-specific pieces: `src/data/cjk/japanese-core.ts`, `src/data/japanese-conjugations.ts`, `src/components/reader/FuriganaText.tsx`, and `src/components/flashcards/JapaneseConjugationCard.tsx`.

Run the existing exact-pair audit before and after each build:

```bash
node /Users/drive/.codex/skills/add-language-threshold-module/scripts/audit-module.mjs --repo /absolute/current/app --module spanish-basics --target Spanish --native English
node /Users/drive/.codex/skills/add-language-threshold-module/scripts/audit-module.mjs --repo /absolute/current/app --module japanese-basics --target Japanese --native English
```

The Japanese audit now checks a mapped draft. The substantive release gates above remain even if the structural audit passes.
