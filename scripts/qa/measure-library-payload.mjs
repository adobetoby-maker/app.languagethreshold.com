// Usage: node scripts/qa/measure-library-payload.mjs <baseline-assets> <candidate-assets> [language] [module]
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
const [before, after, language = "Spanish", moduleId = "nursing"] = process.argv.slice(2);
if (!before || !after)
  throw new Error("Provide baseline and candidate dist/client/assets directories");
async function asset(directory, prefix) {
  const files = (await readdir(directory)).filter(
    (name) => name.startsWith(prefix + "-") && name.endsWith(".js"),
  );
  if (files.length !== 1)
    throw new Error(`Expected one ${prefix} asset in ${directory}, got ${files.length}`);
  const data = await readFile(join(directory, files[0]));
  return { file: files[0], bytes: data.length, gzipBytes: gzipSync(data, { level: 9 }).length };
}
const mapping = JSON.parse(await readFile("src/data/library-pack-manifest.json", "utf8"));
const hashes = [
  ...new Set([
    ...(mapping[`${language}/core`] ?? []),
    ...(mapping[`${language}/${moduleId}`] ?? []),
  ]),
];
const baseline = await asset(before, "all-seeds");
const candidate = await Promise.all(hashes.map((hash) => asset(after, hash)));
const candidateGzipBytes = candidate.reduce((sum, item) => sum + item.gzipBytes, 0);
console.log(
  JSON.stringify(
    {
      language,
      moduleId,
      baseline,
      candidate,
      candidateGzipBytes,
      gzipReductionPercent: +((1 - candidateGzipBytes / baseline.gzipBytes) * 100).toFixed(1),
      scope:
        "Authored core + selected-module data chunks only. Excludes shell/loader registry, optional scripture and tool bundles. Gzip level 9; not a page latency measurement.",
    },
    null,
    2,
  ),
);
