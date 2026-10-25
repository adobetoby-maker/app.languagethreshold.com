export interface DocumentWordCard {
  headword: string;
  meaning: string;
  grammar: string;
  context: string;
}
export function documentWordParts(text: string) {
  return text.split(/(\p{L}[\p{L}\p{M}]*(?:['’-]\p{L}[\p{L}\p{M}]*)*)/u);
}
export function isDocumentWord(part: string) {
  return /^\p{L}[\p{L}\p{M}]*(?:['’-]\p{L}[\p{L}\p{M}]*)*$/u.test(part);
}
export function documentWordKey(word: string) {
  return word.normalize("NFC").toLocaleLowerCase();
}

export const INITIAL_DOCUMENT_DEFINITION_LIMIT = 60;
export interface InitialDocumentDefinition {
  side: "en" | "target";
  word: string;
  card: DocumentWordCard;
}
export interface DocumentSentence {
  en: string;
  target: string;
  definitions?: InitialDocumentDefinition[];
}
/** Keep only definitions of actual words in the authoritative aligned passage. */
export function attachInitialDocumentDefinitions(pairs: DocumentSentence[], value: unknown) {
  if (!Array.isArray(value)) return pairs;
  const result = pairs.map((pair) => ({ ...pair, definitions: [] as InitialDocumentDefinition[] }));
  const seen = new Set<string>();
  let accepted = 0;
  for (const entry of value.slice(0, INITIAL_DOCUMENT_DEFINITION_LIMIT)) {
    if (!entry || typeof entry !== "object") continue;
    const { passage, side, word, headword, meaning, grammar, context } = entry;
    if (
      !Number.isInteger(passage) ||
      passage < 0 ||
      passage >= pairs.length ||
      (side !== "en" && side !== "target") ||
      typeof word !== "string" ||
      word.length > 100 ||
      typeof meaning !== "string" ||
      !meaning.trim() ||
      meaning.length > 400 ||
      typeof headword !== "string" ||
      !headword.trim() ||
      headword.length > 200 ||
      (grammar !== undefined && (typeof grammar !== "string" || grammar.length > 800)) ||
      (context !== undefined && (typeof context !== "string" || context.length > 1200))
    )
      continue;
    const normalized = documentWordKey(word);
    if (
      !documentWordParts(pairs[passage][side as "en" | "target"]).some(
        (part) => isDocumentWord(part) && documentWordKey(part) === normalized,
      )
    )
      continue;
    const key = JSON.stringify([passage, side, normalized]);
    if (seen.has(key)) continue;
    seen.add(key);
    result[passage].definitions.push({
      side,
      word: normalized,
      card: {
        headword: headword.trim(),
        meaning: meaning.trim(),
        grammar: grammar ?? "",
        context: context ?? "",
      },
    });
    if (++accepted >= INITIAL_DOCUMENT_DEFINITION_LIMIT) break;
  }
  return result;
}
export function initialDocumentDefinition(
  pair: DocumentSentence,
  side: "en" | "target",
  word: string,
) {
  return pair.definitions?.find(
    (entry) => entry.side === side && entry.word === documentWordKey(word),
  )?.card;
}
