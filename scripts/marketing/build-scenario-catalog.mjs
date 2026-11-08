import { build } from "esbuild";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
const compiled = await build({
  stdin: {
    contents:
      'export { getSpeakingModules, getSpeakingMissions, speakingCatalogModuleId } from "./src/data/speaking-missions.ts"; export { MODULES, moduleSupportsLearningPair } from "./src/data/modules.ts";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  logLevel: "silent",
});
const {
  getSpeakingModules,
  getSpeakingMissions,
  speakingCatalogModuleId,
  MODULES,
  moduleSupportsLearningPair,
} = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const allowed = new Set(
  MODULES.filter((m) => moduleSupportsLearningPair(m, "Spanish", "English")).map((m) => m.id),
);
allowed.add("core-speaking");
const modules = getSpeakingModules("Spanish", "English").filter((m) => allowed.has(m.id));
const moduleIds = new Set(modules.map((m) => m.id));
const tasks = getSpeakingMissions("Spanish").filter(
  (m) =>
    moduleIds.has(speakingCatalogModuleId(m.moduleId)) &&
    (m.moduleId === "core-speaking" || allowed.has(m.moduleId)),
);
if (new Set(tasks.map((m) => m.id)).size !== tasks.length)
  throw new Error("Duplicate scenario IDs");
const check = process.argv.includes("--check");
const save = (path, data) => {
  const text = JSON.stringify(data, null, 2) + "\n";
  if (check) {
    if (!existsSync(path) || readFileSync(path, "utf8") !== text)
      throw new Error(`Stale scenario catalog: ${path}`);
  } else writeFileSync(path, text);
};
const levels = ["A1", "A2", "B1"];
if (tasks.some((task) => !levels.includes(task.level)))
  throw new Error("Unknown speaking-task level");
const summarize = (list) =>
  Object.fromEntries(levels.map((level) => [level, list.filter((m) => m.level === level).length]));
const dir = "public/scenario-catalog/es";
if (!check) mkdirSync(dir, { recursive: true });
const index = modules
  .map((module) => {
    const missions = tasks
      .filter((m) => speakingCatalogModuleId(m.moduleId) === module.id)
      .map((m) => ({
        id: m.id,
        moduleId: m.moduleId,
        title: m.title,
        summary: m.summary,
        level: m.level,
        stage: m.moduleId.startsWith("foundation-")
          ? "Foundation"
          : m.moduleId.startsWith("master-")
            ? "Master"
            : m.coreSection
              ? "Core speaking"
              : "Core / roleplay",
        kind: m.coreSection ?? (m.sourceObjectiveId ? "Lesson speaking task" : "Roleplay"),
        learnerRole: m.learnerRole,
        partnerRole: m.partnerRole,
        objectives: m.objectives.map((o) => o.description),
        href: `/?tab=speak&module=${encodeURIComponent(speakingCatalogModuleId(m.moduleId) === "core-speaking" ? "core" : speakingCatalogModuleId(m.moduleId))}&target=Spanish&native=English&mission=${encodeURIComponent(m.id)}`,
      }));
    save(`${dir}/${module.id}.json`, {
      id: module.id,
      language: "Spanish",
      nativeLanguage: "English",
      missions,
    });
    return {
      id: module.id,
      name: module.name,
      category: module.category,
      summary: module.blurb,
      role: module.userRole,
      count: missions.length,
      levels: summarize(missions),
      examples: missions.filter((m) => m.stage !== "Foundation").slice(0, 3),
      path: `/scenario-catalog/es/${module.id}.json`,
    };
  })
  .filter((m) => m.count)
  .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
const payload = {
  language: "Spanish",
  nativeLanguage: "English",
  count: tasks.length,
  levels: summarize(tasks),
  modules: index,
};
save("src/data/scenario-catalog.generated.json", payload);
console.log(
  `${tasks.length} speaking tasks across ${index.length} practice areas; ${check ? "verified" : "generated"}.`,
);
