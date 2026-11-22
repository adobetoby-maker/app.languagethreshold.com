import { packFor } from "../data/language-packs/registry.ts";

type UsageSentence = { target: string; native: string };

/** Find existing context; never generate a sentence or infer a noun's gender/forms. */
export function flashcardUsageExample(
  card: { word: string; language: string; example: string; exampleTranslation: string },
  sentences: readonly UsageSentence[],
): UsageSentence | null {
  const pack = packFor(card.language);
  const locale = pack?.script.segmenterLocale;
  const normalize = (text: string) => text.normalize("NFC").trim().toLocaleLowerCase(locale);
  // Scripts written without word spaces are searched as plain substrings.
  const unspaced = pack !== null && pack.script.wordSeparator === "none";
  // A plural of a card's singular term (-s / -es) may fill a sentence in a cased script.
  const pluralTolerant = pack !== null && pack.script.hasCase;
  if (card.example.trim() && normalize(card.example) !== normalize(card.word))
    return { target: card.example, native: card.exampleTranslation };
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const terms = card.word.split(" / ").map(normalize).filter(Boolean);
  for (const term of terms) {
    // A reading may use a plural of a card's singular term. This only searches an authored
    // sentence; it never displays a guessed inflection.
    const pattern = term
      .split(/\s+/)
      .map((word) => escape(word) + (pluralTolerant ? "(?:s|es)?" : ""))
      .join("\\s+");
    const match = new RegExp(`(^|[^\\p{L}\\p{N}])${pattern}(?=$|[^\\p{L}\\p{N}])`, "iu");
    const sentence = sentences.find(({ target }) =>
      unspaced || (pack !== null && pack.answerRules.tokenizer === "graphemes")
        ? normalize(target).includes(term)
        : match.test(target.normalize("NFC")),
    );
    if (sentence) return sentence;
  }
  return null;
}
