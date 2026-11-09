// Read-only source coverage audit. Writes lesson counts only; no private bank contents.
import { createRequire } from "node:module";
import { resolve } from "node:path";
const { build } = createRequire(resolve("package.json"))("esbuild");
import { readFile, writeFile } from "node:fs/promises";
const repo = process.cwd();
const compiled = await build({
  stdin: {
    contents:
      'export { loadModulePlacement } from "./src/lib/module-placement-loader.ts"; export { MODULES,moduleSupportsLearningPair } from "./src/data/modules.ts"; export { core60PathOfPair } from "./src/lib/core60-path.ts";',
    resolveDir: repo,
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  tsconfig: repo + "/tsconfig.json",
  logLevel: "silent",
  external: ["#tanstack-router-entry", "#tanstack-start-entry", "tanstack-start-manifest:v"],
});
globalThis.fetch = async function (input) {
  try {
    const url = new URL(String(input), "http://localhost");
    const data = await readFile(repo + "/public" + url.pathname);
    return new Response(data, { status: 200 });
  } catch {
    return new Response("", { status: 404 });
  }
};
const { loadModulePlacement, MODULES, moduleSupportsLearningPair, core60PathOfPair } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].contents).toString("base64")
);
const modules = MODULES.filter(
  (m) =>
    moduleSupportsLearningPair(m, "Spanish", "English") &&
    (core60PathOfPair(m.id, "Spanish", "English")?.tradeModuleId ?? m.id) === m.id,
);
const results = [];
for (const m of modules) {
  const row = { id: m.id };
  for (const mode of ["placement", "post-core"]) {
    try {
      const d = await loadModulePlacement(m.id, "Spanish", "English", "coverage", mode);
      row[mode] = {
        lessons: d.totalLessons,
        covered: d.blocks.reduce((s, b) => s + b.lessons.length, 0),
        gap: d.gap?.moduleId ?? null,
      };
    } catch (e) {
      row[mode] = { error: e.message };
    }
  }
  results.push(row);
}
await writeFile(
  repo + "/docs/spanish-exam-coverage.json",
  JSON.stringify(
    {
      revision: process.env.EXAM_SOURCE_REVISION ?? "working-tree",
      pair: { target: "Spanish", native: "English" },
      kind: "lesson-derived self-assessment; no formal-bank approval",
      modules: results,
    },
    null,
    2,
  ) + "\n",
);
const gaps = results.filter(
  (r) => r.placement.gap || !r.placement.covered || r["post-core"].covered !== 30,
);
console.log(`${results.length} Spanish/English modules checked; ${gaps.length} gaps.`);
if (gaps.length) {
  console.log(JSON.stringify(gaps));
  process.exitCode = 1;
}
