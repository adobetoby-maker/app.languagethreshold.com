// Built by TAC — 2026-10-19
// Strict rules for a Core 60 stage file (src/lib/core60-stage-core.ts) and for the manifest. Run by
// the generator before it writes, by `npm run validate:core60` (scripts/validate-core60.mts) and by
// the tests; the app itself only runs the structural parseStageFile. Returns error lists
// (empty = valid) so a generator can feed them back into a retry.

import type { LessonWord } from "../data/curriculum.ts";
import type { AppModule } from "../data/modules.ts";
import { LANGUAGES } from "../data/languages.ts";
import { contentLimitsFor, invisibleCharErrors } from "./lesson-content-core.ts";
import { languageTag } from "./lesson-words-core.ts";
import {
  CORE60_BLOCKS,
  CORE60_LESSON_TYPES,
  CORE60_STAGE_FILE_VERSION,
  CORE60_STAGE_LESSONS,
  stageModuleId,
  type Core60ManifestEntry,
  type Core60StageKind,
} from "./core60-stage-core.ts";

const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && value === value.trim();

function validateWords(words: unknown, moduleId: string, where: string, errors: string[]) {
  if (!Array.isArray(words)) {
    errors.push(`${where}: words must be an array`);
    return;
  }
  const limits = contentLimitsFor(moduleId);
  const seen = new Set<string>();
  let terms = 0;
  let phrases = 0;
  words.forEach((raw, index) => {
    const word = raw as Partial<LessonWord> | null;
    const at = `${where} word ${index + 1}`;
    if (!word || typeof word !== "object") {
      errors.push(`${at}: not an object`);
      return;
    }
    if (!text(word.es)) errors.push(`${at}: es (target-language text) is missing or untrimmed`);
    if (!text(word.en)) errors.push(`${at}: en (native-language text) is missing or untrimmed`);
    if (word.kind === "term") terms += 1;
    else if (word.kind === "phrase") phrases += 1;
    else errors.push(`${at}: kind must be "term" or "phrase"`);
    if (word.note !== undefined) {
      if (!text(word.note)) errors.push(`${at}: note must be a non-empty string when present`);
      else if (word.note.length > limits.maxNoteLength)
        errors.push(`${at}: note is longer than ${limits.maxNoteLength} characters`);
    }
    const key = typeof word.es === "string" ? word.es.toLocaleLowerCase() : "";
    if (key && seen.has(key)) errors.push(`${at}: "${word.es}" appears twice in this lesson`);
    seen.add(key);
  });
  if (terms < limits.minTerms || terms > limits.maxTerms)
    errors.push(`${where}: ${terms} terms, needs ${limits.minTerms}-${limits.maxTerms}`);
  if (phrases < limits.minPhrases || phrases > limits.maxPhrases)
    errors.push(`${where}: ${phrases} phrases, needs ${limits.minPhrases}-${limits.maxPhrases}`);
}

export interface StageFileExpectation {
  moduleId?: string;
  stage?: Core60StageKind;
  language?: string;
}

