import assert from "node:assert/strict";
import { test } from "node:test";
import { createLearnerDeviceStore, learnerDeviceKey } from "../src/lib/learner-device-store.ts";

function fixture() {
  const entries = new Map();
  const storage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
  let current = "a";
  const make = (kind, actor) =>
    createLearnerDeviceStore({ kind, actor, storage, isCurrent: () => current === actor });
  return {
    entries,
    storage,
    make,
    switchTo: (actor) => {
      current = actor;
    },
  };
}
for (const kind of [
  "notes",
  "flashcards",
  "tutor",
  "speak",
  "grammar",
  "speech",
  "heardWords",
  "gameConjugation",
  "gameWordMatch",
  "gameListening",
  "gameIdioms",
  "gameFalseFriends",
  "dailyChallenge",
  "languageMatch",
  "simulatedRivals",
  "readingHints:furigana",
  "readingHints:pinyin",
  "readingHints:romaja",
]) {
  test(`${kind}: private practice survives own reload, remains absent for guest/another learner, and rejects stale callbacks`, () => {
    const f = fixture();
    const a = f.make(kind, "a");
    const saved = { text: `QA ${kind} private`, progress: [1, 2] };
    assert.equal(a.write(saved), true);
    assert.deepEqual(f.make(kind, "a").read(), saved);
    f.switchTo(null);
    const guest = f.make(kind, null);
    assert.equal(guest.read(), null);
    assert.equal(a.read(), null);
    assert.equal(a.write({ text: "late stream" }), false);
    guest.write({ text: "guest work" });
    f.switchTo("b");
    assert.equal(guest.write({ text: "late guest callback" }), false);
    assert.equal(f.make(kind, "b").read(), null);
    f.make(kind, "b").write({ text: "B work" });
    f.switchTo("a");
    assert.deepEqual(f.make(kind, "a").read(), saved);
  });
}
test("unowned legacy stores are neither read, reassigned nor deleted", () => {
  const f = fixture();
  const keys = [
    "lt.annotations.v1",
    "lingualens.flashcards.v2",
    "lt.tutor.v1",
    "lt.speak.v1",
    "lt.grammar.v2",
    "lt.speech.v1",
    "lt.speech.recentWords.v1",
    "lt.furigana.v3",
    "lt.pinyin.v1",
    "lt.romaja.v1",
  ];
  keys.forEach((key) => f.storage.setItem(key, JSON.stringify({ text: "unknown owner" })));
  const before = new Map(f.entries);
  for (const kind of [
    "notes",
    "flashcards",
    "tutor",
    "speak",
    "grammar",
    "speech",
    "heardWords",
    "gameConjugation",
    "gameWordMatch",
    "gameListening",
    "gameIdioms",
    "gameFalseFriends",
    "dailyChallenge",
    "languageMatch",
    "simulatedRivals",
    "readingHints:furigana",
    "readingHints:pinyin",
    "readingHints:romaja",
  ]) {
    assert.equal(f.make(kind, "a").read(), null);
    f.make(kind, "a").write({ text: "new owned work" });
  }
  for (const [key, value] of before) assert.equal(f.storage.getItem(key), value);
});
test("envelope ownership, kind and schema are verified rather than trusting the storage key", () => {
  const f = fixture(),
    key = learnerDeviceKey("notes", "a");
  for (const value of [
    { schema: 1, actor: "b", kind: "notes", data: ["foreign"] },
    { schema: 1, actor: "a", kind: "tutor", data: ["wrong kind"] },
    { schema: 2, actor: "a", kind: "notes", data: ["unknown version"] },
  ]) {
    f.storage.setItem(key, JSON.stringify(value));
    assert.equal(f.make("notes", "a").read(), null);
  }
  f.storage.setItem(key, "malformed");
  assert.equal(f.make("notes", "a").read(), null);
});
test("arrays remain arrays and unavailable/full storage never claims a successful save", () => {
  const f = fixture();
  const store = f.make("notes", "a");
  assert.equal(store.write([{ noteText: "QA annotation" }]), true);
  assert.deepEqual(store.read(), [{ noteText: "QA annotation" }]);
  for (const storage of [
    null,
    {
      getItem() {
        throw Error("blocked");
      },
      setItem() {
        throw Error("quota");
      },
    },
  ]) {
    const blocked = createLearnerDeviceStore({
      kind: "notes",
      actor: "a",
      storage,
      isCurrent: () => true,
    });
    assert.equal(blocked.read(), null);
    assert.equal(blocked.write({ noteText: "unsaved" }), false);
  }
});
