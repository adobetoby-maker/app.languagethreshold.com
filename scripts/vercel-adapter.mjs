// Post-build script: produces a Vercel Build Output API v3 artifact.
// Vercel detects .vercel/output/ and deploys it directly — no framework detection needed.
import { mkdirSync, writeFileSync, cpSync, rmSync } from "fs";
import { execFileSync } from "child_process";

const out = ".vercel/output";
rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/static`, { recursive: true });
mkdirSync(`${out}/functions/index.func`, { recursive: true });

// Static client assets → served from Vercel's CDN
cpSync("dist/client", `${out}/static`, { recursive: true });

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

// CJS entry: loaded by Vercel's Nodejs launcher, dynamically imports the
// bundled server and adapts Node.js req/res → Web Fetch API.
writeFileSync(
  `${out}/functions/index.func/entry.cjs`,
  `
let _server = null
async function getServer() {
  if (!_server) _server = require('./server.cjs').default
  return _server
}

module.exports = async function handler(req, res) {
  const server = await getServer()

  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost'
  const url = proto + '://' + host + req.url

  const body = await new Promise((resolve) => {
    const chunks = []
    req.on('data', c => chunks.push(Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', () => resolve(Buffer.alloc(0)))
  })

  const webRequest = new Request(url, {
    method: req.method,
    headers: Object.fromEntries(
      Object.entries(req.headers)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : String(v)])
    ),
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : (body.length > 0 ? body : undefined),
  })

  const webResponse = await server.fetch(webRequest)

  res.statusCode = webResponse.status
  for (const [k, v] of webResponse.headers.entries()) {
    res.setHeader(k, v)
  }

  if (!webResponse.body) {
    res.end()
    return
  }

  const reader = webResponse.body.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!res.write(Buffer.from(value))) {
        await new Promise(resolve => res.once('drain', resolve))
      }
    }
  } finally {
    reader.releaseLock()
  }
  res.end()
}
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
    routes: [
      {
        src: "/assets/(.+)",
        headers: { "cache-control": "public, max-age=31536000, immutable" },
        dest: "/assets/$1",
      },
      { src: "/favicon\\.svg", dest: "/favicon.svg" },
      { src: "/manifest\\.webmanifest", dest: "/manifest.webmanifest" },
      { src: "/sw\\.js", dest: "/sw.js" },
      { src: "/icons/(.*)", dest: "/icons/$1" },
      { src: "/images/(.*)", dest: "/images/$1" },
      { src: "/qa-status\\.json", dest: "/qa-status.json" },
      { src: "/qa-badge\\.svg", dest: "/qa-badge.svg" },
      { src: "/(.*)", dest: "/" },
    ],
  }),
);

console.log("✓ Vercel Build Output API v3 artifact created in .vercel/output/");
