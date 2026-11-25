# Core 16–18 speaking reconciliation critique

Scope: the speaking blocks only. Source faces, activities, forms and dictionary stay as they are, and nothing below is a qualified approval. I read the paste as given and did not verify any hashes.

## Cross-cutting (applies to 16, 17 and 18)

**C1. French support for label-reading and spelling turns misstates what the learner says.** In these turns the learner says an English word aloud (a label or a spelled word). The French support translates the word, which suggests the learner speaks French. It also contradicts the partner support in 18, which keeps the English: `la carte A dit « compressor »`. The answer to `Que dit la carte B ?` is « air pressure », not `La pression d’air`.

Pick one convention and apply it everywhere: the English word in guillemets, followed by the French gloss in parentheses.

| Lesson | Current FR | Corrected FR |
|---|---|---|
| 16 | `Clou. Merci.` | `« Nail ». Merci.` (the learner repeats the spelled English word, so no gloss) |
| 16 | `Comment écrit-on nail ?` | `Comment écrit-on « nail » ?` |
| 17 | `Produit.` / `Nombre de clous.` | `« Product » (produit).` / `« Number of nails » (nombre de clous).` |
| 18 | `La pression d’air.` / `La tête du clou.` / `La profondeur. Merci.` | `« Air pressure » (pression d’air).` / `« Nail head » (tête du clou).` / `« Depth » (profondeur). Merci.` |

Update `expectedLearnerTurnsFrench` and `expectedAllLearnerTurnsFrench` to match. This also removes the current article mismatch: 17 uses bare nouns, while 18 adds `la`.

## Core 16

**16-1. The opening makes the identification turn incoherent.** The learner says `Please show me the nail.` and then asks `Is this a nail?`, so they already named the item before identifying it. The `goalEnglish` already says "Request the picture."
- Opening EN: `Please show me the picture.` FR: `Montrez-moi l’image, s’il vous plaît.`
- Update `candidateOpeningEnglish/French`, `turnSequence*[0]` and `expectedAllLearnerTurns*[0]`.
- Word bank: replace `nail.` with `picture.`
- `labelCompositionProvenance`: add "picture is new composition, not a source noun."
- The write activity `Please show me the nail.` stays unchanged.

**16-2.** Apply C1. `reconciliationProvenance` claims "French support translates utterances." That claim only holds once `Clou.` becomes `« Nail ».`

## Core 17

**17-1. The goal does not match the dialogue.** `goalEnglish` says "Ask where the instructions *card* is," but the opening asks where the instructions themselves are, and the partner replies that the document is absent.
- Goal EN: `Ask where the manufacturer instructions are, read two card labels and say which document is needed.`
- Goal FR: `Demander où sont les instructions du fabricant, lire deux étiquettes de cartes et dire quel document est nécessaire.`

**17-2. "its label" in partner cue 1 is ambiguous.** It can be read as card B's own label, and `la carte B porte son étiquette` has the same problem.
- EN: `The document is not here. Card B is only its label. What does card A say?`
- FR: `Le document n’est pas ici. La carte B n’en est que l’étiquette. Que dit la carte A ?`
- Update `partnerCuesEnglish`, `partnerCueSupportFrench` and both turn sequences.

**17-3.** Apply C1.

These parts are fine as written: the open-question pointers (/0, /2, /4) match the source text, the held refs (18) plus the non-held anchors (cards 3, 4, 8, 9 and reader 4) cover all 23 faces, and no count or pattern is implied.

## Core 18

**18-1. Provenance claims safety framing that the context no longer contains (highest priority).** `reconciliationProvenance` says "Practice context states no equipment, pressure, setting or safety decision appears." The new `practiceContextEnglish` dropped the prior draft's "No dimensions or equipment settings are shown." As written, `Is this the compressor?` → `Yes…` has nothing that rules out an equipment-identification or readiness reading. Restore the sentence in both languages:
- EN, append: `Only the printed cards are present; no equipment, pressure value, depth value, setting or safety decision is shown.`
- FR, append: `Seules les cartes imprimées sont présentes ; aucun équipement, aucune valeur de pression ou de profondeur, aucun réglage ni aucune décision de sécurité n’apparaît.`

**18-2. Role wording is inconsistent.** The context says "The other person" / `L’autre personne`, but the role is "partner." Change these to `The partner` / `Le partenaire`.

**18-3. The word bank does not cover the expected turns.** It lists `air pressure`, `nail head` and `depth`, but the turns are `Air pressure.`, `Nail head.` and `Depth.` Add the capitalized forms with periods, as 16 and 17 already do.

**18-4.** Apply C1.

These parts are fine: the dependencies on source questions 3, 4 and 5 match the source text, and the held refs (20) plus cards 4–7 cover all 24 faces.

## Confirmed adequate (no change)

- All three keep the original source objective and speaking text verbatim, and mark completion explicitly as "held and incomplete."
- No units, times, quantities, settings or repair methods appear in any turn.
- Each lesson's three partner cues map one-to-one to its three learner replies, and closure is merged into the final learner turn.
- The prior drafts are kept intact under `speakingPriorDraft20261119`.
- All gates are false and `reviewed: false` throughout.
