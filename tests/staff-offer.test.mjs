import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";
const { staffEmail, staffClaim } = await loadModule("src/lib/staff-offer.ts");
test("staff coupon accepts its exact code and normalizes recipient email", () => {
  assert.equal(staffEmail.parse(" Person@example.com "), "person@example.com");
  assert.equal(staffClaim.parse({ code: " cleaning2months " }).code, "CLEANING2MONTHS");
  assert.equal(staffClaim.safeParse({ code: "REDDITMONTH" }).success, false);
  assert.equal(
    staffClaim.safeParse({ code: "CLEANING2MONTHS", email: "other@example.com" }).success,
    false,
  );
  assert.equal(staffEmail.safeParse("bad").success, false);
});
