import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const [sourceRootInput, sourceCommit] = process.argv.slice(2);
if (!sourceRootInput || !/^[0-9a-f]{40}$/.test(sourceCommit ?? "")) {
  throw new Error("Usage: node scripts/sync-booklet-content.mjs <source-root> <40-char-commit>");
}

const sourceRoot = resolve(sourceRootInput);
const actualCommit = execFileSync("git", ["-C", sourceRoot, "rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const sourceStatus = execFileSync("git", ["-C", sourceRoot, "status", "--porcelain"], {
  encoding: "utf8",
}).trim();
if (actualCommit !== sourceCommit) {
  throw new Error(`Source checkout is ${actualCommit}; expected ${sourceCommit}`);
}
if (sourceStatus) throw new Error("Source checkout must be clean before content sync");

const fixturePath = resolve(sourceRoot, "content/booklets/hello-little-one.en-es.v1.json");
const fixtureRaw = await readFile(fixturePath, "utf8");
const fixture = JSON.parse(fixtureRaw);
const { adaptForLanguageThresholdReader } = await import(
  pathToFileURL(resolve(sourceRoot, "src/adapters.mjs")).href
);
const content = adaptForLanguageThresholdReader(fixture);
const snapshot = {
  generatedAtSourceCommit: sourceCommit,
  sourceRepository: "adobetoby-maker/language-threshold-readers",
  sourceFixture: "content/booklets/hello-little-one.en-es.v1.json",
  sourceFixtureSha256: createHash("sha256").update(fixtureRaw).digest("hex"),
  content,
};

await writeFile(
  resolve("src/data/generated/hello-little-one.booklet.json"),
  `${JSON.stringify(snapshot, null, 2)}\n`,
);
console.log(`Synced ${content.pages.length} booklet pages from ${sourceCommit}.`);
