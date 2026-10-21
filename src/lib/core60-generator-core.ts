// Built by TAC — 2026-10-20
// Pure core of the Core 60 stage generator (scripts/build-core60.mts): the fixed Foundation units
// and Master 20 arc, the prompts and tool schemas for each Anthropic call, parsing of the replies,
// the generator's own quality checks (on top of validateStageFile and validateLessonContent), the
// language pair rule and the token / dollar estimate. No network, no file system, no React, so the
// node tests exercise exactly what the generator sends and enforces.
//
// Two steps per (module, stage), contract in docs/core60-architecture.md:
//   1. the stage curriculum (titles, objectives, focus / grammar, lesson type, block, words, Say it
//      brief): Foundation in one call; Master as an outline call, then one call per block (A to E);
//   2. one call per lesson for the passage and verbs (public/lesson-content/<lang>/<id>.json).
// Every reply is validated; a failing reply is retried with the error list.

import type { LessonGrammar, LessonWord } from "../data/curriculum.ts";
import {
  CONTENT_LIMITS,
  MODEL_FORM_KEYS,
  contentLimitsFor,
  foldText,
  invisibleCharErrors,
  stemOf,
  validateLessonContent,
  wordsOf,
  type ContentLimits,
  type LessonContentLesson,
} from "./lesson-content-core.ts";
import { cleanLessonWords } from "./lesson-words-core.ts";
import {
  CORE60_STAGE_FILE_VERSION,
  stageModuleId,
  type Core60ManifestStage,
  type Core60StageFile,
  type Core60StageKind,
  type Core60StageLesson,
} from "./core60-stage-core.ts";
import { validateStageFile } from "./core60-validate.ts";

// ─── Models and prices ───────────────────────────────────────────────────────

export const CORE60_DEFAULT_MODEL = "claude-sonnet-5-5";
export const CORE60_MODEL_ALIASES: Record<string, string> = {
  sonnet: "claude-sonnet-5-5",
  opus: "claude-opus-5-5",
};

/**
 * Anthropic list prices, USD per million tokens (input, output). Sonnet 5.5 matches
 * src/lib/usage-cost.ts (verified 2026-10-14); Opus 5.5 is the published $4 / $20 rate
 * (platform.claude.com pricing, cached 2026-10-06). Thinking tokens bill as output.
 */
export const CORE60_MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
};

/**
 * Where the calls go. "cli": the logged-in Claude Code CLI (`claude -p`), billed to the owner's
 * Claude subscription (OAuth), never to an API key; "api": the Anthropic API with ANTHROPIC_API_KEY.
 */
export type Core60Provider = "api" | "cli";
export const CORE60_DEFAULT_PROVIDER: Core60Provider = "cli";
/** Default model per provider. Owner decision 2026-10-20: build with Opus on the subscription. */
export const CORE60_PROVIDER_DEFAULT_MODEL: Record<Core60Provider, string> = {
  cli: "claude-opus-5-5",
  api: CORE60_DEFAULT_MODEL,
};

export function resolveModel(raw: string | undefined, provider: Core60Provider = "api"): string {
  if (!raw) return CORE60_PROVIDER_DEFAULT_MODEL[provider];
  const value = raw.trim().toLowerCase();
  return CORE60_MODEL_ALIASES[value] ?? value;
}

/** Dollars for a token count at a model's list price; null for an unpriced model. */
export function costUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const price = CORE60_MODEL_PRICES[model];
  if (!price) return null;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

// ─── Language pairs ──────────────────────────────────────────────────────────

/** The slice of an AppModule the generator reads. */
export interface GeneratorModule {
  id: string;
  name: string;
  category: string;
  blurb: string;
  userRole: string;
  aiPersona: string;
  vocabFocus: readonly string[];
  challengePrompts: readonly string[];
  learnDirection?: "en-target";
  languages?: readonly string[];
}

export interface Core60Pair {
  language: "Spanish" | "English";
  nativeLanguage: "English" | "Spanish";
}

/**
 * The one pair a trade's stages are written in, mirroring scripts/build-lesson-content.mts:
 * English target / Spanish native for the English-for-work modules (learnDirection "en-target"),
 * Spanish target / English native for every other module that supports Spanish for English
 * speakers. `supportsSpanish` is moduleSupportsLearningPair(module, "Spanish", "English").
 */
export function core60PairFor(module: GeneratorModule, supportsSpanish: boolean): Core60Pair | null {
  if (module.learnDirection === "en-target") return { language: "English", nativeLanguage: "Spanish" };
  if (supportsSpanish) return { language: "Spanish", nativeLanguage: "English" };
  return null;
}

// ─── The fixed shape of a stage ──────────────────────────────────────────────

export interface FoundationUnit {
  title: string;
  /** The fixed grammar / sound topic every trade's unit teaches. */
  topic: string;
}

/** F1-F10: the same ten topics for every trade, taught with the trade's own words. */
export const FOUNDATION_UNITS: Record<Core60Pair["language"], readonly FoundationUnit[]> = {
  Spanish: [
    { title: "Sounds and Greetings", topic: "the five vowels, ch, j, ll, rr and the written accent; greetings" },
    { title: "Numbers, Time and Measurements", topic: "numbers 0 to 1,000, clock time, and the measurements and quantities of this work" },
    { title: "Ser and Estar", topic: "ser for what something is, estar for its condition or location" },
    { title: "Have, There Is, Need and Want", topic: "tener, hay, necesitar, querer and hay que + infinitive" },
    { title: "Go, Do and Can", topic: "ir, ir a + infinitive for plans, hacer, poder" },
    { title: "Present Tense", topic: "present tense of regular -ar, -er and -ir verbs for yo, tú, usted, nosotros, ellos" },
    { title: "Questions", topic: "qué, quién, dónde, cuándo, cuánto, cómo, por qué, cuál" },
    { title: "No, Never and How Much", topic: "no, nunca, nadie, nada, todavía no, más, menos, otro" },
    { title: "Polite Requests and Commands", topic: "¿Puede…? and usted commands for everyday verbs" },
    { title: "Words You Already Know and Getting Help", topic: "cognates (-ción, -dad, -ente) and survival phrases" },
  ],
  English: [
    { title: "Sounds and Greetings", topic: "English vowels, th, r, v and b, word stress; greetings" },
    { title: "Numbers, Time and Measurements", topic: "numbers 0 to 1,000, clock time, and the measurements and quantities of this work" },
    { title: "To Be", topic: "am, is, are for who someone is, a condition and a location" },
    { title: "Have, There Is, Need and Want", topic: "have, there is / there are, need, want and have to + verb" },
    { title: "Go, Do and Can", topic: "go, going to + verb for plans, do, can" },
    { title: "Present Tense", topic: "the simple present for I, you, he / she, we, they (the -s for he / she)" },
    { title: "Questions", topic: "what, who, where, when, how much, how many, how, why, which; do / does questions" },
    { title: "No, Never and How Much", topic: "don't, doesn't, never, nobody, nothing, not yet, more, less, another" },
    { title: "Polite Requests and Commands", topic: "Can you…? Could you…? please, and short commands" },
    { title: "Words You Already Know and Getting Help", topic: "cognates (-tion, -ty, -ent) and survival phrases" },
  ],
};

export type MasterBlock = "A" | "B" | "C" | "D" | "E";
export type MasterLessonType = "Teach-back" | "Case" | "People" | "Document" | "Capstone";

export interface MasterBlockSpec {
  block: MasterBlock;
  name: string;
  lessons: readonly number[];
  /** Lesson types a lesson in this block may have (the Roofing Master 20's pattern). */
  types: readonly MasterLessonType[];
  purpose: string;
}

/** The Master 20 arc: five fixed blocks of four lessons (Roofing Master 20 is the reference). */
export const MASTER_BLOCKS: readonly MasterBlockSpec[] = [
  {
    block: "A",
    name: "Explain and teach",
    lessons: [1, 2, 3, 4],
    types: ["Teach-back", "Document"],
    purpose: "train a new worker or explain the system and why it works; read a manufacturer sheet, spec or protocol and explain it",
  },
  {
    block: "B",
    name: "Problems and exceptions",
    lessons: [5, 6, 7, 8],
    types: ["Case", "People"],
    purpose: "the job does not go as planned: a hidden problem, a shortage or substitution, a third party on site, and saying no to an unsafe or improper request",
  },
  {
    block: "C",
    name: "People and leadership",
    lessons: [9, 10, 11, 12],
    types: ["People", "Teach-back"],
    purpose: "give feedback, settle a conflict, keep a team going, and switch register for each listener",
  },
  {
    block: "D",
    name: "Safety and emergencies",
    lessons: [13, 14, 15, 16],
    types: ["Case", "Document"],
    purpose: "an incident and its report, a near miss talked through without blame, a stop-work or emergency call, and an inspector or auditor on site",
  },
  {
    block: "E",
    name: "Documentation and capstone",
    lessons: [17, 18, 19, 20],
    types: ["Document", "People", "Capstone"],
    purpose: "the written report, messages and calls, the final walkthrough with the client or patient, and Lesson 20: the capstone that integrates the whole Master 20 in one day",
  },
];

export function masterBlockOf(n: number): MasterBlockSpec {
  return MASTER_BLOCKS.find((block) => block.lessons.includes(n)) ?? MASTER_BLOCKS[0];
}

