import { execFileSync, spawnSync } from "node:child_process";

const LINTABLE = /\.(?:[cm]?js|jsx|tsx?)$/;

function gitLines(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const candidates = new Set([
  ...gitLines(["diff", "--name-only", "--diff-filter=ACMR", "HEAD"]),
  ...gitLines(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "HEAD"]),
  ...gitLines(["ls-files", "--others", "--exclude-standard"]),
]);

const mergeBase = gitLines(["merge-base", "HEAD", "origin/main"])[0];
if (mergeBase) {
  for (const file of gitLines(["diff", "--name-only", "--diff-filter=ACMR", `${mergeBase}...HEAD`])) {
    candidates.add(file);
  }
}

const files = [...candidates].filter((file) => LINTABLE.test(file)).sort();

if (files.length === 0) {
  console.log("No changed JavaScript or TypeScript files to lint.");
  process.exit(0);
}

console.log(`Linting ${files.length} changed JavaScript/TypeScript files.`);
const result = spawnSync(
  process.platform === "win32" ? "node_modules/.bin/eslint.cmd" : "node_modules/.bin/eslint",
  ["--cache", "--cache-location", "node_modules/.cache/eslint", ...files],
  { encoding: "utf8", stdio: "inherit" },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
