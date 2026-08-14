#!/usr/bin/env node
/**
 * Pre-deploy guard — refuses to publish the wrong project to the app domain.
 *
 * On 2026-07-30, app.languagethreshold.com served the MARKETING site for a day.
 * Two consecutive `vercel --prod` runs pushed the marketing build into the
 * language-threshold-app project. Nothing failed and nothing warned: the deploy
 * succeeded, the domain resolved, every response was HTTP 200. The only symptom
 * was that "Start Free" appeared to reload the landing page — because the app
 * domain was handing back the landing page.
 *
 * This is possible because the project is not git-connected: production moves
 * only by manual CLI deploy, so the working directory silently decides what
 * ships. This guard makes that failure loud instead of invisible.
 *
 * Usage:  node scripts/verify-deploy-target.mjs && vercel --prod
 */
import { readFileSync, existsSync } from "node:fs";

// The Vercel project this repository is allowed to deploy to.
const EXPECTED_PROJECT = "language-threshold-app";
const EXPECTED_PROJECT_ID = "prj_at1LY9ncmWfGUecndikWrEUccuqo";
const EXPECTED_ORG_ID = "team_WPMJl6w7aYPU9xP3sr8Xx3uN";

// Fingerprints that identify THIS repository as the app, not the marketing site.
const MARKERS = [
  {
    file: "src/routes/index.tsx",
    contains: "A Premium Language Learning Experience",
    why: "the app's document title",
  },
  {
    file: "src/state/vocab-store.ts",
    contains: "VocabByLanguage",
    why: "per-language vocabulary ownership — app-only",
  },
  {
    file: "src/components/reader/ParallelReader.tsx",
    contains: "data-pane",
    why: "the parallel Reader — the app's signature surface",
  },
];

// If these exist we are almost certainly in the marketing project.
const MARKETING_TELLS = ["src/pages/Home.tsx", "src/components/EarthGlobe.tsx"];

function fail(headline, detail) {
  console.error(`\n✖ DEPLOY BLOCKED — ${headline}\n`);
  if (detail) console.error(`${detail}\n`);
  console.error("If you meant to deploy the marketing site, run it from the");
  console.error("language-threshold project instead.\n");
  process.exit(1);
}

const marketingHit = MARKETING_TELLS.find((f) => existsSync(f));
if (marketingHit) {
  fail(
    "this looks like the MARKETING project",
    `Found ${marketingHit}, which does not exist in the app.\n` +
      "Deploying it to app.languagethreshold.com would replace the app with the\n" +
      "landing page — the exact 2026-07-30 outage.",
  );
}

const missing = [];
for (const m of MARKERS) {
  if (!existsSync(m.file)) {
    missing.push(`${m.file} — missing (${m.why})`);
    continue;
  }
  if (!readFileSync(m.file, "utf8").includes(m.contains)) {
    missing.push(`${m.file} — no "${m.contains}" (${m.why})`);
  }
}

if (missing.length) {
  fail(
    "this is not the Language Threshold app",
    "Expected app fingerprints were absent:\n  " +
      missing.join("\n  ") +
      "\n\nRefusing to guess. If a marker moved, update MARKERS in this script so\n" +
      "the guard keeps protecting you rather than being deleted.",
  );
}

// ── Destination check ────────────────────────────────────────────────────────
// The content checks above prove WHAT ships. They cannot prove WHERE it ships.
//
// On first use this guard passed the content check and then deployed into a
// brand-new Vercel project named after the working directory, because no
// .vercel link existed. Vercel creates a project silently in that case: the
// deploy "succeeds", prints a URL, and the real production domain never moves.
// Right code, wrong destination, no error.
const LINK = ".vercel/project.json";

let target;
if (existsSync(LINK)) {
  try {
    target = JSON.parse(readFileSync(LINK, "utf8"));
  } catch (err) {
    fail(`${LINK} is unreadable or malformed`, String(err));
  }
} else if (process.env.CI === "true") {
  target = {
    projectName: EXPECTED_PROJECT,
    projectId: process.env.VERCEL_PROJECT_ID,
    orgId: process.env.VERCEL_ORG_ID,
  };
} else {
  fail(
    "this directory is not linked to a Vercel project",
    "Without a link, `vercel --prod` can create or select the wrong project.\n\n" +
      `Fix:  vercel link --yes --project ${EXPECTED_PROJECT}`,
  );
}

const mismatches = [
  target.projectName === EXPECTED_PROJECT ? null : `projectName=${String(target.projectName)}`,
  target.projectId === EXPECTED_PROJECT_ID ? null : `projectId=${String(target.projectId)}`,
  target.orgId === EXPECTED_ORG_ID ? null : `orgId=${String(target.orgId)}`,
].filter(Boolean);

if (mismatches.length) {
  fail(
    "linked to the WRONG Vercel destination",
    `Expected ${EXPECTED_PROJECT} / ${EXPECTED_PROJECT_ID} / ${EXPECTED_ORG_ID}.\n` +
      `Found ${mismatches.join(", ")}.`,
  );
}

console.log(
  `✓ deploy target verified — Language Threshold app → ${EXPECTED_PROJECT} (${EXPECTED_PROJECT_ID})`,
);
