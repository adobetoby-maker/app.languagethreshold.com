import test from "node:test";
import assert from "node:assert/strict";
import { documentPassages, validateDocumentTranslations } from "../src/lib/document-translation.ts";
test("document original preserves numbers, negation, units, form blanks and punctuation", () => {
  assert.deepEqual(
    documentPassages("  SAFETY\r\nDo NOT lift over 15 kg.\r\n\r\nName: ______  Date: ______  "),
    ["SAFETY", "Do NOT lift over 15 kg.", "Name: ______  Date: ______"],
  );
});
test("rejects incomplete or empty translations instead of silently dropping instructions", () => {
  assert.throws(() => validateDocumentTranslations(["Only one"], 2));
  assert.throws(() => validateDocumentTranslations(["Okay", " "], 2));
  assert.deepEqual(validateDocumentTranslations(["Uno", "Dos"], 2), ["Uno", "Dos"]);
});
test("rejects oversized documents instead of truncating", () => {
  assert.throws(() => documentPassages("x".repeat(8001)));
  assert.throws(() => documentPassages("short"));
});

test("document character allowance counts Unicode characters rather than UTF-16 code units", async () => {
  const { documentCharacterCount, documentMonth } = await import("../src/lib/document-plans.ts");
  assert.equal(documentCharacterCount("  Hi 😀  "), 4);
  assert.equal(documentMonth(new Date("2026-11-01T00:00:00Z")), "2026-11-01");
});
test("document sign-in returns to the workspace and drops unrelated query data", async () => {
  const { authenticationRedirectUrl } = await import("../src/lib/auth-return.ts");
  assert.equal(
    authenticationRedirectUrl("https://app.languagethreshold.com/documents?purchase=processing"),
    "https://app.languagethreshold.com/documents",
  );
});
