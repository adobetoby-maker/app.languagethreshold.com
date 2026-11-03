import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";
const { redditClaim, feedbackInput, promoActive, redditClaimOpen } =
  await loadModule("src/lib/reddit-offer.ts");
test("Reddit code normalizes but rejects another code and spoofed identity", () => {
  assert.equal(
    redditClaim.parse({ code: " redditmonth ", feedbackEmailConsent: false }).code,
    "REDDITMONTH",
  );
  assert.equal(redditClaim.safeParse({ code: "FREE", feedbackEmailConsent: true }).success, false);
  assert.equal(
    redditClaim.safeParse({
      code: "REDDITMONTH",
      feedbackEmailConsent: true,
      userId: "someone-else",
    }).success,
    false,
  );
  assert.equal(redditClaim.safeParse({ code: "REDDITMONTH" }).success, false);
});
test("access ends exactly at expiry; malformed and missing dates fail closed", () => {
  const now = Date.parse("2026-11-02T12:00:00Z");
  assert.equal(promoActive("2026-11-02T12:00:01Z", now), true);
  for (const value of ["2026-11-02T12:00:00Z", "2026-11-01T12:00:00Z", "invalid", null, undefined])
    assert.equal(promoActive(value, now), false);
});
test("feedback bounds and categories are validated and actor cannot be supplied", () => {
  const input = {
    id: "00000000-0000-4000-8000-000000000101",
    category: "idea",
    message: "A useful suggestion",
  };
  assert.equal(feedbackInput.safeParse(input).success, true);
  assert.equal(feedbackInput.safeParse({ ...input, message: "short" }).success, false);
  assert.equal(feedbackInput.safeParse({ ...input, category: "billing" }).success, false);
  assert.equal(feedbackInput.safeParse({ ...input, user_id: input.id }).success, false);
});

test("redemption cutoff includes December 1 in Mountain Time and closes at midnight", () => {
  assert.equal(redditClaimOpen(Date.parse("2026-12-02T06:59:59.999Z")), true);
  assert.equal(redditClaimOpen(Date.parse("2026-12-02T07:00:00.000Z")), false);
  assert.equal(redditClaimOpen(Date.parse("2026-12-02T07:00:00.001Z")), false);
});
