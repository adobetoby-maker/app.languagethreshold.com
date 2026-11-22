// Built by TAC — 2026-11-21
// The module library of a catalog pack (French and Italian): every module its catalog lists, in the
// same library group and with the same Foundation → Core → Master path as its Spanish twin.
//
// A pack whose lessons come from its catalog (catalogLessonPack) has no hand-written AppModule of
// its own. For each catalog module this file gives:
//   - the Core 30 module. A hand-written module with the same id that is written for no particular
//     language (no `languages`, no `authoredPair`: orthopedics, framer, …) is shared, exactly as the
//     Spanish course uses it. Any other module (French 101, Grammar Core 60, a trade whose
//     hand-written entry is Spanish-only) gets its own entry, named from the catalog and worded
//     for the pack's language; its id is the catalog id, or "<id>-<code>" when that id is taken.
//   - a manifest entry per module, so withDerivedStageModules adds its Foundation and Master stages
//     ("foundation-<id>-<code>", "master-<id>-<code>") and the Core 60 path lists them.
// Nothing here copies text written for another language.

import type { AppModule } from "../modules.ts";
import type { Core60ManifestEntry } from "../../lib/core60-stage-core.ts";
import { PACKS, historicalCoursePack, type LanguagePack } from "./registry.ts";
import { catalogModules } from "./catalog.ts";
import { catalogLessonPack } from "./catalog-lessons.ts";
import { nativeLanguageName } from "../languages.ts";

type CatalogEntry = ReturnType<typeof catalogModules>[number];

/** The app category of a catalog library group (the groups Spanish's twins are listed in). */
const GROUP_CATEGORY: Record<string, AppModule["category"]> = {
  "core-basics": "Core Basics",
  grammar: "Core Basics",
  conjugation: "Core Basics",
  cognates: "Core Basics",
  medical: "Medical",
  trade: "Trades",
};

const GROUP_EMOJI: Record<string, string> = {
  "core-basics": "🌱",
  grammar: "🧩",
  conjugation: "🔁",
  cognates: "🔗",
  medical: "🩺",
  trade: "🛠️",
};

/** Field vocabulary (English headwords, as every module lists them) for a group with no twin. */
const GROUP_VOCABULARY: Record<string, string[]> = {
  "core-basics": ["greetings", "questions", "everyday verbs", "numbers", "daily routine"],
  grammar: ["sentence patterns", "agreement", "questions", "negation", "word order"],
  conjugation: ["present tense", "past tense", "verb endings", "irregular verbs", "commands"],
  cognates: ["word families", "false friends", "pronunciation", "spelling", "context"],
  medical: ["symptoms", "history", "instructions", "consent", "follow-up"],
  trade: ["tools", "materials", "safety", "instructions", "quality checks"],
};

/** Packs whose module library comes from their catalog. */
export function catalogLibraryPacks(): LanguagePack[] {
  return PACKS.filter((pack) => catalogLessonPack(pack.code) === pack);
}

/** A hand-written module written for no particular language: shared by every course. */
function isSharedModule(module: AppModule | undefined): module is AppModule {
  return Boolean(module && !module.languages && !module.authoredPair && !module.learnDirection);
}

/** True when any of these texts names a language (or a regional variety). */
function twinNamesLanguage(texts: readonly string[]): boolean {
  const text = texts.join(" ").toLowerCase();
  const languageWords = PACKS.flatMap((pack) => [pack.name, pack.endonym, ...pack.legacyNames])
    .filter(Boolean)
    .map((word) => word.toLowerCase());
  return languageWords.some((word) => text.includes(word)) || /latin american/.test(text);
}

/** Text fields a hand-written twin may lend a catalog module: only when none names a language. */
function neutralTwinText(twin: AppModule | undefined): AppModule | undefined {
  if (!twin || twin.authoredPair || twin.learnDirection) return undefined;
  return twinNamesLanguage([
    twin.name,
    twin.blurb,
    twin.aiPersona,
    twin.userRole,
    ...twin.challengePrompts,
    ...twin.vocabFocus,
  ])
    ? undefined
    : twin;
}

/** Catalog-only general courses and the historical course's module each one mirrors. */
const GENERAL_TWINS: Record<string, string> = {
  grammar: "common-patterns",
  conjugation: "conjugation-patterns",
  cognates: "cognates",
};

/** The historical course's module this catalog module mirrors ("french-102" → "spanish-102"). */
function twinId(pack: LanguagePack, id: string): string {
  const own = `${pack.name.toLowerCase()}-`;
  const historical = `${historicalCoursePack().name.toLowerCase()}-`;
  if (id.startsWith(own)) return `${historical}${id.slice(own.length)}`;
  return GENERAL_TWINS[id] ? `${historical}${GENERAL_TWINS[id]}` : id;
}

/**
 * The historical-course module a French or Italian module id mirrors, for data kept per module
 * (picture scenes): "foundation-french-102-fr" → "spanish-102", "grammar-fr" →
 * "spanish-common-patterns", "orthopedics" → "orthopedics". Any other id is returned unchanged.
 */
export function catalogTwinModuleId(moduleId: string): string {
  const unstaged = moduleId.replace(/^(foundation|master)-/, "");
  for (const pack of catalogLibraryPacks()) {
    const suffix = `-${pack.code}`;
    const base = unstaged.endsWith(suffix) ? unstaged.slice(0, -suffix.length) : unstaged;
    if (catalogModules(pack).some((entry) => entry.id === base)) return twinId(pack, base);
  }
  return moduleId;
}

