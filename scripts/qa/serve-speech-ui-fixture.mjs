/** Explicit local-only component fixture: synthetic silence, simulated microphone/API, no credentials. */
import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
const root = process.cwd(),
  source = join(root, "tests/fixtures/assessment-speech-ui"),
  out = join(root, "node_modules/.cache/assessment-speech-ui");
mkdirSync(out, { recursive: true });
execFileSync("/opt/homebrew/bin/ffmpeg", [
  "-hide_banner",
  "-loglevel",
  "error",
  "-y",
  "-f",
  "lavfi",
  "-i",
  "anullsrc=channel_layout=mono:sample_rate=48000",
  "-t",
  "1",
  "-c:a",
  "libopus",
  join(out, "silence.webm"),
]);
await build({
  entryPoints: [join(source, "main.tsx")],
  outfile: join(out, "bundle.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  jsx: "automatic",
  plugins: [
    {
      name: "local-synthetic-only",
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
writeFileSync(
  join(out, "index.html"),
  '<!doctype html><html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Local synthetic speaking QA</title><style>body{font:16px system-ui;margin:0;background:#071421;color:#f6f2e8}main{max-width:680px;margin:auto;padding:20px}button,input{font:inherit}button{padding:12px;margin:5px;border:1px solid #d8b65c;border-radius:10px;background:#122535;color:#f6f2e8}button:disabled{opacity:.4}p,label{line-height:1.5}label{display:flex;gap:10px;margin:15px 0}.notice{border:1px solid #d8b65c;padding:12px}audio{max-width:100%}</style><div id="root"></div><script type="module" src="/bundle.js"></script></html>',
);
if (process.argv.includes("--build-only")) process.exit(0);
createServer((req, res) => {
  const path = req.url?.split("?")[0];
  const file = { "/": "index.html", "/bundle.js": "bundle.js", "/silence.webm": "silence.webm" }[
    path
  ];
  if (!file) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader(
    "Content-Type",
    file.endsWith(".js") ? "text/javascript" : file.endsWith(".webm") ? "audio/webm" : "text/html",
  );
  res.setHeader("Cache-Control", "no-store");
  res.end(readFileSync(resolve(out, file)));
}).listen(4322, "127.0.0.1", () =>
  console.log(
    "Local synthetic speech fixture: http://127.0.0.1:4322 (no hosted writes or real microphone).",
  ),
);
