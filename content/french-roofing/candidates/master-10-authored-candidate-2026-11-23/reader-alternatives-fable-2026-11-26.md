Critique of the pasted Master 10–12 sidecars only; I opened no files and verified no hashes. French usage judgments below are my unqualified opinion, not approval.

## Corrections to candidate French

| Row | Problem | Correction |
|---|---|---|
| M10 R12 V1/V2 | `n'avait été chargé` is an eventive pluperfect ("had been put in charge"). The source is a state: "nobody had that task assigned" / `nadie tenía … asignada`. | `…parce que cette tâche n'était attribuée à personne.` (or `personne n'était chargé de cette tâche`) |
| M10 R12 V2 | `Sauf votre respect` is dated and usually prefaces something blunt or offensive. It is also still vous-marked, so both variants commit to the address the row says is open. | Replace V2's opener with the address-free `Avec tout mon respect, …`. V1 then stays vous-marked and V2 unmarked. |
| M10 R7 | `sur le camion` reads as fixtures on the vehicle. English "on the truck" / `en el camión` equally allows "none carried aboard", which is what the archive's `dans le camion` says. One variant silently picks a reading. | Add Variant 2 identical except `dans le camion`. Record "anchor points on the truck vs supplies aboard" as an open source ambiguity outside the utterance. |
| M11 R6 | `le plus fort de la chaleur` means peak; the source says "the worst" / `lo peor`. | `…avant le pire de la chaleur.` |
| M11 R11 | `épuisement dû à la chaleur` reads as a description, not a fixed clinical label. | Add Variant 2 with `épuisement par la chaleur`. List `épuisement thermique` outside the utterance as a term for the clinical reviewer; select none. |
| M11 R12 | Generic `Le coup de chaleur` sits loosely with `dans ce cas`; Spanish has `Un golpe de calor`. | `Un coup de chaleur est une urgence, et dans ce cas nous appellerons le 911 sans attendre.` |
| M11 R1 | `annonçaient` (imparfait) is inherited from the archive; the source is a completed event ("announced" / `anunció`). | `Les prévisions ont annoncé une vague de chaleur pour toute la semaine, avec plus de 100 degrés l'après-midi.` |
| M12 R2 | Colon followed by `, mais` pulls "but the tone changes" inside the message content. The source has "we found rotten wood" as a parenthetical. | `Le message est le même — nous avons trouvé du bois pourri —, mais le ton change selon la personne.` |
| M12 R14 | `vous dire 'usted' ou 'tú'` can parse as "tell you the word usted", not "address you as". | `Alors, demande-lui poliment : "Dois-je m'adresser à vous en disant 'usted' ou 'tú' ?"` |

## Corrections outside the utterances

- **M10 R12 V2 note:** it justifies the opener against `con todo respeto`. Anchor it to the English target "With all due respect", with the Spanish as secondary evidence.
- **M10 R7 note:** it says "Generic attaches", but the string is `attaches d'arrimage`. Make the note match the string, or drop `d'arrimage`.
- **M11 R1 `temperatureScaleIssue`:** add that French-support readers default to Celsius, so an unmarked "100 degrés" reads as implausible. That is a reason to escalate the decision, not to add a unit.
- **M11 R6 `clockInterpretationIssue`:** it is a bare string, while the sibling issues are objects with `status` and `scope`. Normalize it to `{status: "open", scope: …}`.
- **M12 R6 and R7:** `vous` / `Excusez-moi` / `Me permettriez-vous` are forced French address choices with no marker in the English. Add the same "contextual, not approved mapping" note that R14 carries.
- **M12 R6 note:** "French throughout except no actual Spanish term named here" is garbled. Use "No Spanish term is named in this face; utterance fully French."
- **M12 R14 note:** it covers the inner `vous` but not the outer `demande-lui`. Add that the tu to Kevin rests on Spanish `pregúntale`, is unmarked in English, and is contextual.
- **M12 mapping:** M12 has no `sourceDecisionMappingIssue`, though it has the same mismatches M11 documents. Add one, leaving `affectedIds` untouched, plus these inferred links:
  - R2 to Q3: "rotten wood" against the archive's `bois dégradé` is the severity question; Q3 lists readers 8/9/10. R2's direct Q1 link (usted/tú) does not fit the face.
  - R6 and R7 to Q2: these are the homeowner quote; Q2 lists readers 4/5.
  - R12: its direct Q4 link (inspector) does not fit the softener face; the inferred Q1 link is already there.
- **Typos in notes:** `or14h`, `All4`, `substituted112`, `Source911`, `Readers1/2`, `than11/12`, `links14/15` are missing spaces.

## No change needed

- **M10 R6 V1/V2:** the duty and work-area readings are properly split, and the claim stays Marcos's report.
- **M10 R9:** plain `fatigué`, with everyone/nobody kept.
- **M10 R10:** narrator frame plus nested `m'a expliqué` / `a dit` stay distinct, `le patron` carries no added possessive, and `noir` matches R7.
- **M11 R6 clock:** `six heures` / `deux heures` stay unmarked.
- **M11 R7:** `froide`, `dans la glacière`, `toute la journée` and `aussi` are all present, with no dose added.
- **M11 R11 (apart from the label):** four symptoms, with the direct `sont des signes`.
- **M11 R12 (apart from the article):** `le 911` and `sans attendre` are unsoftened.
- **M12 R12:** the three Spanish terms are literal, the predicate is in French, and no gloss is inserted.
- **M12 `sourceRowsWithSpanishRegisterTerms`:** the list matches the English faces.
- **Counts:** alternative counts are 7/5/5, and all flags are false or null in the pasted text.
