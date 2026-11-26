Critique from the supplied payloads only; no files were opened. Nothing in the three packets promotes a row, resolves a hold or claims the objective, and coverage counts match the supplied rows. Only corrections are listed below.

## French face corrections

**M4 reader:10** — `Hé, tu as déjà tout lu ?`
- **Dropped object:** "all of it" / `lo … todo` becomes bare `tout` ("read everything"), and the alignment note maps `ya`, `tú` and `todo` but not `lo`. Either add a variant `Hé, tu l'as déjà lue en entier ?` (`lue` agrees with `la fiche`), or state in the note that `lo`/"it" is absorbed into `tout`.
- **Emphatic subject:** the Spanish explicit `tú` is contrastive; the note treats it as a plain register marker. Note that the emphasis is not rendered, or offer `Hé, toi, tu as déjà tout lu ?`.

**M5 reader:8** — `…dans cette partie… l'eau s'y infiltrait depuis des années`
- **Added locative:** `y` has no counterpart in "had been getting in" / `entraba`, and the note does not disclose it. Drop it or disclose it.
- **Narrowed verb:** `s'infiltrer` (seep) is more specific than "getting in" / `entrar`. Add a plain variant `l'eau entrait depuis des années`, or disclose the narrowing.
- **Section:** `dans cette section` is the direct match for "in this section" / `en esta sección`; `partie` is an unforced loosening.

**M6 reader:4** — `L'usine dit que le reste arrivera…`
- **Antecedent stated as fact:** `contextDependency` says "It = remaining order", but the pronoun could also be the order (`la commande` → `elle`) or the color (`cette couleur` → `elle`). Reword it as an interpretive choice.
- **Missing pronoun-faithful variant:** add `L'usine dit qu'il arrivera à l'entrepôt jeudi, mais ce n'est pas certain.` (`il` = `le reste` from reader:3), with a note that French gender forces the antecedent choice.

**M6 reader:7** — `Il est tout aussi durable, mais plus lourd…`
- **Gender dependency:** `Il` and `lourd` presuppose a masculine noun (`bardeau`) from reader:6, which is held and unselected; the Spanish is feminine (`pesada`, `la teja`). Record this explicitly in `contextDependency` in place of "refers to contextual shingle".
- **Durable:** extend the existing `résistant` note: French `durable` also reads as "sustainable", so the term choice affects the claim's meaning, not just style.

**M4 reader:3**
- **Variant 1 note:** it maps only the Spanish. Add the English "rules", and note that `prévaut` is a formal precedence register against colloquial `manda` / "rules". Variant 2's note disclaims legal `fait foi`, but `prévaut` leans the same way.
- **Variant 2:** `décide` shifts "rules" to "decides". Add the closer `C'est la fiche qui commande, pas l'habitude.`, or disclose the shift.

**M6 reader:2**
- **Locale:** `au complet` is Canadian usage (France: `complète` / `en entier`). Record the locale dependence as a note.
- **Connector:** `car` is written register inside quoted speech; `parce que` matches `porque` / "because" directly. Add it as a variant or disclose.

## Note and metadata corrections

- **M6 reader:9 `contextDependency`:** "Request precedes decision/customer talk" overstates the source. The only stated order is the customer talk before the decision; the sheet request is joined by "and" with no order relative to the talk.
- **M5 reader:8, deck term:** the notes discuss `platelage`, but deck terminology and observed-versus-engineering belong to Q1, whose `affectedIds` omit reader:8. Add an inferred text-based link, as you did for M6 reader:9, leaving `affectedIds` unchanged.
- **M4 reader:13, overlap term:** same gap. `recouvrement` falls under Q1 ("minimum overlap… exact French roofing senses"), but the row links only Q3.
- **Undisclosed archive identity:** four alternatives are verbatim the archived French, and none says so:
  - M4 reader:3 Variant 1
  - M4 reader:13 Variant 1
  - M5 reader:1
  - M6 reader:9 differs from the archive only in `je vais parler à la cliente`; the note covers `cliente` but not the tense change from `je parlerai`.
- **M4 reader:1, preposition note:** "not a ban on fiche technique vocabulary" names the wrong term. The `sur`/`contre` choice concerns `solin à gradins` and `mur latéral`.
- **M4 reader:1, focus wording:** `teachingFocusEnglish` says "before placing"; the source says "Before putting".
- **M6 reader:2, focus wording:** `teachingFocusEnglish` says "will arrive incomplete"; the source is "won't arrive complete".
- **Locale ambiguity unnamed:** the notes say "product/term ambiguity" generically. Name the Canada/France splits as a separate terminology note, with no change to the utterances:
  - `solin à gradins` vs `noquet`
  - `platelage` vs `pontage` / `support de couverture`
  - `bardeau`
- **M4 and M5 `internalNotes`:** "supplier claims are translated faithfully" is M6 boilerplate. M4 has manufacturer-sheet claims, and M5's batch has none.
- **M5 coverage:** `canonicalFrenchProposedBefore` is 0, yet the source context has four non-null `conditionalFrench` rows (readers 1, 6, 7, 9). In M4 and M6 the count equals the conditional rows (3 each). Confirm the 0 is intended, or record why M5 differs.
- **M5 reader:1 hold origin:** the source context marks it `safetyOrMeaningHold: false` with conditional French present, while the canonical row holds it with no linked question. Add a note that the hold comes from the candidate, not the source.
- **M6 `sourceSpeakingEnglish`:** "using the future and ir a" is Spanish grammar in an fr-en lesson. It is immutable here, so record it for the source owner alongside the existing Q2 note.
