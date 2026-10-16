/** Dedicated existing QA accounts only; synthetic Reader rows are removed in finally. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createLibraryDevice } from "../../src/lib/library-device.ts";
import { createLibraryRemote } from "../../src/lib/library-remote.ts";
const qa = JSON.parse(
  readFileSync("/Users/drive/.codex/tmp/language-threshold-qa/roofing-20261015.json", "utf8"),
);
assert.equal(qa.project, "pollhlkgltdkdskdzsgd");
assert.equal(qa.run, "roofing-20261015");
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", qa.project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const key = keys.find((k) => k.name === "anon")?.api_key;
assert.ok(key, "Public test client key available");
const clients = [];
async function login(email, password, expected) {
  const c = createClient(`https://${qa.project}.supabase.co`, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  clients.push(c);
  const r = await c.auth.signInWithPassword({ email, password });
  assert.equal(r.error, null, "Existing QA login succeeds");
  assert.equal(r.data.user?.id, expected, "Dedicated QA identity matches");
  return c;
}
const [a, b] = await Promise.all([
  login(qa.personalEmail, qa.personalPassword, qa.personalId),
  login(qa.email, qa.password, qa.learnerId),
]);
const remoteA = createLibraryRemote(a, qa.personalId, (id) => id === qa.personalId),
  remoteB = createLibraryRemote(b, qa.learnerId, (id) => id === qa.learnerId);
const signal = new AbortController().signal,
  id = randomUUID(),
  foreignId = randomUUID();
const entry = {
  id,
  title: "QA synthetic Reader recovery check",
  subtitle: "Disposable test text",
  language: "Spanish",
  targetLabel: "Spanish",
  flag: "",
  section: "custom",
  available: true,
  sentences: [{ en: "Please bring one shingle.", target: "Traiga una teja, por favor." }],
};
const entries = new Map(),
  storage = { getItem: (k) => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v) };
const checks = {};
try {
  let lostResponse = true;
  const first = createLibraryDevice({
    actor: qa.personalId,
    storage,
    isCurrent: () => true,
    remote: {
      ...remoteA,
      async put(book, abort) {
        const saved = await remoteA.put(book, abort);
        if (lostResponse) {
          lostResponse = false;
          throw Error("Injected lost acknowledgement after real insert");
        }
        return saved;
      },
    },
  });
  first.add(entry);
  await first.sync();
  assert.deepEqual(first.getSnapshot().pending, [id]);
  checks.realInsertWithInjectedLostAcknowledgementRetainsQueue = true;
  const restored = createLibraryDevice({
    actor: qa.personalId,
    storage,
    remote: remoteA,
    isCurrent: () => true,
  });
  await restored.sync();
  assert.deepEqual(restored.getSnapshot().pending, []);
  const rows = await remoteA.load(signal);
  assert.equal(rows.filter((row) => row.id === id).length, 1);
  checks.stableUuidRetryProducesExactlyOneOwnedRow = true;
  assert.equal(
    (await remoteB.load(signal)).some((row) => row.id === id),
    false,
  );
  checks.otherLearnerCannotReadText = true;
  await remoteB.remove(id, signal);
  assert.equal(
    (await remoteA.load(signal)).some((row) => row.id === id),
    true,
  );
  checks.otherLearnerCannotDeleteText = true;
  const wrongActor = createLibraryRemote(b, qa.personalId, () => true);
  let denied = false;
  try {
    await wrongActor.put({ ...entry, id: foreignId }, signal);
  } catch {
    denied = true;
  }
  assert.equal(
    denied,
    true,
    "RLS refuses another account owner even if a client actor check is wrong",
  );
  checks.rlsRejectsCrossAccountInsert = true;
  let current = false;
  const stale = createLibraryRemote(a, qa.personalId, () => current);
  await assert.rejects(stale.load(signal), /Account changed/);
  checks.staleIdentityRejectedBeforeQuery = true;
} finally {
  await remoteA.remove(id, signal);
  await remoteA.remove(foreignId, signal);
  assert.equal(
    (await remoteA.load(signal)).some((row) => row.id === id || row.id === foreignId),
    false,
    "Synthetic rows cleaned",
  );
  checks.syntheticRowsCleaned = true;
  for (const c of clients) c.auth.stopAutoRefresh();
}
const report = {
  testedAt: new Date().toISOString(),
  sourceCommit: execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(),
  scope:
    "Hosted existing dedicated QA accounts, synthetic books only, real RLS/idempotency calls; lost acknowledgement is explicit fault injection",
  checks,
};
writeFileSync(
  "docs/reviews/qa-reader-library-api-2026-10-16.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(checks));
