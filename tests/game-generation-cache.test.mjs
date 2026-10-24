import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PublicGameGenerationCache,
  publicGameGenerationKey,
} from "../src/lib/game-generation-cache.ts";

const roofing = {
  language: "Spanish",
  level: 1,
  topic: "Roofing Supervisor",
  cefr: "A2",
  axis: "person",
  avoid: [],
};
test("personalized calls cannot read public entries or populate shared entries", () => {
  const cache = new PublicGameGenerationCache();
  cache.set(roofing, { phrase: "public roofing question" });
  const personal = { ...roofing, userWords: ["QA-private-vocabulary"] };
  assert.equal(publicGameGenerationKey(personal), null);
  assert.equal(cache.get(personal), undefined);
  cache.set(personal, { phrase: "personal result" });
  assert.deepEqual(cache.get(roofing), { phrase: "public roofing question" });
  assert.equal(cache.get({ ...roofing, userWords: ["other-learner"] }), undefined);
  const empty = new PublicGameGenerationCache();
  empty.set(personal, { phrase: "private first" });
  assert.equal(empty.get(roofing), undefined);
});
test("public context separates module, language, difficulty, grammar axis and avoid boundaries", () => {
  const cache = new PublicGameGenerationCache();
  cache.set(roofing, "roofing");
  for (const patch of [
    { topic: "Landscaper" },
    { language: "Italian" },
    { level: 2 },
    { cefr: "B1" },
    { axis: "tense" },
    { avoid: ["revisar"] },
  ]) {
    assert.equal(cache.get({ ...roofing, ...patch }), undefined);
  }
  for (const avoid of [["a,b"], ["a", "b"], ["private recent result"]]) {
    assert.equal(publicGameGenerationKey({ ...roofing, avoid }), null);
    cache.set({ ...roofing, avoid }, "must not be retained");
    assert.equal(cache.get({ ...roofing, avoid }), undefined);
  }
  assert.equal(cache.get({ ...roofing, userWords: [] }), "roofing");
});
test("bounded public cache refreshes recency without evicting unrelated entries on overwrite", () => {
  const cache = new PublicGameGenerationCache(2);
  const landscape = { ...roofing, topic: "Landscaper" };
  cache.set(roofing, 1);
  cache.set(landscape, 2);
  cache.set(roofing, 3);
  assert.equal(cache.get(landscape), 2);
  cache.set({ ...roofing, topic: "Plumber" }, 4);
  assert.equal(cache.get(roofing), undefined);
  assert.equal(cache.get(landscape), 2);
});

test("only exact authored public topics and supported identities can enter a shared key", async () => {
  const { MODULES } = await import("../src/data/modules.ts");
  for (const module of MODULES) {
    for (const topic of [
      module.name,
      `${module.name} (${module.vocabFocus.slice(0, 5).join(", ")})`,
    ])
      assert.notEqual(publicGameGenerationKey({ ...roofing, topic }), null);
  }
  const cache = new PublicGameGenerationCache();
  cache.set(roofing, "public control");
  for (const patch of [
    { topic: "private learner story" },
    { topic: `${roofing.topic} private learner suffix` },
    { language: "Spanish private learner text" },
    { axis: "private prompt" },
    { cefr: "private level" },
    { level: 0 },
    { level: 4 },
    { avoid: ["private prior generated sentence"] },
  ]) {
    const context = { ...roofing, ...patch };
    assert.equal(publicGameGenerationKey(context), null);
    cache.set(context, "private result");
    assert.equal(cache.get(context), undefined);
    assert.equal(cache.get(roofing), "public control");
  }
});

test("public cache expiry is absolute and a read cannot extend retained generation", () => {
  let time = 0;
  const cache = new PublicGameGenerationCache(2, { now: () => time, ttlMs: 1000 });
  cache.set(roofing, "original");
  time = 900;
  assert.equal(cache.get(roofing), "original");
  time = 1000;
  assert.equal(cache.get(roofing), undefined);
  cache.set(roofing, "replacement");
  time = 1999;
  assert.equal(cache.get(roofing), "replacement");
  time = 2000;
  assert.equal(cache.get(roofing), undefined);
});

test("expired entries are reclaimed before capacity eviction while overwrite resets only its own lifetime", () => {
  let time = 0;
  const cache = new PublicGameGenerationCache(2, { now: () => time, ttlMs: 1000 }),
    landscape = { ...roofing, topic: "Landscaper" },
    plumber = { ...roofing, topic: "Plumber" };
  cache.set(roofing, "old roof");
  time = 500;
  cache.set(landscape, "landscape");
  time = 1000;
  cache.set(plumber, "plumber");
  assert.equal(cache.get(roofing), undefined);
  assert.equal(cache.get(landscape), "landscape");
  time = 1400;
  cache.set(landscape, "updated landscape");
  time = 2000;
  assert.equal(cache.get(plumber), undefined);
  assert.equal(cache.get(landscape), "updated landscape");
  time = 2400;
  assert.equal(cache.get(landscape), undefined);
});

test("cache capacity and retention configuration cannot remove its bounds", () => {
  for (const capacity of [0, -1, 1.5, Infinity, 1001])
    assert.throws(() => new PublicGameGenerationCache(capacity), RangeError);
  for (const ttlMs of [0, -1, Infinity, NaN, 3600001])
    assert.throws(() => new PublicGameGenerationCache(1, { ttlMs }), RangeError);
});
