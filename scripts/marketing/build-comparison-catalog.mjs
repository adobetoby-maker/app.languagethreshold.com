import { build } from "esbuild";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const compiled = await build({
  stdin: {
    contents:
      'export { MODULES, moduleSupportsLearningPair } from "./src/data/modules.ts"; export { getCurriculum } from "./src/data/curriculum.ts";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  logLevel: "silent",
});
const { MODULES, moduleSupportsLearningPair, getCurriculum } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const hd = JSON.parse(readFileSync("src/data/spanish-next-recordings.json", "utf8")).entries;
const native = JSON.parse(readFileSync("src/data/native-v3-recordings.json", "utf8")).entries;
const normalized = (text) =>
  text
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .replace(/[.!?¿¡,;:]+$/, "");
const rows = MODULES.filter(
  (m) =>
    ["Medical", "Trades", "Sports"].includes(m.category) &&
    !/^(foundation|master)-/.test(m.id) &&
    moduleSupportsLearningPair(m, "Spanish", "English"),
)
  .map((m) => {
    const stages = [
      ["Foundation", `foundation-${m.id}`],
      ["Core", m.id],
      ["Master", `master-${m.id}`],
    ]
      .map(([name, id]) => ({
        name,
        id,
        lessons: (getCurriculum(id)?.lessons ?? []).map((l) => ({ n: l.n, title: l.title })),
      }))
      .filter((s) => s.lessons.length);
    const core = getCurriculum(m.id);
    const advanced = getCurriculum(`master-${m.id}`)?.lessons[0];
    const first = core?.lessons[0];
    const contentPath = `public/lesson-content/es/${m.id}.json`;
    const content = existsSync(contentPath) ? JSON.parse(readFileSync(contentPath, "utf8")) : null;
    if (content && (content.language !== "Spanish" || content.nativeLanguage !== "English"))
      throw new Error(`Wrong learning pair: ${m.id}`);
    const firstContent = content?.lessons[String(first?.n)];
    const passage = firstContent?.passage;
    let phrase = null;
    for (let i = 0; i < (passage?.target?.length ?? 0); i++) {
      const target = passage.target[i],
        english = passage.native?.[i];
      const key = normalized(target);
      const hdName = hd[key]?.female,
        nativeName = native[key]?.female;
      const audio = hdName
        ? `/audio/spanish-next/${hdName}.mp3`
        : nativeName
          ? `/audio/native-v3/${nativeName}.mp3`
          : null;
      if (target && english && audio && existsSync(`public${audio}`)) {
        phrase = { target, english, audio };
        break;
      }
    }
    if (!phrase) {
      for (const word of [...(firstContent?.words ?? first?.words ?? [])].sort(
        (a, b) => Number(b.kind === "phrase") - Number(a.kind === "phrase"),
      )) {
        if (!word.es || !word.en) continue;
        const key = normalized(word.es),
          hdName = hd[key]?.female,
          nativeName = native[key]?.female;
        const audio = hdName
          ? `/audio/spanish-next/${hdName}.mp3`
          : nativeName
            ? `/audio/native-v3/${nativeName}.mp3`
            : null;
        if (audio && existsSync(`public${audio}`)) {
          phrase = { target: word.es, english: word.en, audio };
          break;
        }
      }
    }
    if (!phrase && passage?.target?.[0] && passage?.native?.[0]) {
      phrase = { target: passage.target[0], english: passage.native[0], audio: null };
    }
    return {
      id: m.id,
      name: m.name,
      category: m.category,
      role: m.userRole,
      count: stages.reduce((sum, s) => sum + s.lessons.length, 0),
      stages,
      advanced: advanced
        ? {
            title: advanced.title,
            n: advanced.n,
            objective: advanced.objective,
            speaking:
              advanced.steps.find((s) => s.tab === "speak")?.instruction ?? advanced.objective,
          }
        : null,
      sample: first
        ? {
            title: first.title,
            n: first.n,
            objective: first.objective,
            speaking:
              first.steps.find((s) => s.tab === "speak")?.instruction ?? m.challengePrompts[0],
            phrase,
          }
        : null,
    };
  })
  .filter((m) => m.count)
  .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
const output =
  JSON.stringify({ target: "Spanish", native: "English", courses: rows }, null, 2) + "\n";
const path = "src/data/comparison-catalog.generated.json";
if (process.argv.includes("--check")) {
  if (!existsSync(path) || readFileSync(path, "utf8") !== output)
    throw new Error(
      "Comparison catalog is stale. Run node scripts/marketing/build-comparison-catalog.mjs",
    );
} else writeFileSync(path, output);
console.log(
  `${rows.length} role courses, ${rows.reduce((n, m) => n + m.count, 0)} lessons; catalog ${process.argv.includes("--check") ? "verified" : "generated"}.`,
);

const highlights = rows
  .filter((row) => ["nursing", "roofing", "electrician", "soccer"].includes(row.id))
  .map(({ id, name, count, sample }) => ({ id, name, count, sample }));
const highlightOutput = JSON.stringify(highlights, null, 2) + "\n";
const highlightPath = "src/data/comparison-highlights.generated.json";
if (process.argv.includes("--check")) {
  if (!existsSync(highlightPath) || readFileSync(highlightPath, "utf8") !== highlightOutput)
    throw new Error("Comparison highlights are stale");
} else writeFileSync(highlightPath, highlightOutput);
