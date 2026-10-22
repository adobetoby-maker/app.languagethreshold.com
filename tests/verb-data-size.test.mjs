// Built by TAC — 2026-10-21
// Verb Games: the signed Spanish pattern data is a lazy chunk with a hard size bound.
import assert from "node:assert/strict";
import { statSync } from "node:fs";
import test from "node:test";

const LIMIT_BYTES = 750 * 1024;

test("src/data/verb-patterns/es.json stays within 750 KB on disk", () => {
  const { size } = statSync(new URL("../src/data/verb-patterns/es.json", import.meta.url));
  assert.ok(
    size <= LIMIT_BYTES,
    `es.json is ${size} bytes (${(size / 1024).toFixed(1)} KB), over the 750 KB (${LIMIT_BYTES} byte) bound. See docs/verb-games.md ("Size bound") before growing it.`,
  );
});
