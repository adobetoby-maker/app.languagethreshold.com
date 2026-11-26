**Read-only critique of the 35 rows (36 variants), from the pasted text only; nothing was opened, run or written.**

No variant drops a speaker, narrator frame, causal connector, condition or absolute. `toujours`, `jamais`, `doit`, `peut`, the categorical `coupe`/`entre`/`s'infiltre`, `de nombreuses années`, and the tu (Kevin) / vous (Don Ernesto) split are all intact. Rows not listed below need no language change.

## Wording corrections

| Row | Current | Problem | Proposed |
|---|---|---|---|
| M1 R6 | `parce qu'il y coule plus d'eau` | Without `ne`, `plus d'eau` can read as "no more water", the opposite of the source. | `parce qu'il y coule davantage d'eau` |
| M1 R9 | `un rang sur un autre` | Unidiomatic; the "and" of "and then" is also dropped. | `d'abord la bande de départ, et ensuite les bardeaux d'asphalte, un rang par-dessus l'autre` |
| M1 R11 | `car ces jonctions…` | Every other "because" in the lesson is `parce que`, and `porque` is a named objective connector. | `parce que ces jonctions sont les points faibles` |
| M1 R12 | `le chapeau de faîtage` | Not an established roofing term as far as I know; it reads as a calque. | `la faîtière` as the generic ridge cap, with the product and locale term left open |
| M2 R5 | `jamais à l'œil` | `à l'œil` also means "for free", so the line can read "never done for free". | `et on ne le fait jamais au jugé` |
| M2 R9 | `que lorsque c'est trop tard` | Minor: grammatical but loose. | `que lorsqu'il est trop tard` |
| M2 R11 | `le schéma de pose sur chaque rang` | `de pose` adds "installation" to a bare "pattern"; `sur chaque rang` is weaker than `à chaque rang` for "every course". | `on vérifie le motif à chaque rang` |
| M3 R6 | `Ce clou trop haut` | English says "that high nail" and Spanish `muy alto`; `trop` is in neither source for this line. | `Ce clou placé haut`, or keep `trop haut` and record it as carried over from R5 |
| M3 R7 | `colmate-le` | `colmater` means plug or fill, which implies a method; the source says only "seal". | `scelle-le`, which also matches `bande de scellement` in M2 R10 |
| M3 R9 | `elle doit être à fleur` | Bare `à fleur` is elliptical; it normally takes a complement. | `elle doit affleurer, pas plus bas` |
| M3 R11 v2 | `pas trop profondément` | Heavier than needed and does not echo R10's `trop enfoncé`. | `ne l'enfonce pas trop` |
| M3 R16 | `vérifiez-le vous-même aussi` | Clunky, and it follows English "yourself" where Spanish `usted también` is just "you too". | `vérifiez-le vous aussi, s'il vous plaît` for the Spanish reading; keep the current one for the English reading |

## Source differences not recorded on the row
These need a `sourceLanguageMeaningDifference` entry, as M1 R6 and M2 R9 already have.

- **M1 R9:** Spanish `hilera inicial` is a starter *course*; English says starter *strip*. `bande de départ` follows English.
- **M1 R11 and M2:** English uses "joints" for both; Spanish separates `uniones` from `juntas`. The French follows Spanish (`jonctions` / `joints`) without saying so.
- **M1 R12:** Spanish has bare `el caballete` where English has "ridge cap", and uses `caballete` here but `cumbrera` for the ridge in R7 and R13.
- **M3 R5:** Spanish `muy alto` is "very high"; English says "too high". The alignment note's "'Muy alto' is trop haut" is wrong: `trop` follows English.
- **M3 R10:** `le vent peut le soulever` is ambiguous between nail and shingle, as in English. Spanish `la` points only to the shingle.
- **M3 R16:** the "yourself" / `usted también` difference in the table above.

## Alignment notes that describe different French from the candidate

| Row | Note says | Candidate has |
|---|---|---|
| M1 R9 | `un rang au-dessus de l'autre` | `un rang sur un autre` |
| M1 R12 | `Enfin`; `les bardeaux de faîtage` | `À la fin`; `le chapeau de faîtage` |
| M2 R3 | `pénètre` | `entre` |
| M2 R7 | `directement` | `tout droit` |
| M2 R10 | `bande d'étanchéité` | `bande de scellement` |
| M2 R11 | `motif`; `ligne de craie au besoin` (also in the unresolved note) | `schéma de pose`; `ligne au cordeau à craie quand c'est nécessaire` |
| M2 R14 | `sont bien faits` | `sont corrects` |
| M2 R15 | `est une erreur`; `on ne fait pas cela ici` | `c'est une erreur`; `ça ne se fait pas ici` |
| M3 R4 | `motif de clouage` | `schéma de clouage` |
| M3 R7 | `scelle-le` | `colmate-le` |

M1 R3's candidate is character-for-character the archived French as pasted, yet `matchesArchivedFrenchAfterWhitespaceApostropheNormalization` is `false`. M3 R3, in the same situation, is `true`.

## Uncertainty to keep as notes, not corrections
- **Attic (M1 R13):** `grenier` is the everyday word; ventilation contexts usually use `combles` (France) or `entretoit` (Québec). No note currently flags this.
- **"Fires" (M3 R8):** bare `tirer un clou` can mean pulling a nail, so the added `à la cloueuse` is justified and documented. I have no cleaner rendering that keeps "fires" without it.
- **Don Ernesto (M3 R16):** context row R15 still has `M. Ernesto`, so the name form is inconsistent across the two rows until one is chosen.
- **`on` / `nous` with `tu` (M3 R12):** `on l'ajustera ensemble` would be more natural, but Rogelio uses `nous` throughout, so the current form is consistent.
