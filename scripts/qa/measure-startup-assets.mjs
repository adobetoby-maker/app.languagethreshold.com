// Run once per built worktree: node scripts/qa/measure-startup-assets.mjs
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const require = createRequire(import.meta.url);
const server = require(`${process.cwd()}/.vercel/output/functions/index.func/server.cjs`).default;
const response = await server.fetch(new Request("https://app.languagethreshold.com/"));
if (response.status !== 200) throw new Error(`Homepage returned ${response.status}`);
const html = await response.text();
const assets = [
  ...new Set(
    [...html.matchAll(/(?:src|href)="(\/assets\/[A-Za-z0-9_.-]+\.js)"/g)].map((match) => match[1]),
  ),
];
if (!assets.length) throw new Error("No startup scripts/modulepreloads found");
const sizes = await Promise.all(
  assets.map(async (url) => {
    const data = await readFile(`dist/client${url}`);
    return { url, bytes: data.length, gzipBytes: gzipSync(data, { level: 9 }).length };
  }),
);
console.log(
  JSON.stringify(
    {
      status: response.status,
      visiblePublicHeading: html.includes("Practice the conversations your work actually needs."),
      scriptCount: sizes.length,
      bytes: sizes.reduce((sum, a) => sum + a.bytes, 0),
      gzipBytes: sizes.reduce((sum, a) => sum + a.gzipBytes, 0),
      assets: sizes,
      scope:
        "SSR script/modulepreload inventory only. Excludes subsequent dynamic imports, fonts/CSS and API requests; not field load time.",
    },
    null,
    2,
  ),
);