/** The B1 to B2 grammar spine, one focus per lesson (Roofing Master 20's, for Spanish). */
export const MASTER_GRAMMAR_SPINE: Record<Core60Pair["language"], readonly string[]> = {
  Spanish: [
    "Connectors for sequence and cause (primero, luego, porque, por eso)",
    "Impersonal se; si + present for general truths",
    "Commands with object pronouns (revísalo, no lo toques)",
    "Antes de / después de + infinitive; hay que",
    "Preterite vs imperfect; conditional for the proposal",
    "Future and ir a; comparisons",
    "Preterite narration; numbers under pressure",
    "Negative commands; subjunctive after no recomiendo que",
    "Present subjunctive after wishes and recommendations",
    "Reported speech; imperfect for background",
    "Future for commitments; encouragement register",
    "Usted / tú switching; softeners (quisiera)",
    "Past narration with time markers",
    "Casi, por poco, podría haber; si clauses",
    "Si + present → future; short radio or phone commands",
    "Formal register; passive se for procedures",
    "Written register; report connectors",
    "Phone and text conventions; conditional politeness",
    "Conditional; subjunctive in conditions (siempre que)",
    "Capstone: integrating the Master 20 grammar",
  ],
  English: [
    "Connectors for sequence and cause (first, then, because, so)",
    "The passive for general rules; the zero conditional (if + present)",
    "Commands with object pronouns (check it, don't touch it)",
    "Before / after + -ing; have to and must",
    "Past simple vs past continuous; would for the proposal",
    "Will and going to; comparisons",
    "Past simple narration; numbers under pressure",
    "Negative commands; I don't recommend that you…",
    "Should, recommend and suggest + verb",
    "Reported speech (she said that…); the past continuous for background",
    "Will for commitments; encouragement register",
    "Formal and informal register; softeners (could you, would you mind)",
    "Past narration with time markers",
    "Almost, nearly, could have + past participle; if clauses",
    "If + present → will; short radio or phone commands",
    "Formal register; the passive for procedures",
    "Written register; report connectors",
    "Phone and text conventions; would for politeness",
    "Conditionals with as long as and unless",
    "Capstone: integrating the Master 20 grammar",
  ],
};

// ─── Context passed into every prompt ────────────────────────────────────────

export interface Core30Context {
  /** Core 30 lesson titles, in order. */
  titles: string[];
  /** Core 30 lesson objectives, in order (same length as titles). */
  objectives: string[];
  /** Core 30 target-language terms (from the module's lesson-content file), deduplicated. */
  terms: string[];
}

export interface StageContext {
  module: GeneratorModule;
  stage: Core60StageKind;
  pair: Core60Pair;
  core30: Core30Context;
}

export const stageId = (ctx: StageContext) => stageModuleId(ctx.stage, ctx.module.id);

const MEDICAL = (ctx: StageContext) => ctx.module.category === "Medical";

export function stageHeadline(ctx: StageContext): string {
  return ctx.stage === "foundation"
    ? `The ${ctx.module.name} Foundation`
    : `The ${ctx.module.name} Master 20`;
}

// ─── Shared prompt rules ─────────────────────────────────────────────────────

function registerRules(ctx: StageContext): string {
  if (ctx.pair.language === "Spanish") {
    return [
      "Spanish register: Mexican / US Spanish as working people in the United States actually say it on this job, including a common loanword only when it is standard job usage (breaker, troca).",
      "A lead speaking to a crew uses the plural ustedes command (revisen, traigan); speaking to ONE person (a customer, a patient, one worker) uses usted, or tú between coworkers when the lesson calls for it. Mark formal / informal in a word's note when it matters.",
      "Write ¿ and ¡ properly. Never coin a word-for-word phrase: use the term people in this work really say; if unsure, pick a different, safer term.",
      "Grammar that native reviewers check: agreement for people (a woman is la electricista, la clienta, la enfermera; a man el electricista); the personal a before a person or people as the direct object (cubrir a mis pacientes, llamar al supervisor); a negative after antes de / sin (antes de tocar nada); measurements with de (el pulso es de 72); and no English calques (say what people say, not a translated slogan).",
      "Units: never mix metric and imperial in one sentence; US jobs measure in feet, inches and pounds (10 pies y 6 pulgadas), medicine in mg and mL. Electrical: a live wire is energizado or con corriente (not prendido); you measure el voltaje.",
    ].join(" ");
  }
  return [
    "English register: plain, current American English as used at work in the United States (short, direct, polite). The learner's native language is Spanish (neutral Latin American Spanish): every native-language text, gloss and note is written in that Spanish, with ¿ and ¡.",
    "Never coin a literal phrase: use the word people in this work really say.",
  ].join(" ");
}

function safetyRules(ctx: StageContext): string {
  const examples =
    ctx.pair.language === "Spanish"
      ? MEDICAL(ctx)
        ? "según la orden del médico, según el protocolo del hospital, la etiqueta dice, según la política"
        : "según el fabricante, según el plano, según el código local, la etiqueta dice, el inspector pide"
      : MEDICAL(ctx)
        ? "per the provider's order, per hospital protocol, the label says, per policy"
        : "per the manufacturer, per the plans, per local code, the label says";
  return [
    "Safety: never present a specific dose, setting, code section, rating or specification as a universal fact. When a number of that kind appears, the SAME sentence names its source (" +
      examples +
      ").",
    MEDICAL(ctx)
      ? "Medical lessons teach communication and verification (read back, confirm, ask, escalate), never a dose, diagnosis or treatment decision of the learner's own."
      : "Trade lessons teach communication and verification (test before you touch, check the label and the plans, stop and ask), never a shortcut around a safety rule.",
    "Avoid stereotypes and anything unsafe.",
  ].join(" ");
}

function wordRules(ctx: StageContext, limits: ContentLimits): string {
  const spanish = ctx.pair.language === "Spanish";
  return [
    `WORDS per lesson: ${limits.minTerms} to ${limits.maxTerms} terms and ${limits.minPhrases} to ${limits.maxPhrases} phrases.`,
    spanish
      ? 'A term is a noun or a short noun phrase of at most 4 words written WITH its definite article (target "el interruptor", native "the switch"; plural only when the thing is normally plural, "los guantes" / "the gloves"), or, when the lesson calls for it, an adjective, adverb, question word or short expression without an article ("seguro" / "safe", "¿dónde?" / "where").'
      : 'A term is a noun or a short noun phrase of at most 4 words written WITH "the" (target "the switch", native "el interruptor"), or, when the lesson calls for it, an adjective, adverb, question word or short expression without an article ("safe" / "seguro").',
    "A phrase is ONE sentence or question of at most 12 words that the learner would actually SAY in this work, ending with . ? or !",
    `No duplicates in a lesson, and never repeat a term or a phrase from another lesson of this stage. Numbers are digits and identical on both sides. A note (at most 120 characters, written in ${ctx.pair.nativeLanguage}) only when a usage, register or pronunciation tip really helps.`,
  ].join(" ");
}

// ─── Reference lessons (Roofing, hand-written) ───────────────────────────────

const ROOFING_FOUNDATION_EXAMPLE = {
  n: 3,
  title: "Ser and Estar",
  objective: "Use the two verbs for 'to be' to describe people, conditions and safety",
  focus: "ser for what something is, estar for its condition or location",
  terms: ["listo / ready", "seguro / safe", "peligroso / dangerous", "mojado / wet", "resbaloso / slippery", "caliente / hot", "frío / cold", "el jefe / the boss"],
  phrases: ["El techo está mojado. / The roof is wet. (note: estar: a condition that can change)", "Es peligroso. / It's dangerous.", "¿Está listo? / Is it ready?", "Estoy aquí. / I'm here."],
  speaking: "Describe the roof to a crew member: say whether it is wet, slippery or safe, and who the boss is.",
};

const ROOFING_MASTER_EXAMPLE = {
  n: 3,
  title: "Training a New Crew Member on Nailing",
  objective: "Coach a new roofer on nailing with clear commands, correcting mistakes without embarrassing them",
  grammarFocus: "Commands with object pronouns (clávalo aquí, no lo hundas)",
  grammarExamples: ["Clávalo aquí, en la zona de clavado. / Nail it here, in the nailing zone.", "No lo hundas; déjalo al ras. / Don't sink it; leave it flush."],
  lessonType: "Teach-back",
  block: "A",
  terms: ["la pistola de clavos / the nail gun", "la zona de clavado / the nailing zone", "el patrón de clavado / the nail pattern", "la cabeza del clavo / the nail head", "la presión de aire / the air pressure", "el compresor / the compressor", "… (14 terms in all)"],
  phrases: ["Clávalo aquí, en la zona de clavado. / Nail it here, in the nailing zone.", "No lo hundas. / Don't sink it.", "No te preocupes, a todos nos pasó. / Don't worry, it happened to all of us.", "Revíselo usted también, por favor. / Please check it yourself too. (note: formal)", "… (7 phrases in all)"],
  speaking: "You are training the AI, a new crew member, on the nail gun: show where to nail, check their work, and correct mistakes with commands like clávalo aquí and no lo hundas, keeping the tone supportive.",
};

const ROOFING_MASTER_TITLES = [
  "Explain the Roof System to a New Hire", "Why We Stagger Joints", "Training a New Crew Member on Nailing",
  "Read the Manufacturer Sheet Before the Flashing Goes On", "Unexpected Rotten Deck: Change Order with the Homeowner",
  "Material Shortage and Substitution", "Hail Damage Inspection with an Adjuster", "Saying No: Unsafe Request from the Homeowner",
  "Feedback on a Bad Course", "Conflict Between Two Crew Members", "Motivating the Crew Through a Hot Week",
  "Register: Homeowner, Crew, Boss, Inspector", "Fall Incident Report", "Near-Miss Conversation", "Weather Call: Stop Work and Tarp",
  "Inspector on Site", "Written Daily Report and Deck Repair Documentation", "Client Texts and Phone Calls: Schedule Changes",
  "Customer Walkthrough and Warranty", "Capstone: A Full Storm-Repair Day",
];

function moduleBrief(ctx: StageContext) {
  return {
    module: ctx.module.name,
    category: ctx.module.category,
    description: ctx.module.blurb,
    learnerRole: ctx.module.userRole,
    whoTheLearnerTalksTo: ctx.module.aiPersona,
    vocabularyFocus: ctx.module.vocabFocus,
    scenarios: ctx.module.challengePrompts,
    targetLanguage: ctx.pair.language,
    nativeLanguage: ctx.pair.nativeLanguage,
  };
}

// ─── Stage catalog text (manifest overrides) ─────────────────────────────────

/**
 * A stage's own catalog text, written into its manifest entry (src/data/core60/manifest.ts) so the
 * stage does not inherit the Core 30's blurb, role and challenges: the Speak tab would otherwise show
 * the trade's six Core 30 challenges three times (Foundation, Core 30, Master).
 */
export interface StageCatalog {
  blurb: string;
  userRole: string;
  /** Say it challenges: Foundation 4-5 at A1, Master 4-6 at B1-B2. */
  challengePrompts: string[];
}

export const CATALOG_LIMITS: Record<Core60StageKind, { minChallenges: number; maxChallenges: number; maxBlurb: number; maxChallenge: number }> = {
  foundation: { minChallenges: 4, maxChallenges: 5, maxBlurb: 220, maxChallenge: 150 },
  master: { minChallenges: 4, maxChallenges: 6, maxBlurb: 260, maxChallenge: 170 },
};
const MAX_USER_ROLE = 70;

