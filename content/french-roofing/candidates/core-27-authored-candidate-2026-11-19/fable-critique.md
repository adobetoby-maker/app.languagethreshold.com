# Shared batch read-only critique

**Scope:** I reviewed the pasted JSON only. I did not check packet hashes, source packets, or the "source-checked" claim in `internalNotes`, and this is not an approval of any kind.

## Cross-cutting

1. **Article rule contradicts the model sentences (25, 26).** The explanations say "the" marks a known or already-identified item, yet both exchanges open with "Where is the cone?" / "Where is the photo?" before anything is identified. The French versions also drop the rule and give only un/une and le/la equivalents. Proposal: reword to "the = one specific item both speakers can pick out", and mirror it in French.
2. **Unheld commands sit inside held sequences.**
   - 25 `card:11` / `reader:4`, "Move away from the house.", is a move-clear command. The held source speaking objective is "move clear", and the hold on cards 10/12 covers the "safety sequence" and the exclusion boundary.
   - 26 `card:12` / `reader:3`, "Take a photo before and after the repair.", is a photo-sequence instruction. The hold on cards 10/13 leaves "photo sequence" unresolved.
   - Proposal: hold both pairs, or record why each is outside the hold. Neither reaches learner activities.
3. **Hear prompts are inconsistent.** "Écoutez le texte anglais et donnez son sens français" differs from the see prompts ("mot", "en français"), and the hear provenance omits the "prompt is new French composition" label. Proposal: "Écoutez le mot anglais et donnez son sens en français" for 25 and 26, and "la question anglaise" for 27.
4. **"Mot" is used for two-word terms.** This affects hard hat, ground crew, damaged area and repair photo. Proposal: "terme".
5. **Objectives say "Name" for items that are only recognised.** 25 debris and 26 measurement appear only in see/hear activities. The 26 and 27 objectives also omit patterns that are practised ("The area is damaged.", "Is there any sealant?").

## Lesson 25

1. **Speaking role and goal mismatch.** The goal says the learner reads the word card, but the partner reads it ("It says "danger".") and the learner echoes. The learner's "What does card C say?" is also an untaught do-support question. Proposal: make "What does card C say?" a partner cue, so the learner answers "The card says "danger". Thank you."
2. **Write prompt and opening do not match the answer.** "Où est le cône de signalisation ?" expects "Where is the cone?", but a learner could fairly write "traffic cone" or "safety cone". The source is bare "cone" (Spanish "Cono"), so "de signalisation" is an unlabelled narrowing. Proposal: use "le cône" on learner faces and keep the qualifier as an internal sense note.
3. **Say prompt punctuation.** The French sentence is not wrapped in guillemets, unlike 26 and 27. Form 3's French placeholder `« mot »` should be `« [mot] »`.
4. **Terminology `card:7`.** The source headword is "chute", but `meaningEnglish` says "debris chute". Proposal: label "debris" as coming from Reader 7 and the Spanish evidence.
5. **Minor French.** `reader:2` "en bas" weakens "below" (consider "en dessous"), and "la carte C porte « danger »" reads better as "porte le mot « danger »".

## Lesson 26

1. **Speaking cue alignment.**
   - "Where is the photo?" gets "The photo is card B.", which is an identity, not a location.
   - The learner's "This is a repair photo." has no prompt.
   - The final turn only repeats that sentence.
   - Proposal: change cue 1 to "Here. It is card B. What is this?" and replace cue 3 with a new prompt, or drop it.
2. **Form 3 provenance overstated.** "The area is damaged." splits the source term "damaged area"; "area" alone is not a source card. Proposal: label it "new composition derived from card 7".
3. **French term drift.** The candidate is "la photo de la réparation", but `goalFrench` has "la photo de réparation". The say prompt also back-translates naturally to "This is a photo of the repair."
4. **Terminology `card:2`.** The option "le platelage du toit" differs from the "platelage" cited as archived in the hold, so the origin of "du toit" is unlabelled.

## Lesson 27

1. **Sealant gloss breaks the mass-noun teaching.** "Produit" is a count noun in French, so "C'est du produit d'étanchéité" and "Y a-t-il du produit d'étanchéité ?" are unnatural. `contextFrench` already uses "un produit d'étanchéité". The gloss is also broader than "sealant". Proposal: put "le mastic (d'étanchéité)" to qualified review as an option, without selecting it.
2. **Speaking cue alignment.**
   - "What is in picture B?" does not elicit "This is sealant." Proposal: "What is this?"
   - "Please repeat the first word." is ambiguous, since the first word spoken was "This". Proposal: "Repeat the word for picture A."
3. **"Is there any sealant?" has no picture frame.** On its own it can read as an inspection question, which sits next to held `card:15`. Proposal: add a picture or word-card frame.
4. **Vent subtype attributed to the wrong source.** The `card:1` hold and terminology proposal say the "source vent term" specifies ridge or box, but the source English is bare "vent". The subtype comes only from the Spanish evidence. Proposal: reword.
5. **Form 1 provenance.** Only the example is exact source; the pattern "What + have + you + already + past participle?" is new composition and should be labelled so.
6. **`card:15` hold wording.** "Scored safety instruction" mislabels a sealing work instruction.
7. **Role and locale terms.** "Chef d'équipe" (27 `reader:3`), "contremaître" (26) and the options "évent" and "puits de lumière" imply a locale that is not declared. Proposal: record a locale decision before these are selected.
8. **French metalanguage.** "Demande une présence" is awkward. Proposal: "demande s'il y en a".

## No finding

- `heldDecisionRefs` match the held rows shown in all three lessons.
- Formal "vous" is used consistently throughout.
- No held term appears in any learner activity or speaking text.
