import assert from "node:assert/strict";
import test from "node:test";
import { createWordCardCache, wordCardCacheKey } from "../src/lib/word-card-cache.ts";
import { currentTutorLesson } from "../src/lib/lesson-tutor-context.ts";

test("account-subtree word caches never share private contexts and clear on disposal", () => {
  const a = createWordCardCache(),
    b = createWordCardCache(),
    guest = createWordCardCache();
  const key = wordCardCacheKey(
    { word: "qa", sentence: "Private QA sentence", language: "Spanish" },
    "English",
  );
  const card = { headword: "qa", contextNuance: "Private QA nuance" };
  a.set(key, card);
  assert.equal(a.get(key), card);
  assert.equal(b.get(key), null);
  assert.equal(guest.get(key), null);
  a.clear();
  assert.equal(a.get(key), null);
  assert.equal(createWordCardCache().get(key), null);
});

test("word cache retains sense/pair/lesson boundaries and bounds its lifetime entries", () => {
  const request = { word: "qa", sentence: "QA sentence", language: "Spanish" };
  const key = wordCardCacheKey(request, "English");
  for (const [next, native] of [
    [{ ...request, sentence: "Another" }, "English"],
    [{ ...request, word: "other" }, "English"],
    [{ ...request, language: "French" }, "English"],
    [request, "French"],
    [
      {
        ...request,
        lesson: currentTutorLesson("?lesson=1", {
          currentTab: "core30",
          activeModuleId: "roofing",
          selectedLanguage: "Spanish",
          nativeLanguage: "English",
        }),
      },
      "English",
    ],
  ])
    assert.notEqual(wordCardCacheKey(next, native), key);
  const cache = createWordCardCache();
  for (let n = 0; n < 201; n++) cache.set(String(n), { headword: String(n) });
  assert.equal(cache.get("0"), null);
  assert.equal(cache.get("200").headword, "200");
  cache.set("1", { headword: "replace" });
  cache.set("201", { headword: "last" });
  assert.equal(cache.get("2"), null);
  assert.equal(cache.get("1").headword, "replace");
});