/** Roofing's hand-written stage catalog text (src/data/modules.ts), the reference for the prompt. */
const ROOFING_CATALOG = {
  foundation: {
    blurb: "Ten short, free beginner lessons: sounds, numbers, ser and estar, questions and polite requests, taught with roofing words before Roofing Lesson 1.",
    userRole: "Beginner roofer learning Spanish",
    challengePrompts: [
      "Greet the crew, say your name, and ask how to say a tool in Spanish.",
      "Tell the crew lead what time you start and how many bundles you need.",
      "Describe the roof to a crew member: wet, slippery or safe.",
      "Ask a new crew lead where the ladder is, who the boss is, and when you start.",
      "Report a small accident on the roof and ask for help.",
    ],
  },
  master: {
    blurb: "Twenty advanced lessons for the day that doesn't go as planned: train a new roofer, explain a change order, walk an inspector across the roof, report a near-miss, and write the day's report in Spanish.",
    userRole: "Roofing foreman leading a crew in Spanish",
    challengePrompts: [
      "Train a new roofer on a task and have them teach it back to you in Spanish.",
      "Explain a change order for hidden rotten decking to a worried homeowner and answer their objection.",
      "Walk an inspector across the roof and answer their questions about flashing and ventilation.",
      "Report a near-miss fall to the crew lead and agree on what changes tomorrow.",
      "Dictate the day's report: work done, materials used, problems, and tomorrow's plan.",
    ],
  },
} as const;

function catalogRules(ctx: StageContext): string {
  const limits = CATALOG_LIMITS[ctx.stage];
  const lang = ctx.pair.language;
  if (ctx.stage === "foundation") {
    return `Also write catalog: this Foundation's own catalog card and Say it menu, in English.
- blurb: one sentence (at most ${limits.maxBlurb} characters) starting "Ten short, free beginner lessons" that names what the ten lessons teach with this work's words and ends "before ${ctx.module.name} Lesson 1."
- userRole: at most ${MAX_USER_ROLE} characters, a beginner in this work learning ${lang} (for example "Beginner roofer learning ${lang}").
- challengePrompts: ${limits.minChallenges} to ${limits.maxChallenges} A1 Say it challenges, each ONE English sentence (at most ${limits.maxChallenge} characters) starting with a verb: a short, simple spoken task with someone at this work that a true beginner can do with the Foundation's words (greet and introduce yourself, numbers and time, say what you need, ask where something is, ask for help). Not the Core 30's challenges (given in the request as scenarios), all different.
Reference (Roofing, for the format and level only; do not copy it): ${JSON.stringify(ROOFING_CATALOG.foundation)}`;
  }
  return `Also write catalog: this Master's own catalog card and Say it menu, in English.
- blurb: one sentence (at most ${limits.maxBlurb} characters) starting "Twenty advanced lessons for the day that doesn't go as planned:" listing four or five things the learner does in ${lang}, specific to this work.
- userRole: at most ${MAX_USER_ROLE} characters: the lead role in this work, in ${lang} (for example "Roofing foreman leading a crew in ${lang}", "Charge nurse leading a shift in ${lang}").
- challengePrompts: ${limits.minChallenges} to ${limits.maxChallenges} B1 to B2 Say it challenges, each ONE English sentence (at most ${limits.maxChallenge} characters) starting with a verb, drawn from the Master's blocks (teach and teach back, explain a problem or change to the client or patient, an inspector or auditor, a near miss or incident, the day's report). Not the Core 30's challenges (given in the request as scenarios), all different. Never use the words complication, surprise, twist or unannounced.
Reference (Roofing, for the format and level only; do not copy it): ${JSON.stringify(ROOFING_CATALOG.master)}`;
}

function catalogSchema(ctx: StageContext) {
  return {
    type: "object",
    properties: {
      blurb: { type: "string" },
      userRole: { type: "string" },
      challengePrompts: {
        type: "array",
        minItems: CATALOG_LIMITS[ctx.stage].minChallenges,
        maxItems: CATALOG_LIMITS[ctx.stage].maxChallenges,
        items: { type: "string" },
      },
    },
    required: ["blurb", "userRole", "challengePrompts"],
    additionalProperties: false,
  };
}

/** The catalog object of a reply (missing fields come back empty, for the checks to report). */
export function catalogFromReply(raw: unknown): StageCatalog {
  const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    blurb: str(item.blurb),
    userRole: str(item.userRole),
    challengePrompts: Array.isArray(item.challengePrompts) ? item.challengePrompts.map(str).filter(Boolean) : [],
  };
}

/** Rules for a stage's catalog text (blurb, role, challenges). */
export function catalogErrors(catalog: StageCatalog | undefined, ctx: StageContext): string[] {
  if (!catalog) return ["catalog is missing (blurb, userRole, challengePrompts)"];
  const limits = CATALOG_LIMITS[ctx.stage];
  const errors: string[] = [];
  const start = ctx.stage === "foundation" ? "Ten short, free beginner lessons" : "Twenty advanced lessons for the day that doesn't go as planned:";
  if (!catalog.blurb) errors.push("catalog.blurb is missing");
  else {
    if (!catalog.blurb.startsWith(start)) errors.push(`catalog.blurb must start "${start}"`);
    if (catalog.blurb.length > limits.maxBlurb) errors.push(`catalog.blurb is longer than ${limits.maxBlurb} characters`);
  }
  if (!catalog.userRole) errors.push("catalog.userRole is missing");
  else if (catalog.userRole.length > MAX_USER_ROLE) errors.push(`catalog.userRole is longer than ${MAX_USER_ROLE} characters`);
  const prompts = catalog.challengePrompts;
  if (prompts.length < limits.minChallenges || prompts.length > limits.maxChallenges)
    errors.push(`catalog has ${prompts.length} challengePrompts; it needs ${limits.minChallenges} to ${limits.maxChallenges}`);
  const base = new Set(ctx.module.challengePrompts.map((p) => foldText(p)));
  const seen = new Set<string>();
  prompts.forEach((prompt, i) => {
    const at = `catalog challenge ${i + 1} ("${prompt}")`;
    if (prompt.length > limits.maxChallenge) errors.push(`${at}: longer than ${limits.maxChallenge} characters`);
    if (!/^[A-Z][a-z]+/.test(prompt) || !ENDS.test(prompt)) errors.push(`${at}: one English sentence starting with a verb`);
    const key = foldText(prompt);
    if (base.has(key)) errors.push(`${at}: copies a Core 30 challenge; write one for this stage`);
    if (seen.has(key)) errors.push(`${at}: appears twice`);
    seen.add(key);
    if (ctx.stage === "master" && BANNED_REVEAL.test(prompt))
      errors.push(`${at}: must not mention a complication, surprise or twist (the AI springs it unannounced)`);
  });
  errors.push(...invisibleCharErrors("catalog", catalog));
  return errors;
}

/** The manifest stage overrides for a catalog (written by the generator's publish step). */
export function catalogManifestStage(catalog: StageCatalog | undefined): Core60ManifestStage {
  if (!catalog) return {};
  return { blurb: catalog.blurb, userRole: catalog.userRole, challengePrompts: [...catalog.challengePrompts] };
}

// ─── Tool schemas ────────────────────────────────────────────────────────────

const PAIR = {
  type: "object",
  properties: {
    target: { type: "string" },
    native: { type: "string" },
    note: { type: "string" },
  },
  required: ["target", "native"],
  additionalProperties: false,
};

const pairs = (min: number, max: number) => ({ type: "array", minItems: min, maxItems: max, items: PAIR });

const EXAMPLE = {
  type: "object",
  properties: { target: { type: "string" }, native: { type: "string" } },
  required: ["target", "native"],
  additionalProperties: false,
};

export const FOUNDATION_TOOL = "return_foundation_curriculum";
export const OUTLINE_TOOL = "return_master_outline";
export const BLOCK_TOOL = "return_master_lessons";
export const CONTENT_TOOL = "return_lesson_content";

export interface ApiRequest {
  model: string;
  max_tokens: number;
  system: string;
  messages: { role: "user" | "assistant"; content: unknown }[];
  tools: { name: string; description: string; input_schema: Record<string, unknown> }[];
  tool_choice: { type: "auto" };
  output_config?: { effort: "low" | "medium" | "high" | "xhigh" | "max" };
}

function request(
  model: string,
  maxTokens: number,
  system: string,
  user: unknown,
  tool: { name: string; description: string; input_schema: Record<string, unknown> },
): ApiRequest {
  return {
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: JSON.stringify(user) }],
    tools: [tool],
    // Sonnet 5.5 and Opus 5.5 reject a forced tool_choice: "auto" + an instruction to call it.
    tool_choice: { type: "auto" },
    output_config: { effort: "high" },
  };
}

// ─── Step 1a: Foundation curriculum (one call) ───────────────────────────────

