// Built by TAC — 2026-10-19
// Local pre-push smoke gate: runs the key Playwright specs against a fresh dev server.
//   npm run smoke:e2e            desktop suite on a free local port
//   npm run smoke:e2e -- --phone also run the iphone-pwa project
//   npm run smoke:e2e -- --prod  core60-path + foundation against https://app.languagethreshold.com (skips @dev-only)
// Exit code reflects test results only (see parseSummary), not Playwright's teardown noise.
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const PROD_URL = "https://app.languagethreshold.com";
const START_PORT = 3450;
const MAX_PORT_TRIES = 200;
// Playwright can sit in worker teardown for up to 300s after the summary prints.
const POST_SUMMARY_GRACE_MS = 45_000;

const args = new Set(process.argv.slice(2));
const phone = args.has("--phone");
const prod = args.has("--prod");

const LOCAL_SPECS = [
  "e2e/foundation.spec.ts",
  "e2e/core60-path.spec.ts",
  "e2e/core30.spec.ts",
  "e2e/core30-plan.spec.ts",
  "e2e/lesson-content.spec.ts",
  "e2e/verb-games.spec.ts",
  "e2e/voice-switch.spec.ts",
];
const PROD_SPECS = ["e2e/core60-path.spec.ts", "e2e/foundation.spec.ts"];

// A port is free only if nothing listens on any loopback/wildcard address and nothing accepts a connection.
// (Binding 0.0.0.0 alone can succeed on macOS while another process holds 127.0.0.1 or ::1.)
function canListen(port, host) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", (err) => resolve(err.code !== "EADDRINUSE" && err.code !== "EACCES"));
    srv.listen({ port, host, exclusive: true }, () => srv.close(() => resolve(true)));
  });
}
function accepts(port, host) {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host });
    const done = (result) => {
      sock.destroy();
      resolve(result);
    };
    sock.setTimeout(500, () => done(false));
    sock.once("connect", () => done(true));
    sock.once("error", () => done(false));
  });
}
async function portIsFree(port) {
  for (const host of ["127.0.0.1", "::1", "0.0.0.0", "::"]) {
    if (!(await canListen(port, host))) return false;
  }
  for (const host of ["127.0.0.1", "::1"]) {
    if (await accepts(port, host)) return false;
  }
  return true;
}
async function findFreePort() {
  for (let port = START_PORT; port < START_PORT + MAX_PORT_TRIES; port++) {
    if (await portIsFree(port)) return port;
  }
  throw new Error(`No free port in ${START_PORT}-${START_PORT + MAX_PORT_TRIES - 1}`);
}

const ANSI = /\u001B\[[0-9;?]*[ -/]*[@-~]/g;
const strip = (s) => s.replace(ANSI, "");

// Reads the line-reporter summary. Playwright prints, at the end:
//   1) [desktop] › e2e/x.spec.ts:12:5 › title      (one block per failure)
//   2 skipped / 1 failed / 38 passed (4.2m)
function parseSummary(text) {
  const lines = strip(text).split(/\r?\n/);
  const count = (label) => {
    let total = 0;
    for (const line of lines) {
      const m = line.match(new RegExp(`^\\s*(\\d+) ${label}\\b`));
      if (m) total = Number(m[1]);
    }
    return total;
  };
  const failedTitles = [];
  for (const line of lines) {
    const m = line.match(/^\s*\d+\) (\[[^\]]+\] › .+?)\s*(?:\(\d.*\))?\s*$/);
    if (m && !failedTitles.includes(m[1])) failedTitles.push(m[1]);
  }
  return {
    passed: count("passed"),
    failed: count("failed"),
    skipped: count("skipped"),
    flaky: count("flaky"),
    interrupted: count("interrupted"),
    didNotRun: count("did not run"),
    failedTitles,
  };
}

const port = prod ? null : await findFreePort();
const projects = ["--project=setup", "--project=desktop", ...(phone ? ["--project=iphone-pwa"] : [])];
const specs = prod ? PROD_SPECS : LOCAL_SPECS;
// Specs tagged @dev-only need a dev build (the fixture hook, unhashed chunk URLs): skipped on prod.
const playwrightArgs = ["playwright", "test", ...specs, ...projects, ...(prod ? ["--grep-invert", "@dev-only"] : []), "--reporter=line"];
// Both go through the helper that injects the public Supabase env: the specs' setup and
// signed-in fixtures read it even when the app under test is the deployed build.
const [cmd, cmdArgs] = ["node", ["scripts/with-supabase-public-env.mjs", "npx", ...playwrightArgs]];

const env = { ...process.env };
if (prod) {
  env.E2E_BASE_URL = PROD_URL;
  delete env.E2E_PORT;
} else {
  env.E2E_PORT = String(port);
  delete env.E2E_BASE_URL;
}

const logPath = path.join(os.tmpdir(), `smoke-e2e-${new Date().toISOString().replace(/[:.]/g, "-")}.log`);
const logStream = createWriteStream(logPath);
const target = prod ? PROD_URL : `port ${port}`;
console.log(`smoke:e2e target=${target} projects=${projects.map((p) => p.slice(10)).join(",")}`);
console.log(`log: ${logPath}`);

const started = Date.now();
let captured = "";
let graceTimer = null;
let summarySeen = false;

const child = spawn(cmd, cmdArgs, { env, stdio: ["ignore", "pipe", "pipe"], detached: true });

// Kill only the process group this script started (playwright, vite dev server, workers).
function killGroup(signal) {
  try {
    process.kill(-child.pid, signal);
  } catch {
    /* already gone */
  }
}

function onData(stream) {
  return (chunk) => {
    const text = chunk.toString();
    stream.write(text);
    logStream.write(text);
    captured += text;
    if (!summarySeen && /^\s*\d+ passed \(/m.test(strip(captured))) {
      summarySeen = true;
      graceTimer = setTimeout(() => {
        console.log(`\n(smoke:e2e: summary printed but Playwright teardown hung for ${POST_SUMMARY_GRACE_MS / 1000}s, stopping it)`);
        killGroup("SIGTERM");
        setTimeout(() => killGroup("SIGKILL"), 5_000).unref();
      }, POST_SUMMARY_GRACE_MS);
      graceTimer.unref();
    }
  };
}
child.stdout.on("data", onData(process.stdout));
child.stderr.on("data", onData(process.stderr));

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    killGroup("SIGTERM");
    setTimeout(() => process.exit(130), 1_000).unref();
  });
}

const exitCode = await new Promise((resolve) => {
  child.on("error", () => resolve(null));
  child.on("exit", (code) => resolve(code));
});
if (graceTimer) clearTimeout(graceTimer);
// Playwright's web server / workers can outlive the parent after a force-kill; sweep our own group.
killGroup("SIGTERM");

const summary = parseSummary(captured);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
const ok = summary.failed === 0 && summary.interrupted === 0 && summary.passed > 0;

console.log("");
if (!ok && summary.failedTitles.length > 0) {
  console.log("Failing tests:");
  for (const title of summary.failedTitles) console.log(`  - ${title}`);
}
if (ok && exitCode !== 0) {
  console.log(`note: playwright exited ${exitCode} after all tests passed (teardown noise); treating as pass.`);
}
if (!ok && summary.passed === 0 && summary.failed === 0) {
  console.log("No test summary found in Playwright output; treating as failure.");
}
console.log(
  `SMOKE ${ok ? "PASS" : "FAIL"}: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped` +
    `${summary.flaky ? `, ${summary.flaky} flaky` : ""} | ${target} | ${seconds}s | log ${logPath}`,
);
logStream.end();
process.exit(ok ? 0 : 1);
