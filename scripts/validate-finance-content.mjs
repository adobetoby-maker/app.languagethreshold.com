import { build } from "esbuild";
import { readFileSync, existsSync } from "node:fs";
const compiled = await build({
  entryPoints: ["src/lib/lesson-content-core.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const { validateLessonContent, contentLimitsFor } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const failures = [];
let total = 0;
for (const base of ["accounting", "personal-money", "travel-money"])
  for (const [pair, target, native] of [
    ["es-en", "Spanish", "English"],
    ["en-es", "English", "Spanish"],
  ]) {
    const path = `content/finance/${base}/${pair}.json`;
    if (!existsSync(path)) {
      failures.push(`${path}: missing`);
      continue;
    }
    const rows = JSON.parse(readFileSync(path, "utf8"));
    for (const [stage, count] of [
      ["foundation", 10],
      ["core", 30],
      ["master", 20],
    ]) {
      const lessons = rows.filter((r) => r.stage === stage);
      if (
        JSON.stringify(lessons.map((r) => r.lesson.n)) !==
        JSON.stringify(Array.from({ length: count }, (_, i) => i + 1))
      )
        failures.push(`${path}/${stage}: requires ordered 1–${count}`);
    }
    const readings = new Set();
    for (const row of rows) {
      const key = `${path}/${row.stage}/${row.lesson.n}`;
      const content = { ...row.content, words: row.lesson.words };
      const errors = validateLessonContent(content, {
        language: target,
        nativeLanguage: native,
        parts: { passage: true, words: true, verbs: true },
        limits: contentLimitsFor(row.stage === "master" ? "master-" + base : base),
      });
      failures.push(...errors.map((e) => `${key}: ${e}`));
      if (!row.lesson.openingLine || !row.lesson.partnerRole || !row.lesson.speaking)
        failures.push(`${key}: speaking context missing`);
      const text = content.passage.target.join(" ");
      if (readings.has(text)) failures.push(`${key}: duplicated reading`);
      readings.add(text);
      total++;
    }
  }
console.log(JSON.stringify({ validatedLessons: total, failures }, null, 2));
if (failures.length) process.exitCode = 1;