export function foundationCurriculumRequest(ctx: StageContext, model: string): ApiRequest {
  const limits = contentLimitsFor(stageId(ctx));
  const units = FOUNDATION_UNITS[ctx.pair.language];
  const system = `You write the curriculum of a free beginner Foundation: ten short A1 lessons (F1 to F10) in front of a job-language Core 30. The learner is a true beginner learning ${ctx.pair.language} for this work; their native language is ${ctx.pair.nativeLanguage}. Deliver everything by calling the ${FOUNDATION_TOOL} tool, once, with all ten lessons.

The ten unit topics are FIXED (given in the request, in order). Each lesson teaches its fixed topic with THIS work's own simple, high-frequency words so the learner can follow Core 30 Lesson 1. Prefer the most common, concrete words of the job (tools, places, people, body parts or supplies the learner touches daily); do not use the advanced Core 30 vocabulary.

For each lesson write:
- objective: one English sentence (at most 110 characters) saying what the learner can do after it, in this work.
- focus: the sound or grammar the Reader step listens for, in English (at most 100 characters), covering the unit's fixed topic, adapted to the work where natural (F2: the units and quantities of this work).
- terms and phrases (rules below). Phrases model the unit's grammar (F3 phrases use ser and estar; F7 phrases are questions; F9 phrases are polite requests and commands). F1 term notes may give a pronunciation tip.
- speaking: the Say it mission brief, one English sentence (at most 200 characters) starting with a verb, for a short spoken task with someone at work, using this lesson's words and grammar.
Also write threshold: one English sentence starting "By Lesson 10, you can" naming what the learner can do, ending with "and start ${ctx.module.name} Lesson 1."

${catalogRules(ctx)}

${wordRules(ctx, limits)}

${registerRules(ctx)}

${safetyRules(ctx)}

Here is a reference lesson from another trade (Roofing F3), for the format and level only. Do not copy its words: ${JSON.stringify(ROOFING_FOUNDATION_EXAMPLE)}`;
  const user = {
    ...moduleBrief(ctx),
    units: units.map((unit, i) => ({ n: i + 1, title: unit.title, fixedTopic: unit.topic })),
    core30LessonTitles: ctx.core30.titles,
  };
  const lessonSchema = {
    type: "object",
    properties: {
      n: { type: "integer" },
      objective: { type: "string" },
      focus: { type: "string" },
      terms: pairs(limits.minTerms, limits.maxTerms),
      phrases: pairs(limits.minPhrases, limits.maxPhrases),
      speaking: { type: "string" },
    },
    required: ["n", "objective", "focus", "terms", "phrases", "speaking"],
    additionalProperties: false,
  };
  return request(model, 24_000, system, user, {
    name: FOUNDATION_TOOL,
    description: "Return the ten Foundation lessons",
    input_schema: {
      type: "object",
      properties: {
        threshold: { type: "string" },
        catalog: catalogSchema(ctx),
        lessons: { type: "array", minItems: 10, maxItems: 10, items: lessonSchema },
      },
      required: ["threshold", "catalog", "lessons"],
      additionalProperties: false,
    },
  });
}

// ─── Step 1b: Master outline (one call) ──────────────────────────────────────

export interface MasterOutlineLesson {
  n: number;
  title: string;
  objective: string;
  grammarFocus: string;
  lessonType: MasterLessonType;
  block: MasterBlock;
  /** The hidden scene for the writers: who, where, and what goes wrong. Never shipped. */
  scene: string;
  safetySensitive: boolean;
}

export interface MasterOutline {
  threshold: string;
  /** Absent in progress files written before the catalog existed (the pilot's). */
  catalog?: StageCatalog;
  lessons: MasterOutlineLesson[];
}

export function masterOutlineRequest(ctx: StageContext, model: string): ApiRequest {
  const spine = MASTER_GRAMMAR_SPINE[ctx.pair.language];
  const system = `You design a Master 20: twenty advanced B1 to B2 lessons that come after a job-language Core 30, for the day that does not go as planned. The learner already finished the Core 30 (its lesson titles and terms are in the request) and now leads, teaches, solves problems and reports in ${ctx.pair.language}; their native language is ${ctx.pair.nativeLanguage}. Deliver the outline by calling the ${OUTLINE_TOOL} tool, once, with all twenty lessons.

The arc is FIXED: five blocks of four lessons (given in the request with their purpose and allowed lesson types). Lesson 20 is the Capstone: one full, hard day of this work that integrates the whole Master 20 (lessonType "Capstone"); no other lesson is a Capstone.

For each lesson:
- title: English, at most 60 characters, specific to this work (a real situation, not a grammar label), and NOT one of the Core 30 titles. Every title in the stage is different.
- objective: one English sentence (at most 120 characters): what the learner does in ${ctx.pair.language} in this lesson.
- grammarFocus: ONE B1 to B2 grammar focus. Follow the given grammar spine in order (lesson n gets spine item n); you may adjust its examples in parentheses to fit the scene. All twenty foci are different.
- lessonType and block: block is fixed by the lesson number; lessonType is one of the block's allowed types.
- scene: one English sentence for the lesson writers (never shown to the learner): who speaks with whom, where, and the problem or twist in it.
- safetySensitive: true when the lesson involves injury risk, an emergency, a dose, an electrical or chemical hazard, a code or specification, or legal / privacy duties.
Also write threshold: one English sentence starting "By Lesson 20, you can" listing four or five things the learner can do in ${ctx.pair.language}.

Vary the cast and the settings across the twenty scenes: no single character leads more than 4 lessons; give each lesson its own named people (reuse a name only when it is deliberately the same person across lessons); never reuse a room, address or unit number for a different patient or client; and vary the workplaces.

${catalogRules(ctx)}

Build on the Core 30: go beyond its situations (do not repeat a Core 30 lesson's scenario), and make each lesson a situation that a working ${ctx.module.userRole} really meets. ${safetyRules(ctx)}

Reference: the Roofing Master 20 titles (another trade; for the arc and specificity only, do not copy them): ${JSON.stringify(ROOFING_MASTER_TITLES)}`;
  const user = {
    ...moduleBrief(ctx),
    blocks: MASTER_BLOCKS.map((block) => ({
      block: block.block,
      name: block.name,
      lessons: block.lessons,
      allowedLessonTypes: block.block === "E" ? ["Document", "People", "Capstone (Lesson 20 only)"] : block.types,
      purpose: block.purpose,
    })),
    grammarSpine: spine.map((focus, i) => ({ n: i + 1, focus })),
    core30: ctx.core30.titles.map((title, i) => ({ n: i + 1, title, objective: ctx.core30.objectives[i] })),
  };
  const lessonSchema = {
    type: "object",
    properties: {
      n: { type: "integer" },
      title: { type: "string" },
      objective: { type: "string" },
      grammarFocus: { type: "string" },
      lessonType: { type: "string", enum: ["Teach-back", "Case", "People", "Document", "Capstone"] },
      block: { type: "string", enum: ["A", "B", "C", "D", "E"] },
      scene: { type: "string" },
      safetySensitive: { type: "boolean" },
    },
    required: ["n", "title", "objective", "grammarFocus", "lessonType", "block", "scene", "safetySensitive"],
    additionalProperties: false,
  };
  return request(model, 16_000, system, user, {
    name: OUTLINE_TOOL,
    description: "Return the Master 20 outline",
    input_schema: {
      type: "object",
      properties: {
        threshold: { type: "string" },
        catalog: catalogSchema(ctx),
        lessons: { type: "array", minItems: 20, maxItems: 20, items: lessonSchema },
      },
      required: ["threshold", "catalog", "lessons"],
      additionalProperties: false,
    },
  });
}

// ─── Step 1c: Master lessons, one block of four per call ─────────────────────

export function masterBlockRequest(
  ctx: StageContext,
  model: string,
  outline: MasterOutline,
  block: MasterBlockSpec,
  earlier: readonly Core60StageLesson[],
): ApiRequest {
  const limits = contentLimitsFor(stageId(ctx));
  const system = `You write the lessons of one block of a Master 20 (B1 to B2) for a job-language course. The learner finished the Core 30 and now leads, teaches, solves problems and reports in ${ctx.pair.language}; their native language is ${ctx.pair.nativeLanguage}. Deliver the four lessons of block ${block.block} by calling the ${BLOCK_TOOL} tool, once.

For each lesson in the request (its title, objective, grammar focus, type and scene are fixed):
- terms and phrases (rules below): the advanced vocabulary this exact situation needs, beyond the Core 30 terms listed in the request (at most 2 of a lesson's terms may be Core 30 terms). The phrases are what the learner says in this lesson, and several of them use the lesson's grammar focus; mix registers where the lesson involves different listeners (mark formal / informal in the note).
- grammarExamples: exactly TWO short ${ctx.pair.language} example sentences of the grammar focus from this lesson's scene, each with its ${ctx.pair.nativeLanguage} translation.
- speaking: the Say it mission brief, one or two English sentences (at most 300 characters): "You are the …, and the AI is …:" then what the learner must do, naming the key ${ctx.pair.language} structures to use. Never reveal or hint at a problem the AI will spring partway through: the brief describes only the planned task. Never use the words complication, surprise, twist or unannounced.

${wordRules(ctx, limits)}

${registerRules(ctx)}

${safetyRules(ctx)}

Reference lesson from another trade (Roofing Master Lesson 3), for format and level only; do not copy its words: ${JSON.stringify(ROOFING_MASTER_EXAMPLE)}`;
  const user = {
    ...moduleBrief(ctx),
    block: { block: block.block, name: block.name, purpose: block.purpose },
    lessons: outline.lessons
      .filter((lesson) => block.lessons.includes(lesson.n))
      .map(({ n, title, objective, grammarFocus, lessonType, scene, safetySensitive }) => ({
        n,
        title,
        objective,
        grammarFocus,
        lessonType,
        scene,
        safetySensitive,
      })),
    wholeStageTitles: outline.lessons.map((lesson) => `${lesson.n}. ${lesson.title}`),
    termsAndPhrasesAlreadyUsedInThisStage: earlier.flatMap((lesson) => lesson.words.map((word) => word.es)),
    core30Terms: ctx.core30.terms,
    ...(block.block === "E"
      ? { capstoneNote: "Lesson 20 integrates the whole stage: its words and phrases revisit the situations of lessons 1 to 19 with new wording, and its speaking brief chains several of them in one day." }
      : {}),
  };
  const lessonSchema = {
    type: "object",
    properties: {
      n: { type: "integer" },
      terms: pairs(limits.minTerms, limits.maxTerms),
      phrases: pairs(limits.minPhrases, limits.maxPhrases),
      grammarExamples: { type: "array", minItems: 2, maxItems: 2, items: EXAMPLE },
      speaking: { type: "string" },
    },
    required: ["n", "terms", "phrases", "grammarExamples", "speaking"],
    additionalProperties: false,
  };
  return request(model, 24_000, system, user, {
    name: BLOCK_TOOL,
    description: `Return the four lessons of block ${block.block}`,
    input_schema: {
      type: "object",
      properties: { lessons: { type: "array", minItems: 4, maxItems: 4, items: lessonSchema } },
      required: ["lessons"],
      additionalProperties: false,
    },
  });
}

// ─── Step 2: passage + verbs, one call per lesson ────────────────────────────

