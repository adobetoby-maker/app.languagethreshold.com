/**
 * Transcript similarity, shared with the native Say It rule. Never an accent score.
 * Every rule comes from the pack (language-pack model section 8 step 10): the speech accent policy,
 * the fold table, ordered sound rules, homophone sets and the speech scoring constants. The pack is
 * required; there is no default language. Self-contained (type-only imports) so tests can load it.
 */
import type { LanguagePack } from "../data/language-packs/types.ts";

export type SpeechWordScore = { score: number; exact: boolean };

type Rules = LanguagePack["answerRules"];

function tokens(text: string, pack: LanguagePack): string[] {
  const value = text
    .normalize(pack.answerRules.unicodeNormalization)
    .toLocaleLowerCase(pack.script.segmenterLocale);
  if (pack.answerRules.tokenizer === "graphemes")
    return [...value].filter((c) => /[\p{L}\p{N}]/u.test(c));
  return value.match(/[\p{L}\p{N}]+/gu) ?? [];
}

function fold(word: string, rules: Rules): string {
  const keep = new Set(rules.neverFold);
  let out = "";
  for (const c of word) out += keep.has(c) ? c : (rules.ligatures[c] ?? rules.fold[c] ?? c);
  return out;
}

function soundKey(word: string, rules: Rules): string {
  for (const rule of rules.soundRules) {
    if (rule.at === "any") word = word.replaceAll(rule.from, rule.to);
    else if (rule.at === "start" && word.startsWith(rule.from))
      word = rule.to + word.slice(rule.from.length);
    else if (rule.at === "end" && word.endsWith(rule.from))
      word = word.slice(0, word.length - rule.from.length) + rule.to;
  }
  return word;
}

function editSimilarity(a: string, b: string): number {
  const x = [...a],
    y = [...b];
  if (Math.max(x.length, y.length) > 48) return 0;
  let row = Array.from({ length: y.length + 1 }, (_, i) => i);
  x.forEach((c, i) => {
    const next = [i + 1];
    y.forEach((d, j) => {
      next[j + 1] = Math.min(next[j] + 1, row[j + 1] + 1, row[j] + (c === d ? 0 : 1));
    });
    row = next;
  });
  return 1 - row[y.length] / Math.max(x.length, y.length, 1);
}

const inOneSet = (sets: readonly string[][], x: string, y: string) =>
  sets.some((set) => set.includes(x) && set.includes(y));

export function speechWordSimilarity(
  expected: string,
  heard: string,
  pack: LanguagePack,
): SpeechWordScore {
  const rules = pack.answerRules;
  const mode = rules.accentPolicy.speech;
  // Comparison keys: the pack's marks folded unless the speech policy is strict.
  const key = (word: string) => (mode === "strict" ? word : fold(word, rules));
  const rawA = tokens(expected, pack),
    rawB = tokens(heard, pack);
  const a = rawA.map(key),
    b = rawB.map(key);
  if (!a.length) return { score: 0, exact: false };
  // fold-except-protected: a protected pair (avó/avô) is never equal unless the two are homophones.
  const same = (i: number, j: number) =>
    a[i] === b[j] &&
    !(
      mode === "fold-except-protected" &&
      rawA[i] !== rawB[j] &&
      inOneSet(rules.protectedPairs, rawA[i], rawB[j]) &&
      !inOneSet(rules.homophoneSets, rawA[i], rawB[j])
    );
  const exact = a.length === b.length && a.every((_, i) => same(i, i));
  const { soundEquivalentCredit, similarityFloor, similarityCredit, minWordLength } =
    rules.speechScoring;
  function credit(i: number, j: number): number {
    if (same(i, j)) return 1;
    const x = a[i],
      y = b[j];
    // Grapheme scripts use ordered written-character comparison, not sound substitutions.
    if (rules.tokenizer === "graphemes") return 0;
    if (inOneSet(rules.homophoneSets, rawA[i], rawB[j])) return soundEquivalentCredit;
    // Sound keys run on the folded key (as the Spanish rule always has) and are folded again, so a
    // rule that writes a mark (French -ez → é) still meets the folded form of that mark.
    const p = key(soundKey(x, rules)),
      q = key(soundKey(y, rules));
    if (rules.soundRules.length > 0 && p === q) return soundEquivalentCredit;
    if (Math.min([...x].length, [...y].length) < minWordLength) return 0;
    const similarity = Math.max(editSimilarity(x, y), editSimilarity(p, q));
    return similarity >= similarityFloor ? similarity * similarityCredit : 0;
  }
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  a.forEach((_, i) => {
    const next = [i + 1];
    b.forEach((_, j) => {
      next[j + 1] = Math.min(next[j] + 1, row[j + 1] + 1, row[j] + 1 - credit(i, j));
    });
    row = next;
  });
  return {
    score: Math.max(
      0,
      Math.min(
        exact ? 100 : 99,
        Math.round((1 - row[b.length] / Math.max(a.length, b.length, 1)) * 100),
      ),
    ),
    exact,
  };
}
