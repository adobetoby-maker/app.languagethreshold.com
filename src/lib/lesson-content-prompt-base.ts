// Built by TAC — 2026-11-21
// The base app's lesson-content prompt (df664f7c9), verbatim: levelFor, the register note, the
// sections, the user content and the tool schema. Owner rule 3 of 2026-11-21: every language that
// is not a released course pack (Spanish, English, German, Portuguese, Chinese, Korean, Pashto,
// Japanese) keeps exactly this prompt. lesson-content-prompt.ts dispatches here for them.

import { CONTENT_LIMITS, type ContentParts } from "./lesson-content-core.ts";
import type { ContentRequestArgs } from "./lesson-content-prompt.ts";

const LESSON_CONTENT_TOOL_NAME = "return_lesson_content";

const MODEL_FORM_KEYS = {
  Spanish: ["yo", "tu", "el_ella_usted", "nosotros", "ellos_ustedes"],
  English: ["i", "you", "he_she", "we", "they"],
} as const;

/** Language level for a lesson, scaled by its position in the module (30, 15 or 10 lessons). */
export function baseLevelFor(
  lessonNumber: number,
  lessonCount: number,
): { band: string; guide: string } {
  const position = lessonNumber / Math.max(1, lessonCount);
  if (position <= 1 / 3) {
    return {
      band: "A1-A2",
      guide:
        "short present-tense sentences, 4 to 10 words each, concrete everyday work words, no subordinate clauses",
    };
  }
  if (position <= 2 / 3) {
    return {
      band: "A2-B1",
      guide:
        "sequencing words (first, then, after), imperatives, the near future (ir a + infinitive in Spanish, going to in English) and the simple past; sentences up to about 14 words",
    };
  }
  return {
    band: "B1",
    guide:
      "reasons (because), conditions (if), safety and quality explanations, polite negotiation; sentences up to about 18 words",
  };
}

/** Notes (word or verb) carry the final rule only. Enforced by selfTalkIssue in lesson-content-core.ts. */
const NOTE_FINAL_RULE =
  'Every note states the final rule only, never deliberation or self-correction: decide the answer before you write it, and never write "? No:", "... no", "wait", "actually", "hmm" or "let me" in a note (write "Stem change e to i (pido, pides), except nosotros.", not "Stem change e to ie? No: e to i").';

const REGION_RULE =
  "Use one regional variety per lesson, matching the setting, and never mix them: Spain uses euros, billete, camarero, comisaría, franquicia; Mexico and Latin America use pesos, boleto, mesero, deducible.";

const DIRECT_SPEECH_RULE =
  'Direct speech goes at the end of a sentence, after a colon; it never runs into narration (write "El jefe dice: Revisen la cuchilla.", never "El jefe dice: Revisen la cuchilla, y Marta corta.").';

/** The passage rules added after the 277-lesson blind review (items introduced, coverage, region, speech). */
const PASSAGE_QUALITY_RULES: readonly string[] = [
  "Every item, charge, fee, document or person a sentence refers to, disputes or questions is introduced earlier in that passage; never dispute, confirm or answer something the passage has not raised.",
  "Every clause of the lesson objective and roleplay is covered by at least one full sentence of its own; a capstone's listed beats each get their own sentence (a long conversation is several sentences, and an emergency is a sentence that says what happened and what to do, not only a stray phrase).",
  "Any question about allergies or ingredients is answered in the passage.",
  REGION_RULE,
  DIRECT_SPEECH_RULE,
];

