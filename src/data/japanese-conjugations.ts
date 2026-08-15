/**
 * Japanese verb conjugation catalog (offline).
 *
 * Model: stem bases + register × tense — not Romance person tables.
 * Swipe: ← past | present → · ↑ honorific | plain ↓ · middle = polite -masu
 *
 * て-form ≈ gerund · た-form ≈ plain past / participle-like
 */

export type JapaneseRegister = "plain" | "polite" | "honorific";
export type JapaneseTense = "present" | "past";

export interface JapaneseBases {
  a: string; // 未然
  i: string; // 連用
  u: string; // 辞書
  e: string; // 命令
  te: string; // て
}

export interface JapaneseConjugationSet {
  infinitive: string;
  reading: string;
  english: string;
  bases: JapaneseBases;
  forms: Record<
    JapaneseRegister,
    Record<JapaneseTense, string>
  >;
  teForm?: string;
  taForm?: string;
}

const CATALOG: Record<string, JapaneseConjugationSet> = {
  // Core group 1 (godan) and group 2 (ichidan) + utility
  "食べる": {
    infinitive: "食べる",
    reading: "taberu",
    english: "to eat",
    bases: { a: "食べ", i: "食べ", u: "食べる", e: "食べ", te: "食べて" },
    forms: {
      plain: { present: "食べる", past: "食べた" },
      polite: { present: "食べます", past: "食べました" },
      honorific: { present: "召し上がります", past: "召し上がりました" },
    },
    teForm: "食べて",
    taForm: "食べた",
  },
  "飲む": {
    infinitive: "飲む",
    reading: "nomu",
    english: "to drink",
    bases: { a: "飲ま", i: "飲み", u: "飲む", e: "飲め", te: "飲んで" },
    forms: {
      plain: { present: "飲む", past: "飲んだ" },
      polite: { present: "飲みます", past: "飲みました" },
      honorific: { present: "召し上がります", past: "召し上がりました" },
    },
    teForm: "飲んで",
    taForm: "飲んだ",
  },
  "行く": {
    infinitive: "行く",
    reading: "iku",
    english: "to go",
    bases: { a: "行か", i: "行き", u: "行く", e: "行け", te: "行って" },
    forms: {
      plain: { present: "行く", past: "行った" },
      polite: { present: "行きます", past: "行きました" },
      honorific: { present: "いらっしゃいます", past: "いらっしゃいました" },
    },
    teForm: "行って",
    taForm: "行った",
  },
  "来る": {
    infinitive: "来る",
    reading: "kuru",
    english: "to come",
    bases: { a: "来", i: "来", u: "来る", e: "来", te: "来て" },
    forms: {
      plain: { present: "来る", past: "来た" },
      polite: { present: "来ます", past: "来ました" },
      honorific: { present: "いらっしゃいます", past: "いらっしゃいました" },
    },
    teForm: "来て",
    taForm: "来た",
  },
  "する": {
    infinitive: "する",
    reading: "suru",
    english: "to do",
    bases: { a: "し", i: "し", u: "する", e: "し", te: "して" },
    forms: {
      plain: { present: "する", past: "した" },
      polite: { present: "します", past: "しました" },
      honorific: { present: "なさいます", past: "なさいました" },
    },
    teForm: "して",
    taForm: "した",
  },
  "見る": {
    infinitive: "見る",
    reading: "miru",
    english: "to see / watch",
    bases: { a: "見", i: "見", u: "見る", e: "見", te: "見て" },
    forms: {
      plain: { present: "見る", past: "見た" },
      polite: { present: "見ます", past: "見ました" },
      honorific: { present: "ご覧になります", past: "ご覧になりました" },
    },
    teForm: "見て",
    taForm: "見た",
  },
  "聞く": {
    infinitive: "聞く",
    reading: "kiku",
    english: "to hear / ask",
    bases: { a: "聞か", i: "聞き", u: "聞く", e: "聞け", te: "聞いて" },
    forms: {
      plain: { present: "聞く", past: "聞いた" },
      polite: { present: "聞きます", past: "聞きました" },
      honorific: { present: "お聞きになります", past: "お聞きになりました" },
    },
    teForm: "聞いて",
    taForm: "聞いた",
  },
  "言う": {
    infinitive: "言う",
    reading: "iu",
    english: "to say",
    bases: { a: "言わ", i: "言い", u: "言う", e: "言え", te: "言って" },
    forms: {
      plain: { present: "言う", past: "言った" },
      polite: { present: "言います", past: "言いました" },
      honorific: { present: "おっしゃいます", past: "おっしゃいました" },
    },
    teForm: "言って",
    taForm: "言った",
  },
  "ある": {
    infinitive: "ある",
    reading: "aru",
    english: "to exist (inanimate)",
    bases: { a: "あら", i: "あり", u: "ある", e: "あれ", te: "あって" },
    forms: {
      plain: { present: "ある", past: "あった" },
      polite: { present: "あります", past: "ありました" },
      honorific: { present: "いらっしゃいます", past: "いらっしゃいました" },
    },
    teForm: "あって",
    taForm: "あった",
  },
  "いる": {
    infinitive: "いる",
    reading: "iru",
    english: "to exist (animate)",
    bases: { a: "い", i: "い", u: "いる", e: "い", te: "いて" },
    forms: {
      plain: { present: "いる", past: "いた" },
      polite: { present: "います", past: "いました" },
      honorific: { present: "いらっしゃいます", past: "いらっしゃいました" },
    },
    teForm: "いて",
    taForm: "いた",
  },
};

export function getJapaneseConjugation(
  key: string,
): JapaneseConjugationSet | undefined {
  const k = key.trim();
  return CATALOG[k] ?? CATALOG[k.toLowerCase()];
}

export function listJapaneseVerbs(): string[] {
  return Object.keys(CATALOG);
}
