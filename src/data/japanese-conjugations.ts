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
  "書く": {
    infinitive: "書く",
    reading: "kaku",
    english: "to write",
    bases: { a: "書か", i: "書き", u: "書く", e: "書け", te: "書いて" },
    forms: {
      plain: { present: "書く", past: "書いた" },
      polite: { present: "書きます", past: "書きました" },
      honorific: { present: "お書きになります", past: "お書きになりました" },
    },
    teForm: "書いて",
    taForm: "書いた",
  },
  "読む": {
    infinitive: "読む",
    reading: "yomu",
    english: "to read",
    bases: { a: "読ま", i: "読み", u: "読む", e: "読め", te: "読んで" },
    forms: {
      plain: { present: "読む", past: "読んだ" },
      polite: { present: "読みます", past: "読みました" },
      honorific: { present: "お読みになります", past: "お読みになりました" },
    },
    teForm: "読んで",
    taForm: "読んだ",
  },
  "買う": {
    infinitive: "買う",
    reading: "kau",
    english: "to buy",
    bases: { a: "買わ", i: "買い", u: "買う", e: "買え", te: "買って" },
    forms: {
      plain: { present: "買う", past: "買った" },
      polite: { present: "買います", past: "買いました" },
      honorific: { present: "お買いになります", past: "お買いになりました" },
    },
    teForm: "買って",
    taForm: "買った",
  },
  "待つ": {
    infinitive: "待つ",
    reading: "matsu",
    english: "to wait",
    bases: { a: "待た", i: "待ち", u: "待つ", e: "待て", te: "待って" },
    forms: {
      plain: { present: "待つ", past: "待った" },
      polite: { present: "待ちます", past: "待ちました" },
      honorific: { present: "お待ちになります", past: "お待ちになりました" },
    },
    teForm: "待って",
    taForm: "待った",
  },
  "話す": {
    infinitive: "話す",
    reading: "hanasu",
    english: "to speak",
    bases: { a: "話さ", i: "話し", u: "話す", e: "話せ", te: "話して" },
    forms: {
      plain: { present: "話す", past: "話した" },
      polite: { present: "話します", past: "話しました" },
      honorific: { present: "お話しになります", past: "お話しになりました" },
    },
    teForm: "話して",
    taForm: "話した",
  },
  "分かる": {
    infinitive: "分かる",
    reading: "wakaru",
    english: "to understand",
    bases: { a: "分から", i: "分かり", u: "分かる", e: "分かれ", te: "分かって" },
    forms: {
      plain: { present: "分かる", past: "分かった" },
      polite: { present: "分かります", past: "分かりました" },
      honorific: { present: "お分かりになります", past: "お分かりになりました" },
    },
    teForm: "分かって",
    taForm: "分かった",
  },
  "思う": {
    infinitive: "思う",
    reading: "omou",
    english: "to think",
    bases: { a: "思わ", i: "思い", u: "思う", e: "思え", te: "思って" },
    forms: {
      plain: { present: "思う", past: "思った" },
      polite: { present: "思います", past: "思いました" },
      honorific: { present: "お思いになります", past: "お思いになりました" },
    },
    teForm: "思って",
    taForm: "思った",
  },
  "知る": {
    infinitive: "知る",
    reading: "shiru",
    english: "to know",
    bases: { a: "知ら", i: "知り", u: "知る", e: "知れ", te: "知って" },
    forms: {
      plain: { present: "知る", past: "知った" },
      polite: { present: "知ります", past: "知りました" },
      honorific: { present: "ご存じです", past: "ご存じでした" },
    },
    teForm: "知って",
    taForm: "知った",
  },
  "作る": {
    infinitive: "作る",
    reading: "tsukuru",
    english: "to make",
    bases: { a: "作ら", i: "作り", u: "作る", e: "作れ", te: "作って" },
    forms: {
      plain: { present: "作る", past: "作った" },
      polite: { present: "作ります", past: "作りました" },
      honorific: { present: "お作りになります", past: "お作りになりました" },
    },
    teForm: "作って",
    taForm: "作った",
  },
  "使う": {
    infinitive: "使う",
    reading: "tsukau",
    english: "to use",
    bases: { a: "使わ", i: "使い", u: "使う", e: "使え", te: "使って" },
    forms: {
      plain: { present: "使う", past: "使った" },
      polite: { present: "使います", past: "使いました" },
      honorific: { present: "お使いになります", past: "お使いになりました" },
    },
    teForm: "使って",
    taForm: "使った",
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
