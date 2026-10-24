import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";
const { validWatchTranscript, claimWatchTranscript } = await loadModule(
  "src/lib/watch-talk-protocol.ts",
);
const now = 100000;
const sample = {
  contextId: "active-mission",
  requestId: "f89b2e1a-754f-4c70-8bac-3e09c45889ff",
  text: "  Hola, buenos días.  ",
  createdAt: now,
};
test("Watch accepts one current turn and trims its text", () => {
  const seen = new Set();
  assert.equal(claimWatchTranscript(sample, "active-mission", now, seen), "Hola, buenos días.");
  assert.equal(claimWatchTranscript(sample, "active-mission", now, seen), null);
});
test("Watch rejects late replies from another account/mission, expired and future turns", () => {
  for (const data of [
    { ...sample, contextId: "old-mission" },
    { ...sample, createdAt: now - 60001 },
    { ...sample, createdAt: now + 5001 },
  ]) {
    const seen = new Set();
    assert.equal(claimWatchTranscript(data, "active-mission", now, seen), null);
    assert.equal(seen.size, 0);
  }
});
test("Watch rejects malformed, empty, oversized and nonfinite messages", () => {
  for (const data of [
    null,
    [],
    { ...sample, text: "" },
    { ...sample, text: " ".repeat(2001) },
    { ...sample, text: "x".repeat(2001) },
    { ...sample, requestId: "bad" },
    { ...sample, createdAt: NaN },
    { ...sample, createdAt: Infinity },
    { ...sample, text: 123 },
  ])
    assert.equal(validWatchTranscript(data, "active-mission", now), false);
});
test("Watch inbox is bounded without forgetting the newest turn", () => {
  const seen = new Set();
  for (let i = 0; i < 90; i++)
    assert.equal(
      claimWatchTranscript(
        { ...sample, requestId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}` },
        "active-mission",
        now,
        seen,
      ),
      "Hola, buenos días.",
    );
  assert.equal(seen.size, 64);
  assert.equal(
    claimWatchTranscript(
      { ...sample, requestId: "00000000-0000-4000-8000-000000000089" },
      "active-mission",
      now,
      seen,
    ),
    null,
  );
});
