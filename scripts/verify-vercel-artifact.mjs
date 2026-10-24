#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyLessonPackRoutes } from "./verify-lesson-pack-routes.mjs";
import { verifyLessonReviewContent } from "./verify-lesson-review-content.mjs";

/**
 * Exams v2 bundle privacy check (ticket T11). Private exam-bank keys must never reach client
 * static output: a quoted JSON key (`"correctOptionId":`, `"distractorRationale":`, `"accepted":`,
 * also inside escaped JSON strings) or an object-literal key (`{correctOptionId:` / `,distractorRationale:`)
 * means bank data was bundled for the browser. Server bundles are not scanned. Returns
 * `{ file, key }` entries only; matched text is never printed.
 */
const QUOTED_BANK_KEY = /\\*["'](correctOptionId|distractorRationale|accepted)\\*["']\s*:/;
const LITERAL_BANK_KEY = /[{,]\s*(correctOptionId|distractorRationale)\s*:/;
const SCANNED = /\.(?:m?js|cjs|html|json|txt)$/i;
export function findExamBankKeyLeaks(staticDir) {
  const leaks = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && SCANNED.test(entry.name)) {
        const text = readFileSync(full, "utf8");
        const match = text.match(QUOTED_BANK_KEY) ?? text.match(LITERAL_BANK_KEY);
        if (match) leaks.push({ file: path.relative(staticDir, full), key: match[1] });
      }
    }
  };
  if (existsSync(staticDir)) walk(staticDir);
  return leaks;
}

// Run the checks whenever this file is the script being executed, however it was invoked
// (relative path, symlink, npm script). Importing it (tests) only exposes the scanner.
function invokedAsScript() {
  if (!process.argv[1]) return false;
  try {
    return (
      realpathSync(path.resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}
if (invokedAsScript()) verifyArtifact();

function verifyArtifact() {
  const outputConfig = ".vercel/output/config.json";
  const functionConfig = ".vercel/output/functions/index.func/.vc-config.json";
  const serverBundle = ".vercel/output/functions/index.func/server.cjs";

  for (const file of [outputConfig, functionConfig, serverBundle]) {
    if (!existsSync(file)) {
      console.error(`✖ Vercel artifact verification failed — missing ${file}`);
      process.exit(1);
    }
  }

  const output = JSON.parse(readFileSync(outputConfig, "utf8"));
  const runtime = JSON.parse(readFileSync(functionConfig, "utf8"));
  const bundleText = readFileSync(serverBundle, "utf8");
  const bundleBytes = statSync(serverBundle).size;
  verifyLessonReviewContent(
    "public/lesson-content",
    ".vercel/output/functions/index.func/lesson-content",
    ".vercel/output/static/lesson-content",
  );
  if (
    !readFileSync(".vercel/output/functions/index.func/entry.cjs", "utf8").includes(
      "process.env.LT_INTERNAL_LESSON_CONTENT_ROOT = require('node:path').join(__dirname, 'lesson-content')",
    )
  )
    throw new Error(
      "Lesson review runtime source root is not initialized by the deployment entry.",
    );

  if (output.version !== 3 || !Array.isArray(output.routes)) {
    throw new Error("Vercel Build Output API config is not version 3.");
  }
  const packDirectory = ".vercel/output/static/lesson-packs";
  const manifests = readdirSync(packDirectory)
    .filter((name) => /^[a-z0-9-]+\.json$/.test(name) && !/-[a-f0-9]{64}\.json$/.test(name))
    .map((name) => JSON.parse(readFileSync(`${packDirectory}/${name}`, "utf8")));
  verifyLessonPackRoutes(output.routes, manifests);
  if (runtime.runtime !== "nodejs22.x" || runtime.handler !== "entry.cjs") {
    throw new Error("Vercel function runtime or handler is not the approved Node 22 entry.");
  }
  if (
    output.crons &&
    (output.crons.length !== 1 ||
      output.crons[0].path !== "/api/exam-cleanup" ||
      output.crons[0].schedule !== "15 0 * * *")
  )
    throw new Error("Unrecognized scheduled task in deployment artifact.");
  if (bundleText.includes("cloudflare:workers")) {
    throw new Error("Vercel server bundle still imports a Cloudflare-only runtime module.");
  }
  if (bundleBytes > 200 * 1024 * 1024) {
    throw new Error("Vercel server bundle exceeds the 200 MiB project safety ceiling.");
  }

  const examLeaks = findExamBankKeyLeaks(".vercel/output/static");
  if (examLeaks.length) {
    for (const leak of examLeaks)
      console.error(`✖ Private exam-bank key "${leak.key}" found in client file ${leak.file}`);
    throw new Error("Client static output contains private exam-bank keys.");
  }

  console.log(
    `✓ Vercel artifact verified — Build Output API v3, Node 22, server bundle ${(bundleBytes / 1024 / 1024).toFixed(2)} MiB`,
  );
}