export function stageContentRequest(
  ctx: StageContext,
  model: string,
  lesson: Core60StageLesson,
  extra: { scene?: string; safetySensitive?: boolean; previousTitle?: string | null },
): ApiRequest {
  const limits = contentLimitsFor(stageId(ctx));
  const master = ctx.stage === "master";
  const spanish = ctx.pair.language === "Spanish";
  const keys = MODEL_FORM_KEYS[spanish ? "Spanish" : "English"].join(", ");
  const level = master
    ? `B1 to B2. Natural, connected ${ctx.pair.language} at a normal working pace; sentences up to about 22 words. The lesson's grammar focus appears in at least 3 sentences.`
    : `A1. Short present-tense sentences of 4 to 10 words with common words; no subordinate clauses. The unit's focus (${lesson.focus}) is visible in most sentences.`;
  const system = `You write the authored content of ONE lesson of a job-language course: its passage and its verbs. The learner's native language is ${ctx.pair.nativeLanguage}; they are learning ${ctx.pair.language}. Deliver everything by calling the ${CONTENT_TOOL} tool, once.

Level: ${level}

PASSAGE: ${limits.minSentences} to ${limits.maxSentences} sentences forming ONE coherent, realistic scene of THIS lesson (its title, objective${master ? ", grammar focus and scene" : " and focus"}), with named people, a place and a purpose. A short title (2 to 6 words) in ${ctx.pair.language}. Every ${ctx.pair.language} sentence has exactly one ${ctx.pair.nativeLanguage} sentence at the same position: translate sentence by sentence, never merge or split. Each sentence ends with . ? or ! . No quotation marks and no dialogue dashes anywhere: a speaker's line is written "Name: sentence." (one sentence per line) or reported with a colon. Numbers are digits, identical on both sides; never convert units.
VOCABULARY IN THE PASSAGE: use EVERY term of the lesson's word list, written as in the list with the same head noun (plural or gender agreement is fine, the article may change), and at least ${Math.max(limits.minPhrasesUsed, master ? 3 : 2)} of its phrases word for word. Spread the terms over the scene: each term sits in a sentence that says something about it (what someone does with it, where it is, why it matters). Never pack three or more terms into a bare list ("Marta revisa la protección, la capacidad y la cantidad." is rejected). Check this before you answer.

VERBS: ${limits.minVerbs === limits.maxVerbs ? `exactly ${limits.minVerbs}` : `${limits.minVerbs} to ${limits.maxVerbs}`} verbs this lesson actually needs${master ? "" : " (the unit's own verbs first: for example ser and estar in a ser / estar unit)"}, used in the passage. For each: "infinitive" (${spanish ? "the Spanish infinitive, e.g. revisar, or reflexive lavarse" : 'the bare English verb, e.g. "check", no "to"'}), "native" (the meaning in ${ctx.pair.nativeLanguage}${spanish ? ', like "to check"' : ', e.g. "revisar"'}), "forms" (PRESENT TENSE ONLY, one string per key: ${keys}; the bare verb form with no pronoun${spanish ? ', except the reflexive pronoun for reflexive verbs ("me lavo"). All five forms differ: tú ends in -s, nosotros in -mos, ellos/ustedes in -n. Mark stem changes in the note' : '; the he/she form takes the -s ("checks")'}), "example" (one short sentence from this scene in the PRESENT tense or a command that uses one form of the verb, with its ${ctx.pair.nativeLanguage} translation) and an optional short "note" written in ${ctx.pair.nativeLanguage} (never in ${ctx.pair.language}).

${registerRules(ctx)}

${safetyRules(ctx)}${extra.safetySensitive ? " This lesson is safety-sensitive: show the safe procedure (stop, verify, report, follow the protocol or the plans) and attribute every figure." : ""}`;
  const user = {
    module: ctx.module.name,
    learnerRole: ctx.module.userRole,
    stage: master ? "Master 20 (after the Core 30)" : "Foundation (before the Core 30)",
    lesson: {
      number: lesson.n,
      of: master ? 20 : 10,
      title: lesson.title,
      objective: lesson.objective,
      ...(master
        ? {
            grammarFocus: lesson.grammar?.focus,
            grammarExamples: lesson.grammar?.examples,
            lessonType: lesson.lessonType,
            scene: extra.scene,
          }
        : { focus: lesson.focus }),
      speakingMission: lesson.speaking,
      previousLessonTitle: extra.previousTitle ?? null,
    },
    words: lesson.words.map((word) => ({ kind: word.kind, target: word.es, native: word.en })),
  };
  const verbKeys = MODEL_FORM_KEYS[spanish ? "Spanish" : "English"];
  const verb = {
    type: "object",
    properties: {
      infinitive: { type: "string" },
      native: { type: "string" },
      forms: {
        type: "object",
        properties: Object.fromEntries(verbKeys.map((key) => [key, { type: "string" }])),
        required: [...verbKeys],
        additionalProperties: false,
      },
      example: EXAMPLE,
      note: { type: "string" },
    },
    required: ["infinitive", "native", "forms", "example"],
    additionalProperties: false,
  };
  return request(model, master ? 24_000 : 12_000, system, user, {
    name: CONTENT_TOOL,
    description: "Return the passage and verbs for this lesson",
    input_schema: {
      type: "object",
      properties: {
        passage: {
          type: "object",
          properties: {
            title: { type: "string" },
            target: { type: "array", minItems: limits.minSentences, maxItems: limits.maxSentences, items: { type: "string" } },
            native: { type: "array", minItems: limits.minSentences, maxItems: limits.maxSentences, items: { type: "string" } },
          },
          required: ["title", "target", "native"],
          additionalProperties: false,
        },
        verbs: { type: "array", minItems: limits.minVerbs, maxItems: limits.maxVerbs, items: verb },
      },
      required: ["passage", "verbs"],
      additionalProperties: false,
    },
  });
}

// ─── The cli provider (claude -p on the owner's subscription) ────────────────

/**
 * The CLI has no custom tools: the reply comes back as structured output (`--json-schema`). The
 * system prompt keeps every rule; only the delivery sentence changes.
 */
export function cliSystemPrompt(system: string, toolName: string): string {
  return system.replaceAll(
    `by calling the ${toolName} tool, once`,
    "as ONE JSON object that matches the given JSON schema (your structured output), once",
  );
}

/**
 * The tool's input schema for `--json-schema`, without minItems / maxItems: an out-of-range count
 * then reaches the generator's own checks (precise retry messages) instead of failing inside the CLI.
 */
export function cliJsonSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(cliJsonSchema);
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (key === "minItems" || key === "maxItems") continue;
    out[key] = cliJsonSchema(value);
  }
  return out;
}

/**
 * The prompt (stdin) for one CLI call: the same user content as the API call; a retry adds the
 * rejected answer and the exact errors (a fresh, stateless call: no session is kept).
 */
export function cliPrompt(request: ApiRequest, retry?: { reply: unknown; errors: readonly string[] }): string {
  const first = request.messages[0]?.content;
  const base = typeof first === "string" ? first : JSON.stringify(first);
  if (!retry) return base;
  return `${base}

YOUR PREVIOUS ANSWER (rejected):
${JSON.stringify(retry.reply)}

Fix these problems and return the COMPLETE result again (everything, not only the fixed parts):
- ${retry.errors.slice(0, 40).join("\n- ")}`;
}

/** What one CLI call reported (the progress log keeps one per call). */
export interface CliCallUsage {
  inputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  outputTokens: number;
  /** The CLI's notional list-price cost; on a subscription it is not billed. */
  costUsd: number | null;
  numTurns: number | null;
  durationMs: number | null;
  model: string | null;
}

export type CliFailureKind = "rate_limit" | "auth" | "other";

export interface CliOutcome {
  ok: boolean;
  /** The structured reply (when ok). */
  value: Record<string, unknown> | null;
  usage: CliCallUsage;
  /** The CLI's error text (when not ok). */
  error: string;
  kind: CliFailureKind | null;
  /** Epoch ms when a usage limit resets, when the CLI said so. */
  resetAt: number | null;
}

const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const numOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

/** The JSON object inside a text reply (a ```json fence or the outermost braces), or null. */
export function jsonObjectInText(text: string): Record<string, unknown> | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidates = [text, fenced?.[1] ?? "", text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)];
  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate.trim());
      if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

const RATE_LIMIT = /usage limit|rate[ _-]?limit|hit your limit|limit reached|limit will reset|resets? (?:at )?\d|overloaded|too many requests|\b429\b|\b529\b|capacity|temporarily unavailable/i;
const AUTH = /invalid api key|please run \/login|not logged in|log ?in again|oauth token (?:has )?expired|authentication[_ ]error|unauthori[sz]ed|\b401\b|permission[_ ]error|\b403\b/i;

/** Rate limit (wait and retry), auth (stop: the login is broken) or anything else. */
export function classifyCliFailure(text: string, status: number | null = null): CliFailureKind {
  if (status === 429 || status === 529 || RATE_LIMIT.test(text)) return "rate_limit";
  if (status === 401 || status === 403 || AUTH.test(text)) return "auth";
  return "other";
}

/** "Claude AI usage limit reached|1760000000" carries the reset time (epoch seconds). */
export function cliResetAt(text: string): number | null {
  const match = /\|\s*(\d{10})\b/.exec(text);
  return match ? Number(match[1]) * 1000 : null;
}

/** Parses `claude -p --output-format json` stdout (and stderr) into an outcome. */
export function parseCliOutput(stdout: string, stderr = "", exitCode: number | null = 0): CliOutcome {
  let data: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(stdout.trim().split(/\n(?=\{)/).pop() ?? "");
    if (parsed && typeof parsed === "object") data = parsed as Record<string, unknown>;
  } catch {
    data = null;
  }
  const usageRaw = (data?.usage ?? {}) as Record<string, unknown>;
  const models = Object.keys((data?.modelUsage ?? {}) as Record<string, unknown>);
  const usage: CliCallUsage = {
    inputTokens: num(usageRaw.input_tokens),
    cacheCreationInputTokens: num(usageRaw.cache_creation_input_tokens),
    cacheReadInputTokens: num(usageRaw.cache_read_input_tokens),
    outputTokens: num(usageRaw.output_tokens),
    costUsd: numOrNull(data?.total_cost_usd),
    numTurns: numOrNull(data?.num_turns),
    durationMs: numOrNull(data?.duration_ms),
    model: models[0] ?? null,
  };
  const fail = (error: string, status: number | null = null): CliOutcome => ({
    ok: false,
    value: null,
    usage,
    error: error.slice(0, 500),
    kind: classifyCliFailure(error, status),
    resetAt: cliResetAt(error),
  });
  if (!data) return fail(`${stderr || stdout || `claude exited with code ${exitCode}`}`.trim());
  const status = numOrNull(data.api_error_status);
  const resultText = typeof data.result === "string" ? data.result : "";
  if (data.is_error === true || (data.subtype && data.subtype !== "success")) {
    return fail(`${String(data.subtype ?? "error")}: ${resultText || stderr}`.trim(), status);
  }
  const structured = data.structured_output;
  const value =
    structured && typeof structured === "object" && !Array.isArray(structured)
      ? (structured as Record<string, unknown>)
      : jsonObjectInText(resultText);
  // Some CLI versions report a usage limit as a short, "successful" text result.
  if (!value && resultText.length < 400 && classifyCliFailure(resultText) === "rate_limit") return fail(resultText, status);
  return { ok: true, value, usage, error: value ? "" : "the reply held no JSON object", kind: null, resetAt: null };
}

