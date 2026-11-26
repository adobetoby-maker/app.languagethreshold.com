# Critique: French Roofing Master 4–6 Reader alternatives

This review covers only the payload you supplied. I did not open or check any files or hashes. Nothing below selects French, resolves a hold, or meets a narrow or full objective.

## Cross-cutting corrections

1. **`teachingFocusEnglish` teaches French instead of English.** M4 r10 gets this right: it names the English forms and says French is "meaning support, not French production targets." The other ten rows make French the practice target, for example "Practise the contrast construction 'C'est X qui…'", "question word order 'Que dit…?'", and "past perfective 'a terminé'". Rewrite them to put the English first:
   - M4 r1: *before + -ing* ("Before putting…"), *step flashing*, *sidewall*, *spec sheet*, *take X out of Y*.
   - M4 r3: elliptical contrast *X rules, not Y*.
   - M4 r13: *What does X say about Y?*
   - M5 r1: *at nine in the morning*, *finish the tear-off*, *on the north side*.
   - M5 r4: *check with*, *black and damp*, *had stains*.
   - M5 r8: *was soft*, *it looked like*, past perfect progressive *had been getting in for years*.
   - M6 r2: *won't arrive complete*, *in stock*.
   - M6 r4: *says it will…, but it's not certain*.
   - M6 r7: *just as durable*, *heavier*, *very similar*.
   - M6 r9: imperative *Send me*, *before deciding*, *I'm going to*.

   Keep the French equivalents only as glosses.

2. **Labels don't match ordinals, and some notes point to a missing sibling.** Five rows have one alternative (`…:1`) labeled **B** with no A: M5 r4, M5 r8, M6 r2, M6 r4 and M6 r9. Relabel them **A**. Two alignment notes refer to an absent A: M5 r4 ("Same content with examiné…") and M6 r9 ("Same request and plan…"). Rewrite both so they stand alone:
   - M5 r4: "revisó = a examiné; la barreta = pied-de-biche; negra y húmeda = noir et humide; una viga tenía manchas = un chevron avait des taches (rafter per pinned English)."
   - M6 r9: "Mándeme (usted) = Envoyez-moi; antes de decidir = avant de décider; voy a hablar = je vais parler (near future); la clienta = la cliente."

3. **Apostrophe typography is inconsistent.** M4 r3, M4 r13, M5 r1 and M5 r4 use a straight `'`. M5 r8, M6 r2, M6 r4 and all archived evidence use `’`. Normalize to `’`.

4. **Some review notes withhold ordinary or standard words.** Narrow these to the real ambiguity:
   - M4 r1: remove "spec sheet" from the domain-review note. *Fiche technique* is a standard term. Keep the review on *solin à gradins* (vs *solin en escalier*) and *sur* vs *contre le mur latéral*. Keep separately the fact that the sheet is fictional and tied to no product.
   - M6 r4: remove "'bodega' as warehouse and 'entrepôt'… need domain review." This is everyday vocabulary, not a trade sense.
   - M6 r2: remove "No product equivalence or technical validation is implied." This line makes no product claim. Equivalence belongs to r7.

## M4

- **r1:** Meaning is complete: before-sequence, placement, taking the sheet out of the box, and no speaker. *Sur le mur latéral* is literal to "on the sidewall." The archived *contre* may be the better trade preposition for flashing set against a wall. Log that as a domain question, not an error.
- **r3 A (*prévaut*):** Fine.
- **r3 B (*fait foi*):** This adds a legal or evidential sense ("is the authentic or binding text"). That conflicts with the row's own contextDependency, which says it is not a legal determination. The alignment note's claim that it avoids a universal claim is not accurate. Replace it with a colloquial match for *manda*:
  > Rogelio : « C’est la fiche qui décide, pas l’habitude. »

  Also update teaching focus: "rules = *prévaut* / *décide*", and drop *faire foi*.
- **r10:** Fine. Optionally, cross-check against archived r11, which already uses *tu*. That makes the pairing consistent without selecting r11.
- **r13 A/B:** Both are grammatical. B's stylistic inversion after *qu'est-ce que* with a noun subject is acceptable.

## M5

- **r1:** 9 a.m., north side, completed past tense, and no speaker are all correct.
- **r4:**
  - *Un pied-de-biche* makes the source's definite article indefinite (*la barreta* / "the pry bar"). Use *avec le pied-de-biche*.
  - Black **and** damp, plus a rafter with stains, are both kept.
  - The viga/chevron note is a specific, legitimate term question. Keep it.
- **r8:** Past soft deck, the near-chimney location, evidential *il semblait que*, and imperfect + *depuis des années* (past ongoing) are all correct. *Dans cette section* is a light calque. *Dans cette partie* is more natural, but this is optional. Add *pontage* next to *platelage* as a deck term for domain review.

## M6

- **r2:** First-person *je* / *nous*, incomplete (not non-delivery), future tense and stock cause are all kept. *Désolé* agrees with masculine *Proveedor* / *Le fournisseur*, so no gender is invented.
- **r4:**
  - The uncertain future factory claim is kept.
  - *Le reste* is an explicitation: English and Spanish have only "it" / null subject. Say this outright in the alignment note ("explicitation, not in source face"), not only as a way to avoid ambiguity.
- **r7:**
  - Equal durability **but** heavier, very similar color, no hedge inserted, and masculine agreement with *bardeau* are all correct.
  - Teaching focus: "*se rapprocher beaucoup*" is not idiomatic as a standalone gloss. Use *très semblable* / *très proche*.
- **r9:**
  - Feminine *la cliente*, formal imperative, near future, and request before decision are all correct.
  - contextDependency says Mrs. Díaz was "introduced in Reader10". That comes later. Change it to: "matches feminine *la clienta* in Reader 5 and Mrs. Díaz named in Reader 10."
  - Source Question 2's text names "Reader 5/9" as masculinizing, but its `affectedIds` leave out reader 9. Don't edit the packet or the row's question list. Add an unresolved note that Question 2's text and affectedIds disagree, for the source owners to decide.

## No change needed

Gates, flags, null `selectedFrench` / `audioScript`, `holdResolved: false`, row IDs, source faces, holds, decision-question pointers, and supplemental counts (6 / 3 / 4) all match the supplied rows.
