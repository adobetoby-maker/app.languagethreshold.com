// Built by TAC — 2026-10-23
// Verb Games: the committed Spanish pattern data must be signed whenever a sign-off exists.
//
// When new lesson content changes the review report, its sha no longer matches
// docs/verb-patterns/es-review-signoff.json and the compile silently ships only the dictionary-
// verified verbs (594 -> 230 on 2026-10-23). This test turns that silent drop into a red build.
//
// EXPECTED RED on feature/gutters-siding-core60 until the lead re-signs the report after the
// final scoped check (update reportSha256 in docs/verb-patterns/es-review-signoff.json, then run
// `node scripts/build-verb-patterns.mts`). Do not "fix" it by deleting the sign-off file.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const SIGNOFF = new URL("../docs/verb-patterns/es-review-signoff.json", import.meta.url);
const DATA = new URL("../src/data/verb-patterns/es.json", import.meta.url);

test("verb data is signed off whenever a sign-off file exists (no silent drop to verified-only verbs)", () => {
  if (!existsSync(SIGNOFF)) return;
  const signoff = JSON.parse(readFileSync(SIGNOFF, "utf8"));
  const data = JSON.parse(readFileSync(DATA, "utf8"));
  assert.equal(
    data.signedOff,
    true,
    `src/data/verb-patterns/es.json is unsigned (${data.verbs.length} verbs): its review report sha ` +
      `${data.reportSha256} does not match the sign-off (${signoff.reportSha256}). Review the report ` +
      "delta, update docs/verb-patterns/es-review-signoff.json and run node scripts/build-verb-patterns.mts.",
  );
});