/** Total prompt tokens of a CLI call (uncached + cache writes + cache reads), for the run report. */
export const cliInputTokens = (usage: CliCallUsage) =>
  usage.inputTokens + usage.cacheCreationInputTokens + usage.cacheReadInputTokens;

// ─── Parsing replies ─────────────────────────────────────────────────────────

export interface ContentBlockLike {
  type: string;
  id?: string;
  name?: string;
  input?: unknown;
}

/** The input of the named tool call, or null when the reply did not call it. */
export function toolInput(content: readonly ContentBlockLike[], name: string): Record<string, unknown> | null {
  const block = content.find((item) => item.type === "tool_use" && item.name === name);
  return block && block.input && typeof block.input === "object" ? (block.input as Record<string, unknown>) : null;
}

const str = (value: unknown) => (typeof value === "string" ? value.normalize("NFC").trim() : "");

// Model pairs {target, native, note} → LessonWords (es = target, en = native). Cleaned without
// capping the counts, so an oversized list reaches the validator instead of being cut silently.
function wordsOfLesson(raw: Record<string, unknown>): LessonWord[] {
  const map = (list: unknown, kind: "term" | "phrase") =>
    Array.isArray(list)
      ? list.map((item) => {
          const pair = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          return { en: pair.native, es: pair.target, kind, note: pair.note };
        })
      : [];
  return cleanLessonWords([...map(raw.terms, "term"), ...map(raw.phrases, "phrase")], {
    maxTerms: 40,
    maxPhrases: 40,
  });
}

/** Foundation reply → stage lessons (titles from the fixed units). */
export function foundationFromReply(
  input: Record<string, unknown>,
  ctx: StageContext,
): { threshold: string; catalog: StageCatalog; lessons: Core60StageLesson[] } {
  const units = FOUNDATION_UNITS[ctx.pair.language];
  const raw = Array.isArray(input.lessons) ? (input.lessons as Record<string, unknown>[]) : [];
  const lessons = units.map((unit, i): Core60StageLesson => {
    const item = raw.find((lesson) => lesson && lesson.n === i + 1) ?? raw[i] ?? {};
    return {
      n: i + 1,
      title: unit.title,
      objective: str(item.objective),
      focus: str(item.focus),
      words: wordsOfLesson(item),
      speaking: str(item.speaking),
    };
  });
  return { threshold: str(input.threshold), catalog: catalogFromReply(input.catalog), lessons };
}

export function outlineFromReply(input: Record<string, unknown>): MasterOutline {
  const raw = Array.isArray(input.lessons) ? (input.lessons as Record<string, unknown>[]) : [];
  const lessons = raw
    .filter((item) => item && typeof item === "object")
    .map((item, i) => ({
      n: Number.isInteger(item.n) ? (item.n as number) : i + 1,
      title: str(item.title),
      objective: str(item.objective),
      grammarFocus: str(item.grammarFocus),
      lessonType: str(item.lessonType) as MasterLessonType,
      block: str(item.block) as MasterBlock,
      scene: str(item.scene),
      safetySensitive: item.safetySensitive === true,
    }))
    .sort((a, b) => a.n - b.n);
  return { threshold: str(input.threshold), catalog: catalogFromReply(input.catalog), lessons };
}

export function blockFromReply(
  input: Record<string, unknown>,
  outline: MasterOutline,
  block: MasterBlockSpec,
): Core60StageLesson[] {
  const raw = Array.isArray(input.lessons) ? (input.lessons as Record<string, unknown>[]) : [];
  return block.lessons.map((n, i): Core60StageLesson => {
    const plan = outline.lessons.find((lesson) => lesson.n === n)!;
    const item = raw.find((lesson) => lesson && lesson.n === n) ?? raw[i] ?? {};
    const examples = Array.isArray(item.grammarExamples) ? (item.grammarExamples as Record<string, unknown>[]) : [];
    const grammar: LessonGrammar = {
      focus: plan.grammarFocus,
      examples: examples.map((ex) => ({ es: str(ex?.target), en: str(ex?.native) })),
    };
    return {
      n,
      title: plan.title,
      objective: plan.objective,
      words: wordsOfLesson(item),
      speaking: str(item.speaking),
      grammar,
      lessonType: plan.lessonType,
      block: plan.block,
    };
  });
}

/** Assembles a stage file (format: docs/core60-architecture.md). */
export function assembleStageFile(
  ctx: StageContext,
  threshold: string,
  lessons: Core60StageLesson[],
  provenance: { model: string; generatedAt: string },
): Core60StageFile {
  return {
    version: CORE60_STAGE_FILE_VERSION,
    module: stageId(ctx),
    baseModule: ctx.module.id,
    stage: ctx.stage,
    language: ctx.pair.language,
    nativeLanguage: ctx.pair.nativeLanguage,
    headline: stageHeadline(ctx),
    threshold,
    reviewed: false,
    model: provenance.model,
    generatedAt: provenance.generatedAt,
    lessons,
  };
}

// ─── Generator checks (beyond validateStageFile) ─────────────────────────────

