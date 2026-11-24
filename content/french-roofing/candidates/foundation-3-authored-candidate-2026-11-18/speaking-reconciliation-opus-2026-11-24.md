# Critique: French Roofing Foundation 1–3 speaking reconciliation

All corrections below touch only `speaking.*` fields. Candidate rows, activities, forms and dictionary mappings stay as they are. Gates stay false. This is not an approval of anything.

## Cross-cutting

1. **`holdReason` is the same text in all three lessons, and some of it doesn't apply.** Lesson 2 has no source-language adaptation issue. Replace it in each lesson with a list of exactly which parts of `sourceObjectiveEnglish` and `sourceSpeakingEnglish` are unmet (given per lesson below).
2. **Missing `closureProvenance` in Lessons 1 and 2.** "Thank you." is a newly authored closure in both, so add `closureProvenance` the way Lesson 3 does.
3. **Mixed apostrophes in speaking fields.** These fields mix straight `'` and curly `’`:
   - Lesson 1 `candidateOpeningEnglish` and the word bank use `I’m`, but source line 1 has `I'm`.
   - The French arrays mix `m'appelle` with `d’équipe` and `s’il`.
   
   Use the source byte form wherever a speaking string claims to quote a source line, and pick one convention for authored French. Leave the curly form in `activity:write` (L1) as is, since activities are out of scope.
4. **Keep parallel arrays in sync.** Every turn change below must also be made in `expectedLearnerTurns*`, `expectedAllLearnerTurns*`, `turnSequenceEnglish` and the word bank.

## Foundation 1

1. **Partner cue 1 doesn't fit.** "What would you like to know?" answers a question nobody asked; the learner only introduced themself.
   - Change it to: "Good morning, Luis. Welcome to the crew." / « Bonjour, Luis. Bienvenue dans l'équipe. »
2. **Partner cue 2 announces fast speech instead of showing it.** "I talk very fast" means "Slower, please" comes before anything fast has been said. The French also drops the article ("Je suis chef d’équipe" means "I'm a crew lead", not "the crew lead").
   - Change it to: "Yes, I'm the crew lead. The list says: the harness, the rope and the hammer." / « Oui, je suis le chef d'équipe. La liste indique : le harnais, la corde et le marteau. »
   - Carry line 6 in the context instead: add "The crew lead talks very fast." to `practiceContextEnglish`, and « Le chef d'équipe parle très vite. » to `contextFrench`.
   - Flag this in `provenance` as an adaptation of line 6, not a quotation.
3. **Partner cue 3** becomes the slow re-read: "Of course. The list says: the harness… the rope… and the hammer." The learner's final turn ("Please repeat the list. Thank you.") stays the same.
4. **Anchors and provenance don't match what is used.**
   - Provenance cites line 2 and `sourceAnchors` cites card 5, but nothing about the ladder appears in the speaking. Remove both.
   - Card 9 "Good morning." is used but not anchored. Add it.
5. **Goal wording.** "introduce Luis" / « présenter Luis » should be "introduce yourself as Luis" / « vous présenter comme Luis », since the learner plays Luis.
6. **Make the incomplete objective explicit.** Replace `holdReason` with: "Unmet: the source pronunciation objective (Spanish vowels and sounds; not adopted for the English target); 'ask how to say two tools' (card 10 and line 5 are not used, pending the line-5 adaptation decision); card 2 and line 4 shingle/tile."

## Foundation 2

1. **The opening and the first exchange repeat each other.** The learner says "We start at six in the morning." The partner then says "Good morning" (a late greeting) and asks about the sheet, and the learner repeats the same fact. Revised sequence:

   | Turn | English | French |
   |---|---|---|
   | L0 (unchanged) | We start at six in the morning. | On commence à six heures du matin. |
   | P1 | Thanks. And how long until the truck arrives? | Merci. Et dans combien de temps le camion arrive-t-il ? |
   | L1 | The sheet says the truck arrives in twenty minutes. | La fiche indique que le camion arrive dans vingt minutes. |
   | P2 | What does the sheet say about the wall? | Que dit la fiche à propos du mur ? |
   | L2 | The sheet says the wall measures ten feet, or about three meters. | La fiche indique que le mur mesure dix pieds, ou à peu près trois mètres. |
   | P3 | And the nail? | Et le clou ? |
   | L3 | The sheet says the nail is one and a half inches long. Thank you. | La fiche indique que le clou fait un pouce et demi de long. Merci. |

2. **French parity error.** The current speaking French says « soit environ trois mètres », which shifts "or about" to "that is, approximately" and differs from the candidate reader line 6 French. Use « ou à peu près trois mètres », as in the table.
3. **Line 7 is cited but not used.** Provenance lists line 7, but `sourceAnchors` doesn't and no turn uses it. The revision above uses it, so:
   - add `line:7` to `sourceAnchors`;
   - add "the nail is" and "one and a half inches long" to the word bank.
   
   If you'd rather not use the nail line, remove line 7 from provenance and narrow the goal to "the wall measurement" instead.
4. **Make the incomplete objective explicit.** Replace `holdReason` with: "Unmet: 'how many bundles you need' (cards 6 and 9; lines 3 and 4); pound and weight (card 5; line 5); 'count' covers only the quoted figures."

## Foundation 3

1. **The final exchange is incoherent.** The partner asks "What about the equipment?" and the learner replies with a question and then closes with "That is my report." That leaves the partner's question unanswered and ends the exchange on an open question. Fix it without supplying any readiness answer:
   - P3: "Anything else?" / « Autre chose ? »
   - L3: "That is my report. Is the equipment ready?" / « Voilà mon rapport. Est-ce que le matériel est prêt ? »
   - Add a hold: "The exchange ends on the learner's open question. No partner reply is authored; readiness is unknown and must not be scored as answered."
   - `closureEnglish` stays "That is my report.", now placed before the question.
2. **Goal leaks internal jargon, and the French doesn't match the English.**
   - "the source roof" / « le toit de la source » should be "the roof in the reading" / « le toit du texte ».
   - "introduce Pedro as crew boss" vs « vous présenter comme chef d'équipe » don't match. Use "introduce yourself as Pedro, the crew boss" / « vous présenter comme Pedro, le chef d'équipe ».
   - Also add "say when it is cold or hot", since turn L2 covers it and the goal doesn't mention it.
3. **Speaking depends on French the source packet left empty.** Line 4 « L'air est froid le matin. » appears in speaking, but the source packet has `conditionalFrench: null` for that line and requires either keeping "air" as the subject or an explicit decision. Add an `internalDecisionHolds` entry: "Line-4 French is a supplement-introduced rendering where the source had none; it awaits qualified French review." Do not change the candidate row itself.
4. **Make the incomplete objective explicit.** Replace `holdReason` with: "Unmet: the ser/estar two-verb contrast (Spanish-specific; no English equivalent adopted); the 'safe' description (card 2; line 7 held)."
5. **Safety: no change needed.** The existing holds (no readiness answer, no safety or climbing authorization) are correct, and the revision in item 1 keeps them intact.
