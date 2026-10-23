// Built by TAC — 2026-10-23
// The strict content rules a trade pack is held to by the generator (scripts/build-trade-packs.mts)
// and the tests, beyond what the app checks when it loads a pack (src/lib/trade-packs.ts):
//   - one Spanish word per concept for each module (the word its Core 30 lessons teach, or the
//     word a Spanish reviewer chose), in every area;
//   - Spanish terms that must not appear (Spain-only words, rejected coinages, vosotros);
//   - a specification (a figure with a unit) only when the same sentence attributes it;
//   - pool size and variety for the Sentence Builder and Conjugation sections.
// Not loaded by the app. No React, no network, no path aliases: node runs this file directly.

import {
  CONJUGATION_LEVEL_AXES,
  CONJUGATION_LEVELS,
  checkConjugationQuestion,
  conjugationCefr,
  isConjugationLevel,
  type ConjugationAxis,
} from "./conjugation-core.ts";
import { vosotrosForms } from "./core60-validate.ts";
import {
  SENTENCE_BUILD_LEVELS,
  checkSentenceBuildItem,
  isSentenceBuildLevel,
} from "./sentence-build-core.ts";
import {
  CONJUGATION_PACK_RULES,
  SENTENCE_BUILD_PACK_RULES,
  sentenceAvoidKey,
  type TradePackConjugationItem,
  type TradePackSentenceItem,
} from "./trade-packs.ts";
import { wordMatchFoldKey, type WordMatchBoard } from "./word-match-core.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** A case-insensitive pattern that matches whole words only, accents included (unlike \b). */
const word = (pattern: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, "iu");

// ─── One word per concept ────────────────────────────────────────────────────

export interface TradePackConcept {
  name: string;
  /** English that names the concept (a card face or a translation). */
  english: RegExp;
  /** The Spanish every card or sentence for the concept must contain. */
  spanish: RegExp;
  /** That Spanish word, as the prompt and the error messages show it. */
  term: string;
}

export interface TradePackReverseConcept {
  /** A Spanish concept word ... */
  spanish: RegExp;
  /** ... is only ever used for this English concept. */
  english: RegExp;
}

export interface TradePackModuleRules {
  concepts: readonly TradePackConcept[];
  reverse: readonly TradePackReverseConcept[];
  /** Spanish words that must not appear at all (another name for a concept above, Spain-only, coined). */
  banned: readonly RegExp[];
  /** The banned words as a prompt lists them. */
  avoidTerms: readonly string[];
}

const concept = (
  name: string,
  english: string,
  spanish: string,
  term: string,
): TradePackConcept => ({
  name,
  english: word(english),
  spanish: word(spanish),
  term,
});
const reverse = (spanish: string, english: string): TradePackReverseConcept => ({
  spanish: word(spanish),
  english: word(english),
});

/** Every module: Spain-only words and vosotros are checked separately (vosotrosForms). */
const COMMON_BANNED = [
  word("tejados?"),
  word("ordenador(es)?"),
  word("móvil(es)?"),
  word("coches?"),
];

/**
 * Per module, one Spanish word per concept: the word the module's own lessons teach (lead
 * ruling, fix round 1). Roofing: ridge = cumbrera, deck / sheathing = entablado, gutter =
 * canaleta, flashing = tapajuntas, underlayment = subcapa (P1 reviews), lanyard = eslinga (the
 * roofing lessons' word), so a load sling is an estrobo. Gutters and siding: the terms of their
 * Core 30 lessons (public/lesson-content/es/<module>.json): gutter outlet = salida, scupper =
 * gárgola, overflow scupper = rebosadero, gutters lanyard = cordón de seguridad; siding has no
 * lanyard term, so acollador.
 */
