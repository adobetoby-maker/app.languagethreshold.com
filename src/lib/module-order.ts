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
