#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { verifyLessonPackRoutes } from "./verify-lesson-pack-routes.mjs";

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

if (output.version !== 3 || !Array.isArray(output.routes)) {
  throw new Error("Vercel Build Output API config is not version 3.");
}
const packDirectory = ".vercel/output/static/lesson-packs";
const manifests = readdirSync(packDirectory)
  .filter(name => /^[a-z0-9-]+\.json$/.test(name) && !/-[a-f0-9]{64}\.json$/.test(name))
  .map(name => JSON.parse(readFileSync(`${packDirectory}/${name}`, "utf8")));
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

console.log(
  `✓ Vercel artifact verified — Build Output API v3, Node 22, server bundle ${(bundleBytes / 1024 / 1024).toFixed(2)} MiB`,
);
