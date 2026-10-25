import assert from "node:assert/strict";
import test from "node:test";
import { speakingAuthMission } from "../src/lib/speaking-auth-return.ts";

test("mission return waits for the matching module and language pair", () => {
  const context = { moduleId: "roofing", target: "Spanish", native: "English" };
  const url = "/?tab=speak&module=roofing&target=Spanish&native=English&mission=roofing.lesson-02.v1";
  assert.equal(speakingAuthMission(url, context), "roofing.lesson-02.v1");
  for (const changed of [
    { ...context, moduleId: "landscaper" },
    { ...context, target: "French" },
    { ...context, native: "German" },
  ]) assert.equal(speakingAuthMission(url, changed), null);
  assert.equal(speakingAuthMission(url.replace("tab=speak", "tab=reader"), context), null);
  assert.equal(speakingAuthMission("/account" + url.slice(1), context), null);
});
