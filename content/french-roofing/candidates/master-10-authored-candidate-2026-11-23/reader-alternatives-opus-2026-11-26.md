# Critique: French Roofing Master 10–12 reader alternatives

This is a read-only, text-level critique of the payload you pasted. I did not open any files or check any hashes, and none of this is approval. Rows not listed have no correction: their full face, speakers, frames and directness are aligned.

## Master 10

**reader:12 V1 and V2: wording.** "ce n'était pas aussi simple" uses a comparative form with nothing to compare against. Replace it with **"ce n'était pas si simple"** in both variants. The rest of each variant stays as is.

**reader:12 V1: alignmentNote misquotes the archive.** The note quotes the archive as 'responsabilité non clairement attribuée'. The archived text actually reads "la responsabilité n'était pas clairement attribuée". Quote it verbatim.

**reader:12: register note to add outside the utterance.** "que je vous dois" commits Rogelio to *vous* toward the boss. The source "Con todo respeto" has no address marker, and Q3 says register is still open. Add a note that the *vous* comes from French, not the source. A neutral third variant could be "Avec tout mon respect, ce n'était pas si simple ; …".

## Master 11

**reader:11: parallelism in the symptom list.** The list runs "les étourdissements, les maux de tête, les nausées et **une** transpiration abondante", so the last article breaks the pattern. Use **"et la transpiration abondante"** so all four signs have the same status in the claim. Keep "sont des signes d'épuisement dû à la chaleur" unchanged.

**reader:11: locale note to add outside the utterance.** Québec occupational usage (e.g., CNESST) commonly says "épuisement par la chaleur". Record this as an open locale variant. Do not change the face.

**reader:12: missing field.** reader:11 has a `clinicalClaimStatus` field but reader:12 does not. Add a parallel one, and state the actual medical ambiguity there: everyday French "coup de chaleur" can mean mild heat illness, while the source means the clinical emergency. Keep the utterance as is.

**`sourceDecisionMappingIssue`: incomplete.** It lists the Q1, Q3 and Q4 mismatches but leaves out the one already inferred on reader:7. Q2's text names electrolytes, but its affectedIds omit reader:7. Add that.

**Note text: number spacing.** Several notes have run-together numbers, which matters most in `temperatureScaleIssue.sourceQuantity`. That field should match the source literally: **"more than 100 degrees"**. Also fix:
- "All4" → "All 4"
- "or14h" → "or 14h"
- "as6h–14h" → "as 6h–14h"
- "substituted112" → "substituted 112"
- "Source911" → "Source 911"
- "not11/12" → "not 11/12"
- "notforecast1" → "not forecast 1"
- "notemergency12" → "not emergency 12"

## Master 12

**Quoting is inconsistent across rows.** reader:2 wraps the whole utterance in guillemets, like M10 and M11. reader:6, 7, 12 and 14 leave the outer frame unquoted. Use one convention for all, with outer « » and inner “ ”:
- **reader:6:** Rogelio : « À elle, je dis : “Excusez-moi de vous déranger, madame ; …” »
- **reader:7:** Rogelio : « Et ensuite, je lui demande : “Me permettriez-vous de vous montrer la zone ?” »

**reader:6: "mention".** "j'aimerais vous parler de quelque chose" turns *mention* (comentarle) into *talk to you about*. Use **"j'aimerais vous faire part de quelque chose que nous avons trouvé"**.

**reader:12: "soften".** "atténuent une demande" can read as reducing what is being asked for. "Soften" here means making the request politer, which is **"adoucissent"**. With the quoting fix:
> Rogelio : « “Quisiera”, “me gustaría” et “podría” sont des mots qui adoucissent une demande. »

The three Spanish terms stay literal, and everything else in the sentence is French.

**reader:14: nested question.** "en utilisant “usted” ou “tú”" is clumsy. Use **"Dois-je vous dire “usted” ou “tú” ?"**, modelled on the French *dire tu / dire vous à quelqu'un*. This keeps the Spanish term names literal without swapping in *tutoyer/vouvoyer*. Full face:
> Rogelio : « Alors, demande-lui poliment : “Dois-je vous dire ‘usted’ ou ‘tú’ ?” »

**reader:14: register note to add outside the utterance.** The French inner question has to choose a form of address, and *vous* mirrors the source "Le hablo". Record this as a forced French choice, not an approved mapping.

**`sourceLanguageObjectiveIssue`: scope too narrow.** It says only reader:12 and 14 explicitly teach Spanish forms. The source English also names usted/tú/señora/doña/Don in reader:3, 5, 8, 13, 15 and 16. Broaden the scope to those rows. The status stays open.
