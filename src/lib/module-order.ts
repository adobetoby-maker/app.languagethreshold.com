import { PACKS } from "../data/language-packs/registry.ts";

/** Codes whose stage ids end in "-<code>" (packs without legacy unscoped ids). */
const SUFFIXED_STAGE_CODES = new Set(
  PACKS.filter((pack) => !pack.ids.legacyUnscopedStorage).map((pack) => pack.code),
);
interface NamedModule {
  id: string;
  name: string;
}
/**
 * The catalog module a module id stands for: drops the stage prefix and, for a pack whose ids
 * carry their language (core60-stage-core manifestStageModuleId, catalog-modules.ts), the
 * "-<code>" suffix: "foundation-orthopedics-fr" and "grammar-fr" give "orthopedics" and "grammar".
 * Ids of the other courses never end in such a suffix, so theirs are unchanged.
 */
export const moduleBaseId = (id: string) => {
  const base = id.replace(/^(foundation|master)-/, "");
  const dash = base.lastIndexOf("-");
  const code = dash > 0 ? base.slice(dash + 1) : "";
  return SUFFIXED_STAGE_CODES.has(code) ? base.slice(0, dash) : base;
};
const stageRank = (id: string) =>
  id.startsWith("foundation-") ? 0 : id.startsWith("master-") ? 2 : 1;

/** Alphabetize trades, keeping each trade's Foundation → Core → Master together. */
export function modulesInLearningOrder<T extends NamedModule>(
  items: readonly T[],
  catalog: readonly NamedModule[] = items,
): T[] {
  const names = new Map(catalog.map((module) => [module.id, module.name]));
  const tradeName = (module: NamedModule) =>
    names.get(moduleBaseId(module.id)) ??
    module.name.replace(/\s+(Foundation|Master)(\s+\d+)?$/i, "");
  return [...items].sort(
    (a, b) =>
      tradeName(a).localeCompare(tradeName(b), "en", { sensitivity: "base" }) ||
      stageRank(a.id) - stageRank(b.id) ||
      a.name.localeCompare(b.name, "en"),
  );
}

export interface ModuleLearningPath<T extends NamedModule> {
  module: T;
  stages: { key: "foundation" | "core" | "master"; label: string; module: T | undefined }[];
}

/** One card per topic; only actually available stages can be opened. */
export function moduleLearningPaths<T extends NamedModule>(
  items: readonly T[],
  catalog: readonly T[] = items,
): ModuleLearningPath<T>[] {
  const names = new Map(catalog.map((module) => [module.id, module]));
  const paths = new Map<string, { foundation?: T; core?: T; master?: T; first: T }>();
  for (const module of items) {
    const base = moduleBaseId(module.id);
    const slot = module.id.startsWith("foundation-")
      ? "foundation"
      : module.id.startsWith("master-")
        ? "master"
        : "core";
    const path = paths.get(base) ?? { first: module };
    path[slot] ??= module;
    paths.set(base, path);
  }
  return [...paths.entries()]
    .map(([base, path]) => ({
      module: path.core ?? names.get(base) ?? path.first,
      stages: [
        { key: "foundation" as const, label: "Foundation", module: path.foundation },
        { key: "core" as const, label: "Core", module: path.core },
        { key: "master" as const, label: "Master", module: path.master },
      ],
    }))
    .sort((a, b) => a.module.name.localeCompare(b.module.name, "en", { sensitivity: "base" }));
}
