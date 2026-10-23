interface NamedModule {
  id: string;
  name: string;
}
export const moduleBaseId = (id: string) => id.replace(/^(foundation|master)-/, "");
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
  const available = new Map(items.map((module) => [module.id, module]));
  const names = new Map(catalog.map((module) => [module.id, module]));
  const roots = new Map<string, T>();
  for (const module of items) {
    const base = moduleBaseId(module.id);
    roots.set(base, names.get(base) ?? module);
  }
  return [...roots.entries()]
    .map(([base, module]) => ({
      module,
      stages: [
        {
          key: "foundation" as const,
          label: "Foundation",
          module: available.get(`foundation-${base}`),
        },
        { key: "core" as const, label: "Core", module: available.get(base) },
        { key: "master" as const, label: "Master", module: available.get(`master-${base}`) },
      ],
    }))
    .sort((a, b) => a.module.name.localeCompare(b.module.name, "en", { sensitivity: "base" }));
}