/** The Core 30 module id of a catalog module (catalog id, or "<id>-<code>" when taken). */
export function catalogCoreModuleId(
  pack: LanguagePack,
  id: string,
  handWritten: readonly AppModule[],
): string {
  const existing = handWritten.find((module) => module.id === id);
  if (isSharedModule(existing)) return id;
  const own = id.startsWith(`${pack.name.toLowerCase()}-`);
  return existing || !own ? `${id}-${pack.code}` : id;
}

/**
 * The module of a French or Italian course that a module id names. A learning link or saved state
 * may carry the historical course's id ("roofing", "foundation-spanish-basics",
 * "spanish-common-patterns") or the pack's own ("roofing-fr", "master-orthopedics-fr"). Returns the
 * pack's module id for the same course and stage, or null when the pack's library has no such
 * module (soccer, missionary, travel…), so the caller never opens another language's module.
 */
export function catalogModuleIdFor(
  pack: LanguagePack,
  moduleId: string,
  handWritten: readonly AppModule[],
): string | null {
  const stage = /^(foundation|master)-/.exec(moduleId)?.[1] ?? null;
  let base = stage ? moduleId.slice(stage.length + 1) : moduleId;
  const suffix = `-${pack.code}`;
  if (base.endsWith(suffix)) base = base.slice(0, -suffix.length);
  const entries = catalogModules(pack);
  const own = `${pack.name.toLowerCase()}-`;
  // A course of the pack's own ("french-common-patterns") is the twin of the historical course's
  // module before a general Core 60 module that mirrors it ("grammar").
  const entry =
    entries.find((candidate) => candidate.id === base) ??
    entries.find(
      (candidate) => candidate.id.startsWith(own) && twinId(pack, candidate.id) === base,
    ) ??
    entries.find((candidate) => twinId(pack, candidate.id) === base);
  if (!entry) return null;
  return stage
    ? `${stage}-${entry.id}-${pack.code}`
    : catalogCoreModuleId(pack, entry.id, handWritten);
}

function ownModule(
  pack: LanguagePack,
  entry: CatalogEntry,
  handWritten: readonly AppModule[],
): AppModule {
  const twin = handWritten.find((module) => module.id === twinId(pack, entry.id));
  const lend = neutralTwinText(twin);
  const group = entry.group ?? "core-basics";
  const title = entry.title ?? entry.id;
  const native = nativeLanguageName(pack.native.default) ?? "English";
  const stages = entry.stages ?? { foundation: 10, working: 30, master: 20 };
  return {
    id: catalogCoreModuleId(pack, entry.id, handWritten),
    name: title,
    emoji: twin?.emoji ?? GROUP_EMOJI[group] ?? "📘",
    category: twin?.category ?? GROUP_CATEGORY[group] ?? "Core Basics",
    blurb:
      pack.library.guidance?.[entry.id] ??
      lend?.blurb ??
      `${title} in ${pack.name}: ${stages.foundation} Foundation, ${stages.working} Core and ${stages.master} Master lessons with ${native} support.`,
    priceCents: twin?.priceCents ?? 0,
    aiPersona:
      lend?.aiPersona ??
      `You are a patient ${pack.name} teacher for a ${native}-speaking learner. Practise the selected lesson's words, phrases and grammar in ${pack.name}, explain briefly in ${native} only when the learner is stuck, and correct gently.`,
    userRole:
      lend?.userRole ??
      `${/^[AEIOU]/i.test(pack.name) ? "An" : "A"} ${pack.name} learner working through ${title}`,
    challengePrompts: lend
      ? [...lend.challengePrompts]
      : [
          `Use this lesson's words in a short exchange in ${pack.name}.`,
          `Ask and answer one question about ${title} in ${pack.name}.`,
          `Retell what you practised today in ${pack.name}, in three sentences.`,
        ],
    // A language-specific twin's field words are written in its language (hablar, comer…).
    vocabFocus: lend
      ? [...lend.vocabFocus]
      : [...(GROUP_VOCABULARY[group] ?? GROUP_VOCABULARY["core-basics"])],
    languages: [pack.name],
  };
}

/** The Core 30 modules a catalog pack needs that no shared hand-written module provides. */
export function catalogCoreModules(handWritten: readonly AppModule[]): AppModule[] {
  return catalogLibraryPacks().flatMap((pack) =>
    catalogModules(pack)
      .filter((entry) => !isSharedModule(handWritten.find((module) => module.id === entry.id)))
      .map((entry) => ownModule(pack, entry, handWritten)),
  );
}

/** One manifest entry per catalog module: its Foundation and Master stages and path. */
export function catalogManifestEntries(handWritten: readonly AppModule[]): Core60ManifestEntry[] {
  return catalogLibraryPacks().flatMap((pack) =>
    catalogModules(pack).map((entry) => ({
      base: catalogCoreModuleId(pack, entry.id, handWritten),
      language: pack.name,
      tradeLabel: entry.title,
      foundation: { moduleId: `foundation-${entry.id}-${pack.code}` },
      master: { moduleId: `master-${entry.id}-${pack.code}` },
    })),
  );
}
