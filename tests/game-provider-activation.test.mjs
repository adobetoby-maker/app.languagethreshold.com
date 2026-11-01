import test from "node:test";
import assert from "node:assert/strict";
import { needsGameProviders } from "../src/lib/game-provider-activation.ts";
test("only game tools request the optional provider group, including direct links", () => {
  for (const tab of [
    "games",
    "conjugation",
    "sentenceBuild",
    "listeningDrill",
    "wordMatch",
    "idiomMaster",
    "falseFriends",
  ])
    assert.equal(needsGameProviders(tab), true, tab);
  for (const tab of [
    "reader",
    "core30",
    "speak",
    "penpal",
    "grammar",
    "dashboard",
    "anatomy",
    "flashcards",
  ])
    assert.equal(needsGameProviders(tab), false, tab);
});
