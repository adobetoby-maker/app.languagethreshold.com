import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PublicGameGenerationCache,
  publicGameGenerationKey,
} from "../src/lib/game-generation-cache.ts";

const roofing = {
  language: "Spanish",
  level: 1,
  topic: "Roofing",
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
    { topic: "Landscaping" },
    { language: "Italian" },
    { level: 2 },
    { cefr: "B1" },
    { axis: "tense" },
    { avoid: ["revisar"] },
  ]) {
    assert.equal(cache.get({ ...roofing, ...patch }), undefined);
  }
  assert.notEqual(
    publicGameGenerationKey({ ...roofing, avoid: ["a,b"] }),
    publicGameGenerationKey({ ...roofing, avoid: ["a", "b"] }),
  );
  assert.notEqual(
    publicGameGenerationKey({ ...roofing, avoid: ["a"], topic: "bc" }),
    publicGameGenerationKey({ ...roofing, avoid: ["ab"], topic: "c" }),
  );
  assert.equal(cache.get({ ...roofing, userWords: [] }), "roofing");
});
test("bounded public cache refreshes recency without evicting unrelated entries on overwrite", () => {
  const cache = new PublicGameGenerationCache(2);
  const landscape = { ...roofing, topic: "Landscaping" };
  cache.set(roofing, 1);
  cache.set(landscape, 2);
  cache.set(roofing, 3);
  assert.equal(cache.get(landscape), 2);
  cache.set({ ...roofing, topic: "Plumbing" }, 4);
  assert.equal(cache.get(roofing), undefined);
  assert.equal(cache.get(landscape), 2);
});