export function baseLessonContentSystemPrompt(
  targetLanguage: string,
  nativeLanguage: string,
  parts: ContentParts,
): string {
  const spanishTarget = targetLanguage === "Spanish";
  const registerNote = spanishTarget
    ? "Spanish register: a crew lead or foreman speaking to a crew uses the plural ustedes imperative (corten, revisen, traigan); speaking to ONE person (a customer, a patient, one worker) uses usted. Use Mexican / US Spanish as working tradespeople and staff in the United States actually say it, including a common loanword when that is what people say on the job (troca, yarda, mopear) but only when it is standard job-site usage. Write ¿ and ¡ properly."
    : "English register: plain, current American English as used in a US hospital or workplace (short, direct, polite); the learner's native language is Spanish (neutral Latin American Spanish).";

  const sections: string[] = [];
  if (parts.passage) {
    sections.push(
      `PASSAGE: ${CONTENT_LIMITS.minSentences} to ${CONTENT_LIMITS.maxSentences} sentences forming ONE short, coherent, realistic scene about THIS lesson's objective: the situation named in the lesson title and objective, with a speaker, a place and a purpose. Do not drift to the module's generic topic (a lesson called "Morning Crew Meeting" is a crew lead running a morning safety and task meeting, not an irrigation repair). Give it a short title (2 to 6 words) in ${targetLanguage}. Every ${targetLanguage} sentence has exactly one ${nativeLanguage} sentence at the same position: translate sentence by sentence, never merge or split. Each sentence ends with . ? or ! . Do not use quotation marks or dialogue dashes anywhere: report speech with a colon (El jefe dice: Revisen la cuchilla.). If numbers appear, write them as digits and use exactly the same digits in the ${nativeLanguage} sentence. Dialogue is written inline inside one sentence, not as separate speaker lines. The passage must visibly use at least 6 of the lesson's own terms and at least 2 of its phrases, written as they appear in the word list (inflect only where grammar demands it), so the learner reads what they practice next.`,
    );
  }
  if (parts.words) {
    sections.push(
      `WORDS: ${CONTENT_LIMITS.minTerms} to ${CONTENT_LIMITS.maxTerms} job-specific single terms (nouns, tools, parts, short noun phrases of at most 4 words) and ${CONTENT_LIMITS.minPhrases} to ${CONTENT_LIMITS.maxPhrases} short phrases the learner would actually SAY on the job (a sentence or question of at most 12 words, spoken by the learner, never an instruction about practicing). Write terms WITHOUT articles on either side ("césped" and "lawn", not "el césped" and "the lawn"; plural only when the thing is normally plural, like gloves), and each phrase as ONE sentence. Prefer words the lesson's step instructions name. No duplicates on either side; no generic filler (hello, thank you) unless the lesson is about it. Add a short "note" (written in ${nativeLanguage}) only when a usage or register tip really helps.`,
    );
  }
  if (parts.verbs) {
    const keys = MODEL_FORM_KEYS[targetLanguage === "English" ? "English" : "Spanish"].join(", ");
    sections.push(
      `VERBS: ${CONTENT_LIMITS.minVerbs} to ${CONTENT_LIMITS.maxVerbs} verbs this lesson's job actually needs (for a crew lead: command and task verbs; for a clinician: the verbs of the encounter). Choose verbs that appear in, or fit naturally with, the passage and the word list. For each: "infinitive" (${
        targetLanguage === "Spanish"
          ? "the Spanish infinitive, e.g. cortar, or reflexive lavarse"
          : 'the bare English verb, e.g. "clean", with no "to"'
      }), "native" (the meaning in ${nativeLanguage}${
        targetLanguage === "Spanish" ? ', written like "to cut"' : ', e.g. "limpiar"'
      }), "forms" (PRESENT TENSE ONLY, one string per key: ${keys}; give the bare verb form with no pronoun in front${
        targetLanguage === "Spanish"
          ? ', except the reflexive pronoun for reflexive verbs ("me lavo", "nos lavamos"). All five forms must be different and must be correct: nosotros ends in -mos, ellos/ustedes ends in -n, tú ends in -s. Mark stem changes in "note" (o to ue)'
          : '; the he/she form takes the -s ("cleans"). "i", "you", "we", "they" are the base verb'
      }), "example" (one short natural sentence from this lesson's scene that uses one form of the verb, with its ${nativeLanguage} translation), and an optional short "note" (written in ${nativeLanguage}, the learner's own language, never in ${targetLanguage}) for an irregularity or register tip. The example must use the PRESENT tense (or a command) so it matches the forms the learner is practicing, never the past tense.`,
    );
  }

  return `You write authored lesson content for ONE lesson of a job-language course, as a careful bilingual lesson writer would. The learner's native language is ${nativeLanguage}; the language they are learning is ${targetLanguage}. Everything is delivered by calling the ${LESSON_CONTENT_TOOL_NAME} tool; always call it, once.

${registerNote}

${sections.join("\n\n")}

Rules for everything you write:
- Translate, never convert: numbers, units, times, names and quantities must be identical on both sides (90 centímetros is 90 centimeters, not 36 inches).
- Never invent procedures, doses, product amounts, measurements, regulations or specifications and state them as universal facts. When a figure or step matters, attribute it: the manufacturer's label, the job spec, the plan, local code, the supervisor, the clinician or the policy. This holds even when the lesson's step instructions state a figure or specification as a flat fact: keep the figure if it helps, but have a speaker attribute it ("según el plano", "la etiqueta dice", "as the job spec says"). A worker repeating "la etiqueta dice..." is correct; a flat claim is not.
- Medical, legal and safety topics teach communication and verification, never an unsupported dose, diagnosis or legal conclusion.
- Use the word people in this trade actually say in ${targetLanguage}; never coin a literal word-for-word phrase. If you are unsure of the right ${targetLanguage} term, choose a different, safer term instead of guessing.
- Level for this lesson is given in the request. Keep the language inside it. Avoid stereotypes, slang the learner could misuse, and anything unsafe.
- Stay consistent: the passage, words and verbs of this lesson must belong together.${
    parts.words || parts.verbs ? `\n- ${NOTE_FINAL_RULE}` : ""
  }${parts.passage ? PASSAGE_QUALITY_RULES.map((rule) => `\n- ${rule}`).join("") : ""}`;
}