export const TRADE_PACK_MODULE_RULES: Readonly<Record<string, TradePackModuleRules>> = {
  roofing: {
    concepts: [
      concept("ridge", "ridges?", "cumbreras?", "cumbrera"),
      concept("deck", "(roof |soft )?decks?|decking|sheathing", "entablados?", "entablado"),
      concept("gutter", "gutters?", "canaletas?", "canaleta"),
      concept("lanyard", "lanyards?", "eslingas?", "eslinga"),
      concept("flashing", "flashings?", "tapajuntas", "tapajuntas"),
      concept("underlayment", "underlayments?", "subcapas?", "subcapa"),
      concept("sling", "slings?", "estrobos?", "estrobo"),
      concept("downspout", "downspouts?", "bajadas? de agua", "bajada de agua"),
      concept("starter strip", "starter strips?", "hileras? inicial(es)?", "hilera inicial"),
    ],
    reverse: [
      reverse("eslingas?", "lanyards?"),
      reverse("estrobos?", "slings?"),
      reverse("cumbreras?", "ridges?"),
    ],
    banned: [
      word("canal[oó]n(es)?"),
      word("canal(es)?"),
      word("sub-capas?"),
      word("caballetes?"),
      word("cubierta blanda"),
      word("forro de techo"),
      word("barretas?"),
      word("acollador(es)?"),
      ...COMMON_BANNED,
    ],
    avoidTerms: [
      "canalón",
      "canal",
      "sub-capa",
      "caballete",
      "cubierta blanda",
      "forro de techo",
      "barreta",
      "acollador (say eslinga)",
      "eslinga for a load sling (say estrobo)",
      "tejado",
    ],
  },
  gutters: {
    concepts: [
      concept("gutter", "gutters?", "canaletas?", "canaleta"),
      concept("downspout", "downspouts?", "bajantes?", "bajante"),
      concept("hanger", "hangers?", "ganchos?", "gancho"),
      concept("end cap", "end caps?", "tapas?", "tapa"),
      concept("miter", "miters?|mitered|mitre", "ingletes?", "inglete"),
      concept("scupper", "(?<!overflow )scuppers?", "gárgolas?", "gárgola"),
      concept("overflow scupper", "overflow scuppers?", "rebosaderos?", "rebosadero"),
      concept("outlet", "(?<!(electrical|power) )outlets?", "salidas?", "salida"),
      concept("elbow", "elbows?", "codos?", "codo"),
      concept("sealant", "sealants?", "selladore?s?", "sellador"),
      concept("fascia", "fascias?", "fascias?", "fascia"),
      concept("lanyard", "lanyards?", "cord(ón|ones) de seguridad", "cordón de seguridad"),
      concept("soffit", "soffits?", "sofitos?", "sofito"),
    ],
    reverse: [
      reverse("canaletas?", "gutters?"),
      reverse("eslingas?", "slings?"),
      reverse("bajantes?", "downspouts?"),
      reverse("gárgolas?", "scuppers?"),
      reverse("rebosaderos?", "overflow"),
      reverse("ingletes?", "miters?|mitered|mitre"),
      reverse("desagües?", "drains?|drainage"),
    ],
    banned: [
      word("canal[oó]n(es)?"),
      word("canal(es)?"),
      word("bajadas?"),
      word("plaf[oó]n(es)?"),
      ...COMMON_BANNED,
    ],
    avoidTerms: [
      "canalón",
      "canal",
      "bajada",
      "desagüe for the gutter outlet (say salida)",
      "plafón (say sofito)",
      "eslinga for a lanyard (say cordón de seguridad)",
      "tejado",
    ],
  },
  siding: {
    concepts: [
      concept("siding", "siding", "revestimientos?", "revestimiento"),
      concept("vinyl", "vinyl", "vinilo", "vinilo"),
      concept("fiber cement", "fiber[- ]cement", "fibrocemento", "fibrocemento"),
      concept("house wrap", "house ?wraps?|building wraps?", "barreras?", "barrera"),
      concept("J-channel", "j[- ]channels?", "canal(es)? J", "canal J"),
      concept("F-channel", "f[- ]channels?", "canal(es)? F", "canal F"),
      concept("starter strip", "starter strips?", "tiras? de arranque", "tira de arranque"),
      concept("soffit", "soffits?", "sofitos?", "sofito"),
      concept("fascia", "fascias?", "fascias?", "fascia"),
      concept("corner post", "corner posts?", "esquineros?", "esquinero"),
      concept("trim board", "trim boards?", "molduras?", "moldura"),
      concept("flashing", "flashings?", "tapajuntas", "tapajuntas"),
      concept("lap", "laps?|overlaps?|overlapping", "traslap\\p{L}*", "traslape"),
      concept("lanyard", "lanyards?", "acollador(es)?", "acollador"),
    ],
    reverse: [
      reverse("eslingas?", "slings?"),
      reverse("revestimientos?", "siding"),
      reverse("sofitos?", "soffits?"),
      reverse("fibrocemento", "fiber[- ]cement"),
      reverse("vinilo", "vinyl"),
    ],
    banned: [
      word("plaf[oó]n(es)?"),
      word("siding"),
      word("postes? de esquina"),
      word("barreras? de humedad"),
      ...COMMON_BANNED,
    ],
    avoidTerms: [
      "plafón",
      "siding (in Spanish text)",
      "poste de esquina (say esquinero)",
      "barrera de humedad (say barrera)",
      "eslinga for a lanyard (say acollador)",
      "tejado",
    ],
  },
};

