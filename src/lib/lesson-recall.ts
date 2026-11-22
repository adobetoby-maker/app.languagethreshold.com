import type { LessonWord } from "../data/curriculum.ts";
import type { LessonVerb } from "./lesson-content-core.ts";
import type { SpanishPattern } from "../data/spanish-basics.ts";
import type { LanguagePack } from "../data/language-packs/types.ts";
import { shuffle } from "./lesson-practice.ts";
import { gameRoundItems, lessonGameBank, type LessonGameItem } from "./lesson-verb-games.ts";

export interface RecallCard {
  id: string;
  kind: "card";
  label: "Word" | "Phrase" | "Verb";
  word: LessonWord;
  forms: LessonGameItem[];
}
export type RecallItem =
  | RecallCard
  | {
      id: string;
      kind: "match";
      words: LessonWord[];
    }
  | {
      id: string;
      kind: "verb-game";
      game: "choice" | "matching" | "typing";
      source: LessonGameItem[];
    };
const key = (text: string) => text.normalize("NFC").trim().toLocaleLowerCase();

/** One conjugation on the back of a verb card, spelled out with its subject. */
export interface RecallFormLine {
  id: string;
  /** The subject as authored for the form ("yo", "él / ella / usted"). */
  subject: string;
  /** The authored form, unchanged ("conecto"). This is what is read aloud. */
  form: string;
  /** The full line the learner reads ("yo conecto"). */
  text: string;
}

/**
 * Subject and form written as one line (language-pack model section 10). A pack whose forms
 * carry their subject (`includesSubject`) shows the form as authored. Otherwise the subject is
 * joined with a space, except where a join rule elides it ("je" + "aime" → "j'aime").
 */
export function joinSubjectAndForm(subject: string, form: string, pack: LanguagePack): string {
  const { includesSubject, joinRules } = pack.grammar.verbForms;
  if (!subject || includesSubject) return form;
  const first = subject.split(" / ")[0].trim();
  for (const rule of joinRules) {
    if (rule.subject === first && new RegExp(rule.beforePattern, "iu").test(form))
      return `${rule.replaceWith}${form}`;
  }
  return `${subject} ${form}`;
}

/**
 * The authored conjugations of a verb card, each written out with its subject:
 * conectar → yo conecto, tú conectas, él / ella / usted conecta, nosotros conectamos,
 * ellos / ustedes conectan. Forms come only from the lesson's authored verbs or pattern;
 * a card without authored forms has no lines, and nothing is ever generated.
 */
export function recallFormLines(
  card: Pick<RecallCard, "forms">,
  pack: LanguagePack,
): RecallFormLine[] {
  return card.forms.flatMap((item) => {
    const form = item.answer.trim();
    if (!form) return [];
    const subject = item.prompt.includes(" · ") ? item.prompt.split(" · ")[0].trim() : "";
    // A form that already carries its subject is shown as authored, not doubled.
    const carriesSubject = subject
      .split(" / ")
      .some((part) => part && key(form).startsWith(`${key(part)} `));
    return [
      {
        id: item.id,
        subject,
        form,
        text: subject && !carriesSubject ? joinSubjectAndForm(subject, form, pack) : form,
      },
    ];
  });
}

/** One authored deck; games use only this lesson and matching revisits cards already seen. */
export function buildLessonRecall(
  words: readonly LessonWord[],
  verbs: readonly LessonVerb[],
  language: string,
  pattern?: SpanishPattern,
): RecallItem[] {
  const bank = lessonGameBank(verbs, language, pattern);
  const byPair = new Map<string, RecallCard>();
  for (const word of words) {
    if (!word.es.trim() || !word.en.trim()) continue;
    const id = `card:${JSON.stringify([key(word.es), key(word.en)])}`;
    if (!byPair.has(id))
      byPair.set(id, {
        id,
        kind: "card",
        label: word.kind === "phrase" ? "Phrase" : "Word",
        word,
        forms: [],
      });
  }
  for (const verb of bank.meanings) {
    if (!verb.answer.trim() || !verb.meaning.trim()) continue;
    // A gloss may carry a leading infinitive marker ("to speak"); a card matches without it.
    const gloss = (text: string) => key(text).replace(/^to\s+/, "");
    const existing = [...byPair.values()].find(
      (card) =>
        card.word.kind === "term" &&
        key(card.word.es) === key(verb.answer) &&
        gloss(card.word.en) === gloss(verb.meaning),
    );
    const id = existing?.id ?? `card:${JSON.stringify([key(verb.answer), key(verb.meaning)])}`;
    byPair.set(id, {
      id,
      kind: "card",
      label: "Verb",
      word: {
        es: verb.answer,
        en: existing?.word.en ?? verb.meaning,
        kind: "term",
        note:
          byPair.get(id)?.word.note ?? verbs.find((item) => item.infinitive === verb.answer)?.note,
      },
      forms: bank.forms.filter((form) => form.id.startsWith(`${verb.id}:`)),
    });
  }
  const groups = ["Word", "Phrase", "Verb"].map((label) =>
    [...byPair.values()].filter((card) => card.label === label),
  );
  const cards: RecallCard[] = [];
  for (let i = 0; i < Math.max(0, ...groups.map((group) => group.length)); i++) {
    for (const group of groups) if (group[i]) cards.push(group[i]);
  }
  const result: RecallItem[] = [];
  const interval = cards.length < 9 ? 2 : 4;
  const gamePool = gameRoundItems(shuffle(bank.forms));
  const sourceFor = (round: number) =>
    Array.from(
      { length: Math.min(4, gamePool.length) },
      (_, i) => gamePool[(round * 4 + i) % gamePool.length],
    );
  let breaks = 0;
  let games = 0;
  cards.forEach((card, index) => {
    result.push(card);
    const count = index + 1;
    if (count === cards.length || count % interval !== 0) return;
    if (breaks++ % 2 === 1 && gamePool.length) {
      const gameSource = sourceFor(games);
      result.push({
        id: `verbs:${count}`,
        kind: "verb-game",
        game: gameSource.length < 2 ? "typing" : games % 2 === 0 ? "choice" : "matching",
        source: gameSource,
      });
      games++;
    } else {
      const targets = new Set<string>();
      const meanings = new Set<string>();
      const batch = cards
        .slice(Math.max(0, count - interval), count)
        .filter(({ word }) => {
          if (targets.has(key(word.es)) || meanings.has(key(word.en))) return false;
          targets.add(key(word.es));
          meanings.add(key(word.en));
          return true;
        })
        .map(({ word }) => ({ ...word, kind: "term" as const }));
      if (batch.length >= 2) result.push({ id: `match:${count}`, kind: "match", words: batch });
    }
  });
  // Even a very small lesson gets its verb practice between cards.
  if (gamePool.length && !result.some((item) => item.kind === "verb-game") && cards.length > 1) {
    result.splice(Math.ceil(result.length / 2), 0, {
      id: "verbs:short",
      kind: "verb-game",
      game: "typing",
      source: sourceFor(0),
    });
  }
  return result;
}

/** Again returns after two other steps; a repeated click cannot grade the following card. */
export function advanceLessonRecall(
  queue: readonly RecallItem[],
  id: string,
  again = false,
): RecallItem[] {
  if (queue[0]?.id !== id) return [...queue];
  const [first, ...rest] = queue;
  if (again) rest.splice(Math.min(2, rest.length), 0, first);
  return rest;
}
