import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "src");
const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const prohibitedDiagnostics = [
  new RegExp(["filter", "check"].join("\\s+"), "i"),
  new RegExp(["filter", "inactive"].join("\\s+"), "i"),
];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(entryPath);
      return sourceExtensions.has(path.extname(entry.name)) ? [entryPath] : [];
    }),
  );
  return nestedFiles.flat();
}

test("learner source does not contain internal module-filter diagnostics", async () => {
  const violations = [];

  for (const file of await sourceFiles(sourceRoot)) {
    const source = await readFile(file, "utf8");
    for (const pattern of prohibitedDiagnostics) {
      if (pattern.test(source)) {
        violations.push(`${path.relative(repoRoot, file)} matches ${pattern}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});