const SPANISH_ARTICLES = new Set(["el", "la", "los", "las", "un", "una", "unos", "unas", "lo"]);
const ENGLISH_ARTICLES = new Set(["the", "a", "an"]);
const BANNED_REVEAL = /complicat|surpris|unannounced|twist/i;
const SPANISH_MARKERS = /\b(es|muy|verbo|los|las|para|del|cuando|la|el|que|con|se|una|un|en|por|pero|este|esta|tiene|significa|también|usted|decir|dice)\b/gi;
const ENGLISH_MARKERS = /\b(the|and|with|is|are|use|used|say|says|when|means|for|this|to|of|in|it|not|formal|informal|also|only|you)\b/gi;
const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;
const digits = (text: string) => (text.match(/\d+/g) ?? []).join(",");
const ENDS = /[.?!…]["'”’»)\]]*$/;

/** A note (word or verb) must be written in the learner's native language. */
export function noteInWrongLanguage(note: string, nativeLanguage: string): boolean {
  const es = count(note, SPANISH_MARKERS);
  const en = count(note, ENGLISH_MARKERS);
  return nativeLanguage === "English" ? es >= 2 && en === 0 : en >= 2 && es === 0;
}

function invertedMarks(text: string): string | null {
  if (text.includes("?") && !text.includes("¿")) return "missing ¿";
  if (text.includes("!") && !text.includes("¡")) return "missing ¡";
  if (text.includes("¿") && !text.includes("?")) return "¿ without ?";
  if (text.includes("¡") && !text.includes("!")) return "¡ without !";
  return null;
}

/** Key used for "unique across the stage": target without its article, plus the native side. */
function termKey(word: LessonWord, language: string): string {
  const articles = language === "Spanish" ? SPANISH_ARTICLES : ENGLISH_ARTICLES;
  const strip = (text: string, set: Set<string>) =>
    wordsOf(text)
      .filter((w, i) => !(i === 0 && set.has(w)))
      .join(" ");
  const native = language === "Spanish" ? ENGLISH_ARTICLES : SPANISH_ARTICLES;
  return `${strip(word.es, articles)}|${strip(word.en, native)}`;
}

const foldTitle = (title: string) =>
  foldText(title)
    .replace(/^threshold\s*[—–-]\s*/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Per-lesson word checks shared by the Foundation and every Master block. */
function checkLessonWords(lesson: Core60StageLesson, ctx: StageContext, errors: string[]) {
  const where = `lesson ${lesson.n} (${lesson.title})`;
  const spanishTarget = ctx.pair.language === "Spanish";
  for (const word of lesson.words) {
    const label = `${where} ${word.kind} "${word.es}"`;
    if (digits(word.es) !== digits(word.en)) errors.push(`${label}: numbers differ between the two sides`);
    const spanishSide = spanishTarget ? word.es : word.en;
    const mark = invertedMarks(spanishSide);
    if (mark) errors.push(`${label}: ${mark} in the Spanish text "${spanishSide}"`);
    if (word.kind === "phrase") {
      if (!ENDS.test(word.es)) errors.push(`${label}: a phrase is one sentence ending with . ? or !`);
      if (wordsOf(word.es).length > 12) errors.push(`${label}: a phrase has at most 12 words`);
    } else if (wordsOf(word.es).length > 5) {
      errors.push(`${label}: a term has at most 4 words (plus its article)`);
    }
    if (word.note && noteInWrongLanguage(word.note, ctx.pair.nativeLanguage)) {
      errors.push(`${label}: the note must be written in ${ctx.pair.nativeLanguage}: ${word.note}`);
    }
    for (const issue of unattributedSpecs([word.es], ctx)) errors.push(`${label}: ${issue}`);
  }
  if (!lesson.speaking) errors.push(`${where}: speaking is missing`);
  else if (lesson.speaking.length > 320) errors.push(`${where}: the speaking brief is longer than 320 characters`);
}

/**
 * Stage-wide checks run after validateStageFile: unique titles and terms across the stage, Master
 * titles that do not repeat the Core 30, the fixed Master arc, missions that never reveal the
 * complication, inverted marks, digits, note language and attributed specifications.
 * `upTo` limits the checks to lessons 1..upTo (a Master block written so far).
 */
export function stageGeneratorErrors(
  lessons: readonly Core60StageLesson[],
  ctx: StageContext,
  upTo = lessons.length,
): string[] {
  const errors: string[] = [];
  const scope = lessons.filter((lesson) => lesson.n <= upTo);
  const titles = new Map<string, number>();
  const terms = new Map<string, number>();
  const phrases = new Map<string, number>();
  const core30Titles = new Set(ctx.core30.titles.map(foldTitle));
  const foci = new Map<string, number>();
  for (const lesson of scope) {
    const where = `lesson ${lesson.n} (${lesson.title})`;
    const titleKey = foldTitle(lesson.title);
    if (titles.has(titleKey)) errors.push(`${where}: same title as lesson ${titles.get(titleKey)}`);
    titles.set(titleKey, lesson.n);
    for (const word of lesson.words) {
      if (word.kind === "term") {
        const key = termKey(word, ctx.pair.language);
        const seen = terms.get(key);
        if (seen !== undefined && seen !== lesson.n)
          errors.push(`${where}: term "${word.es}" is already a term of lesson ${seen}; use a different term`);
        terms.set(key, lesson.n);
      } else {
        const key = wordsOf(word.es).join(" ");
        const seen = phrases.get(key);
        if (seen !== undefined && seen !== lesson.n)
          errors.push(`${where}: phrase "${word.es}" is already a phrase of lesson ${seen}; write a different one`);
        phrases.set(key, lesson.n);
      }
    }
    checkLessonWords(lesson, ctx, errors);
    if (ctx.stage === "foundation") {
      const unit = FOUNDATION_UNITS[ctx.pair.language][lesson.n - 1];
      if (unit && lesson.title !== unit.title) errors.push(`${where}: Foundation title must be "${unit.title}"`);
      if (lesson.focus && lesson.focus.length > 110) errors.push(`${where}: focus is longer than 110 characters`);
      if (lesson.objective.length > 140) errors.push(`${where}: objective is longer than 140 characters`);
      continue;
    }
    if (core30Titles.has(titleKey)) errors.push(`${where}: repeats a Core 30 lesson title`);
    if (lesson.title.length > 60) errors.push(`${where}: title is longer than 60 characters`);
    const spec = masterBlockOf(lesson.n);
    if (lesson.block !== spec.block) errors.push(`${where}: block must be "${spec.block}"`);
    if (lesson.n === 20 && lesson.lessonType !== "Capstone") errors.push(`${where}: Lesson 20 is the Capstone`);
    if (lesson.n !== 20 && lesson.lessonType === "Capstone") errors.push(`${where}: only Lesson 20 is a Capstone`);
    if (lesson.n !== 20 && lesson.lessonType && !spec.types.includes(lesson.lessonType))
      errors.push(`${where}: block ${spec.block} lessons are ${spec.types.filter((t) => t !== "Capstone").join(" or ")}`);
    for (const [label, text] of [
      ["title", lesson.title],
      ["objective", lesson.objective],
      ["speaking brief", lesson.speaking],
    ] as const) {
      if (BANNED_REVEAL.test(text))
        errors.push(`${where}: the ${label} must not mention a complication, surprise or twist (the AI springs it unannounced)`);
    }
    const focus = foldText(lesson.grammar?.focus ?? "");
    if (focus) {
      if (foci.has(focus)) errors.push(`${where}: same grammar focus as lesson ${foci.get(focus)}`);
      foci.set(focus, lesson.n);
    }
    for (const [e, example] of (lesson.grammar?.examples ?? []).entries()) {
      const label = `${where} grammar example ${e + 1}`;
      if (!ENDS.test(example.es) || !ENDS.test(example.en)) errors.push(`${label}: each side ends with . ? or !`);
      if (digits(example.es) !== digits(example.en)) errors.push(`${label}: numbers differ between the two sides`);
      const spanishSide = ctx.pair.language === "Spanish" ? example.es : example.en;
      const mark = invertedMarks(spanishSide);
      if (mark) errors.push(`${label}: ${mark}`);
      for (const issue of unattributedSpecs([example.es], ctx)) errors.push(`${label}: ${issue}`);
    }
  }
  return errors;
}

/** Master outline checks (before any lesson is written). */
export function outlineErrors(outline: MasterOutline, ctx: StageContext): string[] {
  const errors: string[] = [];
  if (!/^By Lesson 20, you can /.test(outline.threshold)) errors.push('threshold must start "By Lesson 20, you can "');
  if (outline.lessons.length !== 20) errors.push(`the outline has ${outline.lessons.length} lessons; it needs 20`);
  outline.lessons.forEach((lesson, i) => {
    if (lesson.n !== i + 1) errors.push(`outline lesson ${i + 1}: n must be ${i + 1}`);
    if (!lesson.title || !lesson.objective || !lesson.grammarFocus || !lesson.scene)
      errors.push(`outline lesson ${i + 1}: title, objective, grammarFocus and scene are all required`);
  });
  const asLessons: Core60StageLesson[] = outline.lessons.map((lesson) => ({
    n: lesson.n,
    title: lesson.title,
    objective: lesson.objective,
    words: [],
    speaking: "(outline)",
    grammar: { focus: lesson.grammarFocus, examples: [] },
    lessonType: lesson.lessonType,
    block: lesson.block,
  }));
  return [...errors, ...catalogErrors(outline.catalog, ctx), ...stageGeneratorErrors(asLessons, ctx)];
}

/** Every rule a stage curriculum must pass before step 2: the T3 validator plus the generator's checks. */
export function stageFileErrors(file: Core60StageFile, ctx: StageContext): string[] {
  const errors = validateStageFile(file, { moduleId: stageId(ctx), stage: ctx.stage, language: ctx.pair.language });
  const thresholdStart = ctx.stage === "foundation" ? "By Lesson 10, you can " : "By Lesson 20, you can ";
  if (!file.threshold.startsWith(thresholdStart)) errors.push(`threshold must start "${thresholdStart}"`);
  return [...errors, ...stageGeneratorErrors(file.lessons, ctx)];
}

/**
 * Validation of one Master block: the T3 per-lesson rules (on a padded 20-lesson file) for this
 * block's lessons, and the stage-wide checks over the block and `others`. `others` are the lessons
 * written before it (the normal, forward order) or, when a block is redone after the stage-wide
 * check failed, every other block: a clash with a LATER lesson (reported on that later lesson) is
 * then turned around so it names this block's lesson.
 */
export function blockErrors(
  lessons: readonly Core60StageLesson[],
  earlier: readonly Core60StageLesson[],
  ctx: StageContext,
  threshold: string,
): string[] {
  const all = [...earlier, ...lessons].sort((a, b) => a.n - b.n);
  const numbers = new Set(lessons.map((lesson) => lesson.n));
  const padded: Core60StageLesson[] = Array.from({ length: 20 }, (_, i) =>
    all.find((lesson) => lesson.n === i + 1) ?? PLACEHOLDER_MASTER_LESSON(i + 1),
  );
  const file = assembleStageFile(ctx, threshold, padded, { model: "check", generatedAt: "check" });
  const t3 = validateStageFile(file, { moduleId: stageId(ctx), stage: "master", language: ctx.pair.language }).filter(
    (error) => {
      const match = /^lesson (\d+)/.exec(error);
      return match ? numbers.has(Number(match[1])) : true;
    },
  );
  const upTo = Math.max(...all.map((lesson) => lesson.n));
  const stage = stageGeneratorErrors(all, ctx, upTo).flatMap((error) => {
    if (numbers.has(lessonOf(error))) return [error];
    const ref = referencedLesson(error);
    return ref !== null && numbers.has(ref)
      ? [`lesson ${ref}: clashes with a later lesson (${error}); change lesson ${ref}, the later lesson stays`]
      : [];
  });
  return [...t3, ...stage];
}

const lessonOf = (error: string) => Number(/^lesson (\d+)/.exec(error)?.[1] ?? 0);
const referencedLesson = (error: string): number | null => {
  const match = /(?:already a (?:term|phrase) of|same (?:title|grammar focus) as) lesson (\d+)/.exec(error);
  return match ? Number(match[1]) : null;
};

/**
 * The Master blocks to redo when the stage-wide check fails after every block was written: the
 * blocks of the lessons the errors name (a clash is reported on the later lesson, so that block is
 * redone); the last block when no error names a lesson.
 */
export function blocksToRedo(errors: readonly string[]): MasterBlock[] {
  const blocks = new Set<MasterBlock>();
  for (const error of errors) {
    const n = lessonOf(error);
    if (n >= 1 && n <= 20) blocks.add(masterBlockOf(n).block);
  }
  if (blocks.size === 0) blocks.add("E");
  return MASTER_BLOCKS.map((b) => b.block).filter((b) => blocks.has(b));
}

function PLACEHOLDER_MASTER_LESSON(n: number): Core60StageLesson {
  const spec = masterBlockOf(n);
  return {
    n,
    title: `Placeholder ${n}`,
    objective: "placeholder",
    words: [],
    speaking: "placeholder",
    grammar: { focus: `placeholder ${n}`, examples: [] },
    lessonType: n === 20 ? "Capstone" : spec.types[0],
    block: spec.block,
  };
}

// ─── Strict passage checks (beyond validateLessonContent) ────────────────────

/** Whole-word forms a head word may take in the passage (plural, gender). */
function headForms(word: string, language: string): Set<string> {
  const forms = new Set([word, `${word}s`, `${word}es`]);
  if (word.endsWith("s")) forms.add(word.slice(0, -1));
  if (word.endsWith("es")) forms.add(word.slice(0, -2));
  if (language === "Spanish") {
    if (word.endsWith("z")) forms.add(`${word.slice(0, -1)}ces`);
    if (word.endsWith("ces")) forms.add(`${word.slice(0, -3)}z`);
    for (const [a, b] of [["o", "a"], ["a", "o"], ["os", "as"], ["as", "os"], ["o", "as"], ["a", "os"]] as const) {
      if (word.endsWith(a)) forms.add(word.slice(0, -a.length) + b);
    }
  } else {
    if (word.endsWith("y")) forms.add(`${word.slice(0, -1)}ies`);
    if (word.endsWith("ies")) forms.add(`${word.slice(0, -3)}y`);
  }
  return forms;
}

/**
 * The head word of a term: Spanish leads with it ("la pistola de clavos" → pistola), English ends
 * with it ("the nail gun" → gun). Articles are skipped; an alternate after "/" or "(" is ignored.
 */
export function termHead(term: string, language: string): string | null {
  const first = term.split(/[/(]/)[0] ?? term;
  const articles = language === "Spanish" ? SPANISH_ARTICLES : ENGLISH_ARTICLES;
  const words = wordsOf(first).filter((w) => !articles.has(w));
  if (words.length === 0) return null;
  if (language === "Spanish") return words[0];
  const stop = new Set(["of", "for", "to", "in", "on", "and", "or", "with"]);
  const ofAt = words.findIndex((w) => stop.has(w));
  return ofAt > 0 ? words[ofAt - 1] : words[words.length - 1];
}

/** True when the term's head word appears as a whole word in the passage (M5's stricter check). */
export function termHeadUsed(term: string, passageWords: readonly string[], language: string): boolean {
  const head = termHead(term, language);
  if (!head) return true;
  const forms = headForms(head, language);
  if (passageWords.some((w) => forms.has(w))) return true;
  // A verb-like term (escalonar) or a very short head may be inflected: accept the stem.
  if (language === "Spanish" && /(ar|er|ir)$/.test(head) && head.length > 4) {
    const stem = stemOf(head);
    return passageWords.some((w) => w.startsWith(stem));
  }
  return false;
}

const DOSE_UNITS = /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|ml|mililitros?|miligramos?|microgramos?|milligrams?|micrograms?|milliliters?|cc|unidades|units?|gotas|drops|meq|tabletas|pastillas|tablets?|pills?|cápsulas|capsules?)\b/i;
const SPEC_UNITS = /\b\d+(?:[.,]\d+)?\s?(?:voltios|volts?|amperios|amps?|amperes?|awg|psi|ohmios|ohms?|kw|kilovatios|vatios|watts?)\b|\b(?:calibre|gauge)\s?\d+\b|\bNEC\b|\b(?:artículo|article|sección|section)\s?\d+/i;
// "120V", "20 A": single-letter units only in capitals and never "a. m." / "p. m.".
const LETTER_UNITS = /\b\d+\s?[VA]\b(?!\.)/;
// Attribution words, matched as whole words only ("per" is not "super", "lee" is not "leer"):
// a source (the order, the label, the protocol, the manufacturer, local code, the plans, a meter
// reading) named in the SAME sentence as the dose or specification.
const ATTRIBUTION_WORDS = [
  // Spanish
  "según", "segun", "de acuerdo con", "conforme a", "dice", "dicen", "indica", "indican", "marca", "marcan",
  "pide", "piden", "exige", "requiere", "orden", "órdenes", "ordenó", "ordena", "receta", "recetó",
  "prescrito", "prescrita", "prescripción", "prescribió", "protocolo", "política", "politica", "fabricante",
  "etiqueta", "plano", "planos", "código local", "codigo local", "código eléctrico", "inspector", "inspectora",
  "hoja técnica", "hoja de datos", "medidor", "probador", "multímetro", "mide", "miden", "medimos", "medí",
  "lee", "leo", "leemos", "placa", "instrucciones", "especificaciones",
  // English
  "according to", "per", "the order", "orders", "ordered", "prescribed", "prescription", "label",
  "manufacturer", "manufacturer's", "protocol", "policy", "plans", "local code", "inspector", "spec sheet",
  "data sheet", "nameplate", "meter", "tester", "reads", "shows", "measures", "measured", "says", "instructions",
];
const ATTRIBUTION = new RegExp(
  `(?<![\\p{L}\\p{N}'])(?:${ATTRIBUTION_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\p{L}\\p{N}])`,
  "iu",
);

/**
 * Sentences that state a dose or an electrical / code specification with no attribution in the
 * SAME sentence (a whole attribution word: según la orden / la etiqueta / el protocolo /
 * el fabricante / el código local, per the order …). Each entry is an error message for the retry.
 */
export function unattributedSpecs(sentences: readonly string[], ctx: StageContext): string[] {
  const out: string[] = [];
  sentences.forEach((sentence) => {
    const hit = DOSE_UNITS.test(sentence) || SPEC_UNITS.test(sentence) || LETTER_UNITS.test(sentence);
    if (!hit) return;
    if (!ATTRIBUTION.test(sentence))
      out.push(
        `"${sentence}" states a dose or specification as a universal fact; attribute it (${
          ctx.pair.language === "Spanish" ? "según la orden / el protocolo / el fabricante / el plano" : "per the order / protocol / manufacturer / plans"
        })`,
      );
  });
  return out;
}

const SERIES_SPLIT = /\s*[,;:]\s*|\s+(?:y|e|o|u|ni|and|or|nor)\s+/i;
/** At most this many words of a sentence outside a run of 3+ listed terms (subject + verb). */
const BARE_SERIES_MAX_OTHER = 3;

/**
 * Word-stuffed sentences: a sentence that only lists lesson terms (three or more in a row,
 * separated by commas or "y / o / and / or", with at most BARE_SERIES_MAX_OTHER other words:
 * "Marta revisa la protección, la capacidad y la cantidad."). One such list of exactly three terms
 * is allowed per passage, since people do name three things at once (Roofing F: "Necesito el arnés,
 * la cuerda y el martillo."); a second one, or a bare list of four or more terms, is an error. Each
 * entry is an error message for the retry. Using every term is still required; the terms belong in
 * different, natural sentences.
 */
export function bareTermSeries(
  sentences: readonly string[],
  words: readonly LessonWord[],
  language: string,
): string[] {
  const terms = words.filter((word) => word.kind === "term");
  const out: string[] = [];
  let allowed = 1;
  for (const sentence of sentences) {
    const total = wordsOf(sentence).length;
    const segments = sentence.replace(/[.?!…¿¡]+/g, " ").trim().split(SERIES_SPLIT).map(wordsOf);
    let run = 0;
    let runTermWords = 0;
    let best = { run: 0, termWords: 0 };
    for (const segment of segments) {
      const term = terms.find((t) => segment.length <= wordsOf(t.es).length + 3 && termHeadUsed(t.es, segment, language));
      if (term && segment.length > 0) {
        run += 1;
        runTermWords += Math.min(segment.length, wordsOf(term.es).length);
        if (run > best.run || (run === best.run && runTermWords > best.termWords)) best = { run, termWords: runTermWords };
      } else {
        run = 0;
        runTermWords = 0;
      }
    }
    if (best.run < 3 || total - best.termWords > BARE_SERIES_MAX_OTHER) continue;
    if (best.run === 3 && allowed > 0) {
      allowed -= 1;
      continue;
    }
    out.push(
      `"${sentence}" only lists ${best.run} lesson terms; give each term its own natural sentence (what is done with it, where, why) instead of a bare list`,
    );
  }
  return out;
}

/**
 * Every rule a lesson's passage + verbs must pass: validateLessonContent with the stage's limits
 * and the lesson's words, plus every term's head word in the passage as a whole word and attributed
 * specifications.
 */
export function stageContentErrors(
  content: LessonContentLesson,
  lesson: Core60StageLesson,
  ctx: StageContext,
): string[] {
  const limits = contentLimitsFor(stageId(ctx));
  const errors = validateLessonContent(content, {
    language: ctx.pair.language,
    nativeLanguage: ctx.pair.nativeLanguage,
    parts: { passage: true, words: false, verbs: true },
    words: lesson.words,
    limits,
  });
  if (!content.passage) return errors;
  const passageWords = content.passage.target.flatMap(wordsOf);
  const missing = lesson.words
    .filter((word) => word.kind === "term" && !termHeadUsed(word.es, passageWords, ctx.pair.language))
    .map((word) => word.es);
  if (missing.length > 0)
    errors.push(
      `these terms do not appear in the passage (their head word must appear as a whole word): ${missing.join(", ")}. Use every term`,
    );
  errors.push(...unattributedSpecs(content.passage.target, ctx));
  errors.push(...bareTermSeries(content.passage.target, lesson.words, ctx.pair.language));
  for (const verb of content.verbs) {
    for (const issue of unattributedSpecs([verb.example.target], ctx)) errors.push(`${verb.infinitive} example: ${issue}`);
  }
  return errors;
}

// ─── Estimates ───────────────────────────────────────────────────────────────

/**
 * Tokens per unit of work, validation retries included, for --dry-run. Measured on the 2026-10-20
 * pilot with claude-sonnet-5-5 (electrician + nursing, 60 lessons, $6.04): per Foundation
 * curriculum, per Foundation lesson, per Master outline, per Master block of four, per Master lesson.
 */
export const CORE60_CALL_ESTIMATES = {
  foundationCurriculum: { input: 12_700, output: 18_600 },
  foundationLesson: { input: 3_900, output: 3_600 },
  masterOutline: { input: 4_600, output: 7_300 },
  masterBlock: { input: 23_500, output: 14_500 },
  masterLesson: { input: 6_150, output: 5_450 },
} as const;

/**
 * claude-opus-5-5 relative to claude-sonnet-5-5 on the same Master stage (pilot: master-electrician,
 * Opus 152k in / 189k out with 3 retries vs Sonnet 250k / 189k with 12): fewer retries, so less
 * input; about the same output. Applied to Foundation stages too (not measured there).
 */
export const OPUS_TOKEN_RATIO = { input: 0.61, output: 1.0 } as const;

export interface StageEstimate {
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

/** Dollars for an estimate on a model (Opus tokens scaled by OPUS_TOKEN_RATIO). */
export function estimateCost(model: string, est: StageEstimate): number | null {
  const ratio = model === "claude-opus-5-5" ? OPUS_TOKEN_RATIO : { input: 1, output: 1 };
  return costUsd(model, est.inputTokens * ratio.input, est.outputTokens * ratio.output);
}

export function estimateStage(stage: Core60StageKind, lessonsLeft = stage === "foundation" ? 10 : 20, curriculumDone = false): StageEstimate {
  const e = CORE60_CALL_ESTIMATES;
  if (stage === "foundation") {
    const head = curriculumDone ? 0 : 1;
    return {
      calls: Math.round(head * 1.5 + lessonsLeft * 1.2),
      inputTokens: head * e.foundationCurriculum.input + lessonsLeft * e.foundationLesson.input,
      outputTokens: head * e.foundationCurriculum.output + lessonsLeft * e.foundationLesson.output,
    };
  }
  const head = curriculumDone ? 0 : 6;
  return {
    calls: Math.round(head * 1.5 + lessonsLeft * 1.35),
    inputTokens: (curriculumDone ? 0 : e.masterOutline.input + 5 * e.masterBlock.input) + lessonsLeft * e.masterLesson.input,
    outputTokens: (curriculumDone ? 0 : e.masterOutline.output + 5 * e.masterBlock.output) + lessonsLeft * e.masterLesson.output,
  };
}

export { CONTENT_LIMITS };