const match = (pattern: RegExp, text: string) => pattern.exec(text)?.[0] ?? "";

/**
 * Concept problems for one English / Spanish pair (a card, or a sentence and its translation):
 * an English concept named without its Spanish word, a Spanish concept word used for something
 * else, or a banned Spanish term. Empty list = fine, and always empty for a module without rules.
 */
export function conceptProblems(moduleId: string, english: string, spanish: string): string[] {
  const rules = TRADE_PACK_MODULE_RULES[moduleId];
  if (!rules) return [];
  const problems: string[] = [];
  const pair = `"${spanish}" = "${english}"`;
  for (const item of rules.concepts) {
    if (item.english.test(english) && !item.spanish.test(spanish)) {
      problems.push(
        `${pair}: ${item.name} is always "${item.term}" in this pack (one Spanish word per concept)`,
      );
    }
  }
  for (const item of rules.reverse) {
    if (item.spanish.test(spanish) && !item.english.test(english)) {
      problems.push(
        `${pair}: "${match(item.spanish, spanish)}" names one thing only in this pack, and the English does not say it`,
      );
    }
  }
  for (const banned of rules.banned) {
    const match = banned.exec(spanish);
    if (match)
      problems.push(
        `${pair}: "${match[0]}" is not used in this pack (another word for the concept, or not neutral Latin American Spanish)`,
      );
  }
  return problems;
}

/** Concept problems on every pair of a Word Match board. */
export function wordMatchConceptProblems(moduleId: string, board: WordMatchBoard): string[] {
  return board.pairs.flatMap((pair) => conceptProblems(moduleId, pair.english, pair.target));
}

// ─── Specifications and variety of Spanish ───────────────────────────────────

const SPEC =
  /\d+(?:[.,/]\d+)?\s*(?:pulgadas?|pulg\.?|pies?|grados?|libras?|lb|cm|mm|centímetros?|milímetros?|metros?|%|por ciento|psi)(?![\p{L}])/iu;
const ATTRIBUTION =
  /fabricante|plano|planos|\bplan\b|código|instrucciones|especificaci|ficha técnica|norma|manual|etiqueta|inspector/iu;

/**
 * A figure with a unit (a size, slope, distance, temperature, ...) must be attributed in the same
 * sentence: to the manufacturer, the plan, the code, the instructions. Never a universal spec.
 */
export function specProblems(spanish: string): string[] {
  const spec = SPEC.exec(spanish);
  if (spec && !ATTRIBUTION.test(spanish)) {
    return [
      `"${spanish}": "${spec[0]}" is a specification; say whose it is in the same sentence (según el fabricante, el plano, el código)`,
    ];
  }
  return [];
}

/** Vosotros, and the rules above, on a Spanish text and its English. */
function spanishProblems(moduleId: string, english: string, spanish: string): string[] {
  const problems = [...conceptProblems(moduleId, english, spanish), ...specProblems(spanish)];
  const vosotros = vosotrosForms(spanish);
  if (vosotros.length > 0) {
    problems.push(`"${spanish}": vosotros (${vosotros.join(", ")}); use ustedes`);
  }
  return problems;
}

// ─── Sentence Builder ────────────────────────────────────────────────────────

export const SENTENCE_BUILD_ITEM_RULES = {
  maxTranslationChars: 160,
  maxExplanationChars: 220,
  maxTopicWords: 4,
} as const;

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * The rules one stored Sentence Builder question must meet beyond the live ones: a short lower
 * case topic, punctuation attached to a word (never a token of its own), a short translation and
 * explanation, and the module's Spanish rules. `item` must already pass checkSentenceBuildItem.
 */
