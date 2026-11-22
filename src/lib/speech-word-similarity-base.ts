// Built by TAC — 2026-11-21
// The base app's Say It transcript similarity (df664f7c9), verbatim. Owner decisions 2 and 3 of
// 2026-11-21: Spanish, Japanese and every language without a released pack score exactly as the
// base app did. speech-score.ts picks this rule or the pack rule (speech-word-similarity.ts).

import type { SpeechWordScore } from "./speech-word-similarity.ts";

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

function legacyTokens(text: string, language: string): string[] {
  let value = text.normalize("NFC").toLowerCase();
  if (language === "Spanish")
    value = value.replace(
      /[áéíóúü]/g,
      (c) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u" })[c]!,
    );
  if (language === "Japanese") return [...value].filter((c) => /[\p{L}\p{N}]/u.test(c));
  return value.match(/[\p{L}\p{N}]+/gu) ?? [];
}

function legacySoundKey(word: string, language: string): string {
  if (language !== "Spanish") return word;
  for (const [a, b] of [
    ["que", "ke"],
    ["qui", "ki"],
    ["gue", "ɡe"],
    ["gui", "ɡi"],
    ["ce", "se"],
    ["ci", "si"],
    ["ge", "je"],
    ["gi", "ji"],
    ["ll", "y"],
    ["ch", "§"],
    ["h", ""],
    ["v", "b"],
    ["z", "s"],
    ["c", "k"],
  ])
    word = word.replaceAll(a, b);
  return word.replaceAll("ɡ", "g");
}

export function baseSpeechWordSimilarity(
  expected: string,
  heard: string,
  language: string,
): SpeechWordScore {
  const a = legacyTokens(expected, language),
    b = legacyTokens(heard, language);
  if (!a.length) return { score: 0, exact: false };
  const exact = a.length === b.length && a.every((s, i) => s === b[i]);
  function credit(x: string, y: string): number {
    if (x === y) return 1;
    if (language === "Japanese") return 0;
    const p = legacySoundKey(x, language),
      q = legacySoundKey(y, language);
    if (language === "Spanish" && p === q) return 0.85;
    if (Math.min([...x].length, [...y].length) < 4) return 0;
    const similarity = Math.max(editSimilarity(x, y), editSimilarity(p, q));
    return similarity >= 0.65 ? similarity * 0.75 : 0;
  }
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  a.forEach((x, i) => {
    const next = [i + 1];
    b.forEach((y, j) => {
      next[j + 1] = Math.min(next[j] + 1, row[j + 1] + 1, row[j] + 1 - credit(x, y));
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