/** Every rule a stage file must pass before it ships. */
export function validateStageFile(raw: unknown, expected: StageFileExpectation = {}): string[] {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return ["file is not a JSON object"];
  const file = raw as Record<string, unknown>;
  if (file.version !== CORE60_STAGE_FILE_VERSION)
    errors.push(`version must be ${CORE60_STAGE_FILE_VERSION}`);
  const stage = file.stage;
  if (stage !== "foundation" && stage !== "master") {
    errors.push('stage must be "foundation" or "master"');
    return errors;
  }
  if (!text(file.baseModule)) errors.push("baseModule is missing");
  else if (file.module !== stageModuleId(stage, file.baseModule))
    errors.push(`module must be "${stageModuleId(stage, file.baseModule)}"`);
  if (expected.moduleId && file.module !== expected.moduleId)
    errors.push(`module must be "${expected.moduleId}" (from the file name / manifest)`);
  if (expected.stage && stage !== expected.stage) errors.push(`stage must be "${expected.stage}"`);
  if (!text(file.language)) errors.push("language is missing");
  else if (expected.language && file.language !== expected.language)
    errors.push(`language must be "${expected.language}" (from the manifest)`);
  if (!text(file.nativeLanguage)) errors.push("nativeLanguage is missing");
  else if (file.nativeLanguage === file.language)
    errors.push("nativeLanguage must differ from language");
  if (!text(file.headline)) errors.push("headline is missing");
  if (!text(file.threshold)) errors.push("threshold is missing");
  if (typeof file.reviewed !== "boolean") errors.push("reviewed must be true or false");
  for (const key of ["model", "generatedAt"] as const) {
    if (file[key] !== undefined && !text(file[key])) errors.push(`${key} must be a string`);
  }
  for (const key of ["headline", "threshold"] as const) errors.push(...invisibleCharErrors(key, file[key]));
  const moduleId = typeof file.module === "string" ? file.module : `${stage}-`;
  const lessons = file.lessons;
  if (!Array.isArray(lessons)) {
    errors.push("lessons must be an array");
    return errors;
  }
  const count = CORE60_STAGE_LESSONS[stage];
  if (lessons.length !== count) errors.push(`a ${stage} has ${count} lessons, found ${lessons.length}`);
  const limits = contentLimitsFor(moduleId);
  lessons.forEach((raw, index) => {
    const where = `lesson ${index + 1}`;
    if (!raw || typeof raw !== "object") {
      errors.push(`${where}: not an object`);
      return;
    }
    const lesson = raw as Record<string, unknown>;
    errors.push(...invisibleCharErrors(where, lesson));
    if (lesson.n !== index + 1) errors.push(`${where}: n must be ${index + 1}`);
    if (!text(lesson.title)) errors.push(`${where}: title is missing`);
    else if (lesson.title.length > limits.maxTitleLength)
      errors.push(`${where}: title is longer than ${limits.maxTitleLength} characters`);
    if (!text(lesson.objective)) errors.push(`${where}: objective is missing`);
    if (!text(lesson.speaking)) errors.push(`${where}: speaking (the Say it brief) is missing`);
    validateWords(lesson.words, moduleId, where, errors);
    if (stage === "foundation") {
      if (!text(lesson.focus)) errors.push(`${where}: focus is missing`);
      for (const key of ["grammar", "lessonType", "block"] as const) {
        if (lesson[key] !== undefined) errors.push(`${where}: ${key} belongs to Master lessons only`);
      }
      return;
    }
    if (lesson.focus !== undefined && !text(lesson.focus))
      errors.push(`${where}: focus must be a string when present`);
    const grammar = lesson.grammar as Record<string, unknown> | undefined;
    if (!grammar || typeof grammar !== "object") errors.push(`${where}: grammar is missing`);
    else {
      if (!text(grammar.focus)) errors.push(`${where}: grammar.focus is missing`);
      const examples = grammar.examples;
      if (!Array.isArray(examples) || examples.length !== 2)
        errors.push(`${where}: grammar.examples must hold exactly two examples`);
      else
        examples.forEach((example, e) => {
          const ex = example as Record<string, unknown> | null;
          if (!ex || !text(ex.es) || !text(ex.en))
            errors.push(`${where}: grammar example ${e + 1} needs es and en`);
        });
    }
    if (!CORE60_LESSON_TYPES.includes(lesson.lessonType as (typeof CORE60_LESSON_TYPES)[number]))
      errors.push(`${where}: lessonType must be one of ${CORE60_LESSON_TYPES.join(", ")}`);
    if (!CORE60_BLOCKS.includes(lesson.block as (typeof CORE60_BLOCKS)[number]))
      errors.push(`${where}: block must be one of ${CORE60_BLOCKS.join(", ")}`);
  });
  return errors;
}

/**
 * Manifest rules: each base is a known Core 30 module listed once, with at least one stage, a
 * target language that is in the app's language list (and offered by the base when it lists its
 * languages), and no stage id that is already a hand-written module.
 */
export function validateManifest(
  manifest: readonly Core60ManifestEntry[],
  catalog: readonly AppModule[],
  hasCurriculum: (moduleId: string) => boolean,
): string[] {
  const errors: string[] = [];
  const ids = new Map(catalog.map((m) => [m.id, m]));
  const bases = new Set<string>();
  for (const entry of manifest) {
    const where = `manifest entry "${entry.base}"`;
    if (bases.has(entry.base)) errors.push(`${where}: listed twice`);
    bases.add(entry.base);
    const base = ids.get(entry.base);
    if (!base) {
      errors.push(`${where}: no module with that id`);
      continue;
    }
    if (/^(foundation|master)-/.test(entry.base)) errors.push(`${where}: base must be a Core 30 module`);
    if (!hasCurriculum(entry.base)) errors.push(`${where}: the base module has no Core 30 curriculum`);
    if (!entry.foundation && !entry.master) errors.push(`${where}: lists no stage`);
    if (!text(entry.language)) errors.push(`${where}: language is missing`);
    else if (!(LANGUAGES as readonly string[]).includes(entry.language) || languageTag(entry.language) === "und")
      errors.push(
        `${where}: "${entry.language}" is not a language the app supports (${LANGUAGES.join(", ")})`,
      );
    else if (base.languages && !base.languages.includes(entry.language as never))
      errors.push(`${where}: ${base.name} is not offered in ${entry.language}`);
    for (const stage of ["foundation", "master"] as const) {
      if (entry[stage]) errors.push(...invisibleCharErrors(`${where} ${stage}`, entry[stage]));
      if (entry[stage] && ids.has(stageModuleId(stage, entry.base)))
        errors.push(`${where}: ${stageModuleId(stage, entry.base)} is already a hand-written module`);
    }
  }
  return errors;
}