export function sentenceItemProblems(moduleId: string, item: TradePackSentenceItem): string[] {
  const rules = SENTENCE_BUILD_ITEM_RULES;
  const problems: string[] = [];
  const label = `"${item.targetSentence}"`;
  if (wordCount(item.topic) > rules.maxTopicWords || item.topic !== item.topic.toLowerCase()) {
    problems.push(
      `${label}: topic "${item.topic}" must be 1-${rules.maxTopicWords} lower case words`,
    );
  }
  const loose = item.tokens.filter((token) => /^[\p{P}\p{S}]+$/u.test(token));
  if (loose.length > 0) {
    problems.push(`${label}: punctuation stays attached to a word (tokens ${loose.join(" ")})`);
  }
  if (item.englishTranslation.length > rules.maxTranslationChars) {
    problems.push(
      `${label}: the translation is longer than ${rules.maxTranslationChars} characters`,
    );
  }
  if (item.explanation.length > rules.maxExplanationChars) {
    problems.push(
      `${label}: the explanation is longer than ${rules.maxExplanationChars} characters`,
    );
  }
  if (/\s{2,}/.test(item.targetSentence)) problems.push(`${label}: double space`);
  problems.push(...spanishProblems(moduleId, item.englishTranslation, item.targetSentence));
  return problems;
}

/**
 * Pool rules for a Sentence Builder section: every question valid for its level and the module's
 * rules, at least SENTENCE_BUILD_PACK_RULES.minItemsPerLevel per level, no sentence twice, and
 * no two sentences of a level with the same opening (the game's `avoid` compares the first 30
 * characters). Empty list = valid.
 */
export function validateSentenceBuildSection(
  items: readonly unknown[],
  options: { moduleId: string; language: string },
): string[] {
  const errors: string[] = [];
  const perLevel: Record<number, TradePackSentenceItem[]> = { 1: [], 2: [], 3: [] };
  items.forEach((raw, index) => {
    const label = `sentence ${index + 1}`;
    if (!isRecord(raw) || !isSentenceBuildLevel(raw.level)) {
      errors.push(`${label}: level must be 1, 2 or 3`);
      return;
    }
    const checked = checkSentenceBuildItem(raw, raw.level, options.language);
    if (!checked.ok) {
      errors.push(`${label} (level ${raw.level}): ${checked.error}`);
      return;
    }
    const item = { level: raw.level, ...checked.question };
    const problems = sentenceItemProblems(options.moduleId, item);
    if (problems.length > 0) {
      errors.push(...problems.map((problem) => `${label} (level ${raw.level}): ${problem}`));
      return;
    }
    perLevel[raw.level].push(item);
  });

  const sentences = new Set<string>();
  for (const level of SENTENCE_BUILD_LEVELS) {
    const list = perLevel[level];
    if (list.length < SENTENCE_BUILD_PACK_RULES.minItemsPerLevel) {
      errors.push(
        `level ${level} has ${list.length} valid sentences, needs at least ${SENTENCE_BUILD_PACK_RULES.minItemsPerLevel}`,
      );
    }
    const openings = new Set<string>();
    for (const item of list) {
      const key = wordMatchFoldKey(item.targetSentence);
      if (sentences.has(key)) errors.push(`"${item.targetSentence}" is in the section twice`);
      sentences.add(key);
      const opening = sentenceAvoidKey(item.targetSentence);
      if (openings.has(opening)) {
        errors.push(
          `level ${level}: two sentences open with "${opening}" (the game tells them apart by the first 30 characters)`,
        );
      }
      openings.add(opening);
    }
  }
  return errors;
}

// ─── Conjugation ─────────────────────────────────────────────────────────────

export const CONJUGATION_ITEM_RULES = {
  /** At most this many questions of one (level, axis) pool use the same infinitive. */
  maxPerInfinitive: 3,
  maxPerInfinitiveLevel3: 4,
  /** A (level, axis) pool uses at least this many different verbs. */
  minInfinitives: 6,
  maxExplanationChars: 220,
} as const;

/** The minimum pool for a (level, axis). */
export function conjugationPoolMinimum(level: 1 | 2 | 3): number {
  return level === 3
    ? CONJUGATION_PACK_RULES.minItemsLevel3
    : CONJUGATION_PACK_RULES.minItemsPerAxis;
}

/**
 * The rules one stored Conjugation question must meet beyond the live ones: an axis the level
 * tests, "[verb]" in the translation where the blank is, the module's own verbs (when a list is
 * given), and the module's Spanish rules on the sentence and every option.
 */
