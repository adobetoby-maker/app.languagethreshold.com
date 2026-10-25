import assert from "node:assert/strict";
import test from "node:test";
import { speakingAuthMission, rememberSpeakingAuthNavigation, consumeSpeakingAuthNavigation, clearSpeakingAuthNavigation } from "../src/lib/speaking-auth-return.ts";

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


test("an explicit sign-in destination survives a saved-profile tab overwrite once and expires", () => {
  const old = globalThis.window;
  const values = new Map();
  globalThis.window = { sessionStorage: { getItem:k => values.get(k) ?? null, setItem:(k,v) => values.set(k,v), removeItem:k => values.delete(k) } };
  try {
    const path = "/?tab=speak&module=roofing&target=Spanish&native=English&mission=lesson-02&access_token=secret";
    rememberSpeakingAuthNavigation(path, 1000);
    assert.equal([...values.values()].some(v=>v.includes("secret")),false);
    // The authenticated profile may say Games/Core; restoration must still apply this scope.
    assert.equal(consumeSpeakingAuthNavigation(2000), "/?tab=speak&module=roofing&target=Spanish&native=English&mission=lesson-02");
    assert.equal(consumeSpeakingAuthNavigation(2000),null);
    rememberSpeakingAuthNavigation(path,1000);
    assert.equal(consumeSpeakingAuthNavigation(902000),null);
    rememberSpeakingAuthNavigation(path,1000); clearSpeakingAuthNavigation();
    assert.equal(consumeSpeakingAuthNavigation(2000),null);
  } finally { if (old === undefined) delete globalThis.window; else globalThis.window=old; }
});
