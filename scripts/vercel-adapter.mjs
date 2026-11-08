// Post-build script: produces a Vercel Build Output API v3 artifact.
// Vercel detects .vercel/output/ and deploys it directly — no framework detection needed.
import { assessmentCleanupSchedule } from "./assessment-cleanup-schedule.mjs";
import { mkdirSync, writeFileSync, cpSync, rmSync } from "fs";
import { execFileSync } from "child_process";
import { buildOfflineLessonPack } from "./build-offline-lesson-pack.mjs";

const out = ".vercel/output";
rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/static`, { recursive: true });
mkdirSync(`${out}/functions/index.func`, { recursive: true });
// Review fingerprints use exactly the public generated material packaged with this deployment.
cpSync("public/lesson-content", `${out}/functions/index.func/lesson-content`, { recursive: true });

// Static client assets → served from Vercel's CDN
cpSync("dist/client", `${out}/static`, { recursive: true });
await buildOfflineLessonPack(`${out}/static`);
await buildOfflineLessonPack(`${out}/static`, "landscaper-es-en");
await buildOfflineLessonPack(`${out}/static`, "construction-foreman-es-en");
for (const pack of ["foundation-military-en-es", "military-en-es", "master-military-en-es", "foundation-sound-like-a-native-es-en", "sound-like-a-native-es-en", "master-sound-like-a-native-es-en"])
  await buildOfflineLessonPack(`${out}/static`, pack);
for (const pack of ["foundation-japanese-basics-ja-en", "japanese-basics-ja-en", "master-japanese-basics-ja-en"])
  await buildOfflineLessonPack(`${out}/static`, pack);

// Bundle server.js + all npm dependencies (h3-v2, @tanstack/*, seroval, etc.)
// into a single CJS file. Vercel function has no node_modules at runtime so
// everything must be self-contained. Dynamic route imports are inlined.
console.log("Bundling server with esbuild...");
execFileSync(
  "npx",
  [
    "esbuild",
    "dist/server/server.js",
    "--bundle",
    "--platform=node",
    "--format=cjs",
    `--outfile=${out}/functions/index.func/server.cjs`,
    "--external:node:*",
    "--log-level=warning",
  ],
  { stdio: "inherit" },
);

// Keep the Node bridge testable; measure bootstrap separately from render time.
cpSync("scripts/vercel-node-handler.cjs", `${out}/functions/index.func/node-handler.cjs`);
writeFileSync(
  `${out}/functions/index.func/entry.cjs`,
  `
let server
process.env.LT_INTERNAL_LESSON_CONTENT_ROOT = require('node:path').join(__dirname, 'lesson-content')
const { createNodeHandler } = require('./node-handler.cjs')
module.exports = createNodeHandler(async () => {
  if (!server) server = require('./server.cjs').default
  return server
})
`,
);

// .vc-config.json: tells Vercel runtime how to invoke the function
writeFileSync(
  `${out}/functions/index.func/.vc-config.json`,
  JSON.stringify({
    runtime: "nodejs22.x",
    handler: "entry.cjs",
    launcherType: "Nodejs",
    shouldAddHelpers: true,
  }),
);

// Output config: static asset rules + catch-all to the SSR function
writeFileSync(
  `${out}/config.json`,
  JSON.stringify({
    version: 3,
    ...assessmentCleanupSchedule(process.env),
    routes: [
      {
        src: "/([a-z0-9])",
        status: 302,
        headers: { location: "/?utm_source=heycatch&utm_campaign=$1" },
      },
      {
        src: "/assets/(.+)",
        headers: { "cache-control": "public, max-age=31536000, immutable" },
        dest: "/assets/$1",
      },
      { src: "/favicon\\.svg", dest: "/favicon.svg" },
      { src: "/manifest\\.webmanifest", dest: "/manifest.webmanifest" },
      { src: "/sw\\.js", dest: "/sw.js" },
      {
        src: "/offline-lessons-worker\\.js",
        headers: { "cache-control": "no-store" },
        dest: "/offline-lessons-worker.js",
      },
      { src: "/icons/(.*)", dest: "/icons/$1" },
      { src: "/images/(.*)", dest: "/images/$1" },
      {
        src: "/audio/(.*)",
        headers: { "cache-control": "public, max-age=31536000, immutable" },
        dest: "/audio/$1",
      },
      {
        src: "/lesson-packs/((?:(?:roofing|landscaper|construction-foreman|(?:foundation-|master-)?sound-like-a-native)-es-en|(?:foundation-military|military|master-military)-en-es|(?:foundation-|master-)?japanese-basics-ja-en)\\.json)",
        headers: { "cache-control": "no-store" },
        dest: "/lesson-packs/$1",
      },
      {
        src: "/lesson-packs/((?:(?:roofing|landscaper|construction-foreman|(?:foundation-|master-)?sound-like-a-native)-es-en|(?:foundation-military|military|master-military)-en-es|(?:foundation-|master-)?japanese-basics-ja-en)-[a-f0-9]{64}\\.json)",
        headers: { "cache-control": "public, max-age=31536000, immutable" },
        dest: "/lesson-packs/$1",
      },
      // Saved Core 30 lesson word decks (static JSON; the service worker also caches them).
      {
        src: "/lesson-decks/(.*)",
        headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" },
        dest: "/lesson-decks/$1",
      },
      // Authored Core 30 lesson content: passages, words and verbs (static JSON, cached offline).
      {
        src: "/lesson-content/(.*)",
        headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" },
        dest: "/lesson-content/$1",
      },
      // Public scenario lists load independently of the page bundle.
      {
        src: "/scenario-catalog/(.*)",
        headers: { "cache-control": "public, max-age=0, must-revalidate" },
        dest: "/scenario-catalog/$1",
      },
      // Trade packs: module-flavored static game content (Word Match boards first), cached offline.
      {
        src: "/trade-packs/(.*)",
        headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" },
        dest: "/trade-packs/$1",
      },
      { src: "/qa-status\\.json", dest: "/qa-status.json" },
      { src: "/qa-badge\\.svg", dest: "/qa-badge.svg" },
      { src: "/review-demo\\.html", dest: "/review-demo.html", headers: { "x-robots-tag": "noindex, nofollow" } },
      { src: "/team-admin-demo\\.html", dest: "/team-admin-demo.html" },
      { src: "/roofing-review-data\\.js", dest: "/roofing-review-data.js" },
      { src: "/robots\\.txt", dest: "/robots.txt" },
      {
        src: "/21c653b50cda6af04ed977771f54e96b\\.txt",
        dest: "/21c653b50cda6af04ed977771f54e96b.txt",
      },
      { src: "/(.*)", dest: "/" },
    ],
  }),
);

console.log("✓ Vercel Build Output API v3 artifact created in .vercel/output/");
