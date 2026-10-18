/** Public-material component fixture; fictional actor/API, loopback only, no credentials or hosted writes. */
import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const root = process.cwd(),
  source = join(root, "tests/fixtures/lesson-review-ui"),
  out = join(root, "node_modules/.cache/lesson-review-ui");
mkdirSync(out, { recursive: true });
await build({
  entryPoints: [join(source, "main.tsx")],
  outfile: join(out, "bundle.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  plugins: [
    {
      name: "fictional-local-only",
      setup(b) {
        b.onResolve({ filter: /^@\/state\/auth-state$/ }, () => ({
          path: join(source, "auth.ts"),
        }));
        b.onResolve({ filter: /^@\/lib\/assessments\/client$/ }, () => ({
          path: join(source, "client.ts"),
        }));
      },
    },
  ],
});
const assets = join(root, ".vercel/output/static/assets");
const cssFile = readdirSync(assets).find((name) => /^styles-.*\.css$/.test(name));
if (!cssFile) throw new Error("Build the staged app before running this fixture.");
writeFileSync(join(out, "style.css"), readFileSync(join(assets, cssFile)));
writeFileSync(
  join(out, "index.html"),
  '<!doctype html><html class="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Local lesson-freeze UI fixture</title><link rel="stylesheet" href="/style.css"></head><body class="bg-background text-foreground"><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>',
);
if (process.argv.includes("--build-only")) process.exit(0);
createServer((request, response) => {
  const file = { "/": "index.html", "/bundle.js": "bundle.js", "/style.css": "style.css" }[
    request.url
  ];
  if (!file) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(200, {
    "Content-Type": file.endsWith(".js")
      ? "text/javascript"
      : file.endsWith(".css")
        ? "text/css"
        : "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(readFileSync(join(out, file)));
}).listen(4782, "127.0.0.1", () =>
  console.log(
    "Local lesson-freeze fixture ready on 127.0.0.1:4782; fictional permissions/API only.",
  ),
);
