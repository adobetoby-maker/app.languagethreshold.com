/** Transcript similarity, shared with the native Say It rule. Never an accent score. */
export type SpeechWordScore = { score: number; exact: boolean };
function tokens(text: string, language: string): string[] {
  let value = text.normalize("NFC").toLowerCase();
  if (language === "Spanish")
    value = value.replace(
      /[áéíóúü]/g,
      (c) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u" })[c]!,
    );
  if (language === "Japanese") return [...value].filter((c) => /[\p{L}\p{N}]/u.test(c));
  return value.match(/[\p{L}\p{N}]+/gu) ?? [];
}
function soundKey(word: string, language: string): string {
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
export function speechWordSimilarity(
  expected: string,
  heard: string,
  language = "Spanish",
): SpeechWordScore {
  const a = tokens(expected, language),
    b = tokens(heard, language);
  if (!a.length) return { score: 0, exact: false };
  const exact = a.length === b.length && a.every((s, i) => s === b[i]);
  function credit(x: string, y: string): number {
    if (x === y) return 1;
    // CJK uses ordered written-character comparison, not Latin sound substitutions.
    if (language === "Japanese") return 0;
    const p = soundKey(x, language),
      q = soundKey(y, language);
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