export function conjugationItemProblems(
  moduleId: string,
  item: TradePackConjugationItem,
  verbs?: ReadonlySet<string>,
): string[] {
  const problems: string[] = [];
  const label = `"${item.phrase}"`;
  if (!CONJUGATION_LEVEL_AXES[item.level].includes(item.axisTested)) {
    problems.push(
      `${label}: level ${item.level} tests ${CONJUGATION_LEVEL_AXES[item.level].join(" / ")}, not ${item.axisTested}`,
    );
  }
  if ((item.phraseTranslation.match(/\[verb\]/g) ?? []).length !== 1) {
    problems.push(`${label}: the translation shows the blank as [verb], once`);
  }
  if (verbs && !verbs.has(item.infinitive.trim().toLocaleLowerCase())) {
    problems.push(`${label}: "${item.infinitive}" is not one of this module's lesson verbs`);
  }
  if (item.explanation.length > CONJUGATION_ITEM_RULES.maxExplanationChars) {
    problems.push(
      `${label}: the explanation is longer than ${CONJUGATION_ITEM_RULES.maxExplanationChars} characters`,
    );
  }
  const filled = item.phrase.replace("___", item.correctConjugation);
  problems.push(...spanishProblems(moduleId, item.phraseTranslation, filled));
  for (const option of item.wrongOptions) {
    const vosotros = vosotrosForms(option);
    if (vosotros.length > 0)
      problems.push(`${label}: option "${option}" is a vosotros form; use ustedes`);
  }
  return problems;
}

/**
 * Pool rules for a Conjugation section: every question valid for its level (structure, CEFR,
 * axis) and the module's rules, at least 12 per axis at levels 1-2 and 24 "mixed" at level 3,
 * no sentence twice, and enough different verbs per pool for a five-question run to avoid
 * repeats. `verbs` limits infinitives to the module's lesson verbs. Empty list = valid.
 */
export function validateConjugationSection(
  items: readonly unknown[],
  options: { moduleId: string; verbs?: ReadonlySet<string> },
): string[] {
  const errors: string[] = [];
  const pools = new Map<string, TradePackConjugationItem[]>();
  items.forEach((raw, index) => {
    const label = `question ${index + 1}`;
    if (!isRecord(raw) || !isConjugationLevel(raw.level)) {
      errors.push(`${label}: level must be 1, 2 or 3`);
      return;
    }
    const level = raw.level;
    const axis = raw.axisTested as ConjugationAxis;
    if (!CONJUGATION_LEVEL_AXES[level].includes(axis)) {
      errors.push(
        `${label} (level ${level}): axis "${String(raw.axisTested)}" is not one level ${level} tests`,
      );
      return;
    }
    const checked = checkConjugationQuestion(raw, { cefr: conjugationCefr(level), axis });
    if (!checked.ok) {
      errors.push(`${label} (level ${level}): ${checked.error}`);
      return;
    }
    const item = { level, ...checked.question };
    const problems = conjugationItemProblems(options.moduleId, item, options.verbs);
    if (problems.length > 0) {
      errors.push(...problems.map((problem) => `${label} (level ${level}): ${problem}`));
      return;
    }
    const key = `${level}:${axis}`;
    pools.set(key, [...(pools.get(key) ?? []), item]);
  });

  const phrases = new Set<string>();
  for (const level of CONJUGATION_LEVELS) {
    for (const axis of CONJUGATION_LEVEL_AXES[level]) {
      const pool = pools.get(`${level}:${axis}`) ?? [];
      const minimum = conjugationPoolMinimum(level);
      if (pool.length < minimum) {
        errors.push(
          `level ${level} ${axis} has ${pool.length} valid questions, needs at least ${minimum}`,
        );
      }
      const verbs = new Map<string, number>();
      for (const item of pool) {
        const phrase = wordMatchFoldKey(item.phrase);
        if (phrases.has(phrase)) errors.push(`"${item.phrase}" is in the section twice`);
        phrases.add(phrase);
        const verb = item.infinitive.trim().toLocaleLowerCase();
        verbs.set(verb, (verbs.get(verb) ?? 0) + 1);
      }
      const cap =
        level === 3
          ? CONJUGATION_ITEM_RULES.maxPerInfinitiveLevel3
          : CONJUGATION_ITEM_RULES.maxPerInfinitive;
      for (const [verb, count] of verbs) {
        if (count > cap)
          errors.push(`level ${level} ${axis}: "${verb}" is used ${count} times (at most ${cap})`);
      }
      if (pool.length > 0 && verbs.size < CONJUGATION_ITEM_RULES.minInfinitives) {
        errors.push(
          `level ${level} ${axis} uses ${verbs.size} different verbs, needs at least ${CONJUGATION_ITEM_RULES.minInfinitives}`,
        );
      }
    }
  }
  return errors;
}