export function baseLessonContentUserContent(args: ContentRequestArgs): string {
  const { module, lesson, lessonCount, previousTitle, targetLanguage, nativeLanguage, authored } =
    args;
  const level = baseLevelFor(lesson.n, lessonCount);
  return JSON.stringify({
    module: module.name,
    moduleDescription: module.blurb,
    learnerRole: module.userRole,
    moduleVocabularyFocus: module.vocabFocus,
    lesson: {
      number: lesson.n,
      of: lessonCount,
      title: lesson.title,
      objective: lesson.objective,
      steps: lesson.steps.map((step) => step.instruction),
      previousLessonTitle: previousTitle,
    },
    level: { cefr: level.band, guide: level.guide },
    targetLanguage,
    nativeLanguage,
    produce: Object.entries(args.parts)
      .filter(([, wanted]) => wanted)
      .map(([part]) => part),
    ...(authored
      ? {
          alreadyWrittenForThisLesson: {
            passage: authored.passage ?? undefined,
            words: authored.words?.map((w) => ({
              kind: w.kind,
              target: w.es,
              native: w.en,
            })),
            note: "Write the missing parts to fit these exactly.",
          },
        }
      : {}),
  });
}

const PAIR_SCHEMA = {
  type: "object",
  properties: {
    native: { type: "string" },
    target: { type: "string" },
    note: { type: "string" },
  },
  required: ["native", "target"],
  additionalProperties: false,
};

function verbSchema(targetLanguage: string) {
  const keys = MODEL_FORM_KEYS[targetLanguage === "English" ? "English" : "Spanish"];
  return {
    type: "object",
    properties: {
      infinitive: { type: "string" },
      native: { type: "string" },
      forms: {
        type: "object",
        description: "Present tense. Bare verb forms, no pronoun in front.",
        properties: Object.fromEntries(keys.map((key) => [key, { type: "string" }])),
        required: [...keys],
        additionalProperties: false,
      },
      example: {
        type: "object",
        properties: { target: { type: "string" }, native: { type: "string" } },
        required: ["target", "native"],
        additionalProperties: false,
      },
      note: { type: "string" },
    },
    required: ["infinitive", "native", "forms", "example"],
    additionalProperties: false,
  };
}

export function baseLessonContentTools(targetLanguage: string, parts: ContentParts) {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  if (parts.passage) {
    properties.passage = {
      type: "object",
      properties: {
        title: { type: "string", description: `Short title in ${targetLanguage}.` },
        target: {
          type: "array",
          description: `${CONTENT_LIMITS.minSentences} to ${CONTENT_LIMITS.maxSentences} sentences in ${targetLanguage}.`,
          minItems: CONTENT_LIMITS.minSentences,
          maxItems: CONTENT_LIMITS.maxSentences,
          items: { type: "string" },
        },
        native: {
          type: "array",
          description: "The same sentences translated, one per sentence, same order.",
          minItems: CONTENT_LIMITS.minSentences,
          maxItems: CONTENT_LIMITS.maxSentences,
          items: { type: "string" },
        },
      },
      required: ["title", "target", "native"],
      additionalProperties: false,
    };
    required.push("passage");
  }
  if (parts.words) {
    properties.words = {
      type: "object",
      properties: {
        terms: {
          type: "array",
          minItems: CONTENT_LIMITS.minTerms,
          maxItems: CONTENT_LIMITS.maxTerms,
          items: PAIR_SCHEMA,
        },
        phrases: {
          type: "array",
          minItems: CONTENT_LIMITS.minPhrases,
          maxItems: CONTENT_LIMITS.maxPhrases,
          items: PAIR_SCHEMA,
        },
      },
      required: ["terms", "phrases"],
      additionalProperties: false,
    };
    required.push("words");
  }
  if (parts.verbs) {
    properties.verbs = {
      type: "array",
      minItems: CONTENT_LIMITS.minVerbs,
      maxItems: CONTENT_LIMITS.maxVerbs,
      items: verbSchema(targetLanguage),
    };
    required.push("verbs");
  }
  return [
    {
      name: LESSON_CONTENT_TOOL_NAME,
      description: "Return the authored content for this lesson",
      input_schema: {
        type: "object" as const,
        properties,
        required,
        additionalProperties: false,
      },
    },
  ];
}
