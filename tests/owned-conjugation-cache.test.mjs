import assert from "node:assert/strict";
import test from "node:test";
import {
  createOwnedConjugationCache,
  isInCatalog,
  getFrequencyConjugation,
} from "../src/lib/conjugation-cache.ts";
import { createLearnerDeviceStore, learnerDeviceKey } from "../src/lib/learner-device-store.ts";
const person = Object.fromEntries(
  [
    "firstSingular",
    "secondSingular",
    "thirdSingular",
    "firstPlural",
    "secondPlural",
    "thirdPlural",
  ].map((key, i) => [key, `qa-form-${i}`]),
);
const table = (infinitive = "qa-novel", marker = "private-A") => ({
  infinitive,
  pronunciation: marker,
  presentTense: person,
  pastTense: person,
  futureTense: person,
  conditionalTense: person,
  gerund: "qa-gerund",
  pastParticiple: "qa-participle",
  perfectExample: marker,
  commonUses: [{ phrase: marker, translation: "QA translation" }],
});
function fixture() {
  const bytes = new Map([
    [
      "lingualens.conjugations.v1",
      JSON.stringify({ "qa-old": { Spanish: table("qa-old", "unowned legacy") } }),
    ],
  ]);
  const reads = [],
    writes = [];
  let actor = "A",
    blocked = false;
  const storage = {
    getItem(key) {
      reads.push(key);
      return bytes.get(key) ?? null;
    },
    setItem(key, value) {
      writes.push(key);
      if (blocked) throw Error("Synthetic quota");
      bytes.set(key, value);
    },
  };
  const owner = (id, options = {}) => {
    const isCurrent = () => actor === id;
    const store = createLearnerDeviceStore({
      kind: "conjugationTables",
      actor: id,
      storage,
      isCurrent,
    });
    return createOwnedConjugationCache({ store, ...options, isCurrent });
  };
  return {
    bytes,
    reads,
    writes,
    storage,
    owner,
    set actor(value) {
      actor = value;
    },
    set blocked(value) {
      blocked = value;
    },
  };
}
const answer = (data) => ({ data, error: null });
const wait = () => new Promise((resolve) => setImmediate(resolve));

test("novel tables stay in explicit A/guest/B envelopes, restore only to A and leave legacy bytes untouched", async () => {
  const f = fixture(),
    legacy = f.bytes.get("lingualens.conjugations.v1"),
    a = f.owner("A");
  let calls = 0;
  assert.equal(
    (
      await a.ensureConjugation("Spanish", "qa-novel", {
        fetch: async () => {
          calls++;
          return answer(table());
        },
      })
    ).persisted,
    true,
  );
  assert.equal(isInCatalog("Spanish", "qa-novel"), false);
  f.actor = null;
  const guest = f.owner(null);
  assert.equal(guest.getCachedConjugation("Spanish", "qa-novel"), undefined);
  f.actor = "B";
  const b = f.owner("B");
  assert.equal(b.getCachedConjugation("Spanish", "qa-novel"), undefined);
  assert.equal(a.getCachedConjugation("Spanish", "qa-novel"), undefined);
  f.actor = "A";
  const restored = f.owner("A");
  const result = await restored.ensureConjugation("Spanish", "qa-novel");
  assert.equal(result.data.perfectExample, "private-A");
  assert.equal(result.persisted, true);
  assert.equal(calls, 1);
  assert.equal(restored.getCachedConjugation("Spanish", "qa-old"), undefined);
  assert.equal(f.bytes.get("lingualens.conjugations.v1"), legacy);
  assert.ok(
    f.reads.every(
      (key) =>
        key.startsWith("lt.learner-device.v1.conjugationTables.") ||
        key === "lt.learning-reset.v1.A" ||
        key === "lt.learning-reset.v1.B",
    ),
  );
  assert.ok(f.writes.every((key) => key === learnerDeviceKey("conjugationTables", "A")));
});

test("coalescing is instance-owned and includes exact English sense; mutable options cannot rewrite its context", async () => {
  const f = fixture(),
    a = f.owner("A");
  let release,
    calls = 0;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const opts = {
    english: "sense-A",
    fetch: async ({ data }) => {
      calls++;
      assert.equal(data.english, "sense-A");
      await gate;
      return answer(table());
    },
  };
  const first = a.ensureConjugation("Spanish", "qa-novel", opts),
    retry = a.ensureConjugation("Spanish", "qa-novel", { ...opts });
  opts.english = "mutated";
  await wait();
  assert.equal(calls, 1);
  f.actor = "B";
  const b = f.owner("B");
  const parallel = await b.ensureConjugation("Spanish", "qa-novel", {
    english: "sense-A",
    fetch: async () => {
      calls++;
      return answer(table("qa-novel", "account-B"));
    },
  });
  assert.equal(parallel.data.perfectExample, "account-B");
  assert.equal(calls, 2, "Another owner must not join A's unresolved request");
  f.actor = "A";
  release();
  assert.deepEqual(await first, await retry);
  assert.ok(a.getCachedConjugation("Spanish", "qa-novel", "sense-A"));
  assert.equal(a.getCachedConjugation("Spanish", "qa-novel", "mutated"), undefined);
  const different = await a.ensureConjugation("Spanish", "qa-novel", {
    english: "sense-B",
    fetch: async () => {
      calls++;
      return answer(table("qa-novel", "private-B"));
    },
  });
  assert.equal(different.data.perfectExample, "private-B");
  assert.equal(calls, 3);
  f.actor = "B";
  const other = await b.ensureConjugation("Spanish", "qa-novel", {
    english: "sense-A",
    fetch: async () => {
      calls++;
      return answer(table("qa-novel", "account-B"));
    },
  });
  assert.equal(other.data.perfectExample, "account-B");
  assert.equal(calls, 3);
});

test("dispose and account change reject queued/late work without another owner's write or returned table", async () => {
  const f = fixture(),
    queued = f.owner("A");
  let calls = 0;
  const before = queued.ensureConjugation("Spanish", "qa-before", {
    fetch: async () => {
      calls++;
      return answer(table("qa-before"));
    },
  });
  queued.dispose();
  assert.equal((await before).data, null);
  assert.equal(calls, 0);
  for (const action of [
    () => {
      f.actor = "B";
    },
    (cache) => cache.dispose(),
  ]) {
    f.actor = "A";
    const cache = f.owner("A");
    let release;
    const request = cache.ensureConjugation("Spanish", "qa-late", {
      fetch: async () => {
        calls++;
        return new Promise((resolve) => {
          release = resolve;
        });
      },
    });
    await wait();
    action(cache);
    release(answer(table("qa-late")));
    assert.equal((await request).data, null);
    assert.equal(f.writes.length, 0);
  }
});

test("quota fallback is owned memory with an explicit retry and no repeated fetch; returned copies cannot poison it", async () => {
  const f = fixture(),
    a = f.owner("A");
  f.blocked = true;
  let calls = 0;
  const result = await a.ensureConjugation("Spanish", "qa-novel", {
    fetch: async () => {
      calls++;
      return answer(table());
    },
  });
  assert.equal(result.persisted, false);
  assert.ok(result.data);
  result.data.commonUses[0].phrase = "mutated caller";
  const memory = await a.ensureConjugation("Spanish", "qa-novel");
  assert.equal(memory.persisted, false);
  assert.equal(memory.data.commonUses[0].phrase, "private-A");
  f.actor = "B";
  assert.equal(f.owner("B").getCachedConjugation("Spanish", "qa-novel"), undefined);
  f.actor = "A";
  f.blocked = false;
  assert.equal(a.retryPersistence(), true);
  const restored = await f.owner("A").ensureConjugation("Spanish", "qa-novel");
  assert.equal(restored.persisted, true);
  assert.equal(restored.data.perfectExample, "private-A");
  assert.equal(calls, 1);
});

test("authored tables remain zero-fetch/zero-owned-storage lookups and returned mutations never reach the catalog", async () => {
  const f = fixture(),
    a = f.owner("A");
  let calls = 0;
  const original = getFrequencyConjugation("can", "Spanish");
  assert.ok(original);
  const result = await a.ensureConjugation("Spanish", original.infinitive, {
    fetch: async () => {
      calls++;
      return answer(table());
    },
  });
  assert.equal(calls, 0);
  assert.equal(f.reads.length, 0);
  assert.equal(f.writes.length, 0);
  result.data.presentTense.firstSingular = "private caller mutation";
  original.commonUses.push({ phrase: "private mutation", translation: "private" });
  f.actor = "B";
  const b = f.owner("B");
  const publicAgain = await b.ensureConjugation("Spanish", original.infinitive);
  assert.notEqual(publicAgain.data.presentTense.firstSingular, "private caller mutation");
  assert.equal(
    publicAgain.data.commonUses.some((x) => x.phrase === "private mutation"),
    false,
  );
});

test("invalid source/identity/error payloads do not persist, and only validated table fields are retained", async () => {
  const f = fixture(),
    a = f.owner("A");
  let calls = 0;
  assert.equal(
    (
      await a.ensureConjugation("Spanish", "qa-novel", {
        english: "x".repeat(121),
        fetch: async () => {
          calls++;
          return answer(table());
        },
      })
    ).data,
    null,
  );
  assert.equal(calls, 0);
  for (const output of [
    answer(table("wrong-verb")),
    { data: table(), error: "failed" },
    answer({ ...table(), presentTense: {} }),
    answer({ ...table(), commonUses: Array(3).fill({ phrase: "x", translation: "y" }) }),
  ])
    assert.equal(
      (await a.ensureConjugation("Spanish", "qa-novel", { fetch: async () => output })).data,
      null,
    );
  assert.equal(f.writes.length, 0);
  const clean = await a.ensureConjugation("Spanish", "qa-novel", {
    fetch: async () => answer({ ...table(), privateProviderDetail: "discard" }),
  });
  assert.equal(clean.data.privateProviderDetail, undefined);
  assert.equal(
    f.bytes.get(learnerDeviceKey("conjugationTables", "A")).includes("privateProviderDetail"),
    false,
  );
  const raw = f.bytes.get(learnerDeviceKey("conjugationTables", "A"));
  f.bytes.set(learnerDeviceKey("conjugationTables", "B"), raw);
  f.actor = "B";
  assert.equal(f.owner("B").getCachedConjugation("Spanish", "qa-novel"), undefined);
});

test("private cache and pending requests remain bounded, including synchronous failures and prototype-like verb keys", async () => {
  const f = fixture(),
    a = f.owner("A");
  for (let i = 0; i < 101; i++) a.putUserConjugation("Spanish", table(`qa-${i}`));
  assert.equal(a.getCachedConjugation("Spanish", "qa-0"), undefined);
  assert.ok(a.getCachedConjugation("Spanish", "qa-100"));
  a.putUserConjugation("Spanish", table("__proto__"));
  assert.ok(a.getCachedConjugation("Spanish", "__proto__"));
  assert.equal(isInCatalog("Spanish", "__proto__"), false);
  const before = f.writes.length,
    releases = [];
  let calls = 0;
  const pending = Array.from({ length: 10 }, (_, i) =>
    a.ensureConjugation("Spanish", `pending-${i}`, {
      fetch: () => {
        calls++;
        return new Promise((resolve) =>
          releases.push(() => resolve(answer(table(`pending-${i}`)))),
        );
      },
    }),
  );
  assert.equal(
    (
      await a.ensureConjugation("Spanish", "overflow", {
        fetch: async () => {
          calls++;
          return answer(table("overflow"));
        },
      })
    ).data,
    null,
  );
  await wait();
  assert.equal(calls, 10);
  a.dispose();
  releases.forEach((release) => release());
  assert.ok((await Promise.all(pending)).every((result) => result.data === null));
  assert.equal(f.writes.length, before);
  const retry = f.owner("A");
  let failures = 0;
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await retry.ensureConjugation("Spanish", "qa-failure", {
          fetch: () => {
            failures++;
            throw Error("Synthetic synchronous failure");
          },
        })
      ).data,
      null,
    );
  assert.equal(failures, 2);
});

test("profile-derived seeds stay owned and cannot replace a richer existing table or enter the authored catalog", () => {
  const f = fixture(),
    a = f.owner("A"),
    profile = {
      phase1: {
        presentYo: { full: "yo qa" },
        presentTu: { full: "tu qa" },
        presentEl: { full: "el qa" },
      },
      phase2: {
        presentNosotros: { full: "nosotros qa" },
        presentEllos: { full: "ellos qa" },
        gerund: { full: "qa gerund" },
        pastParticiple: { full: "qa participle" },
      },
      phase3: {},
    };
  assert.ok(a.seedFromVerbProfile("Spanish", "qa-profile", profile).data);
  assert.equal(isInCatalog("Spanish", "qa-profile"), false);
  f.actor = "B";
  assert.equal(f.owner("B").getCachedConjugation("Spanish", "qa-profile"), undefined);
  f.actor = "A";
  a.putUserConjugation("Spanish", table("qa-profile", "richer"));
  assert.equal(
    a.seedFromVerbProfile("Spanish", "qa-profile", profile).data.perfectExample,
    "richer",
  );
});

test("hydration waits for the owning subtree and rejects identity lost during a read; wrong store kinds fail before IO", () => {
  const f = fixture();
  f.owner("A").putUserConjugation("Spanish", table());
  let current = false;
  const store = createLearnerDeviceStore({
    kind: "conjugationTables",
    actor: "A",
    storage: f.storage,
    isCurrent: () => current,
  });
  const cache = createOwnedConjugationCache({ store, isCurrent: () => current });
  assert.equal(cache.getCachedConjugation("Spanish", "qa-novel"), undefined);
  current = true;
  assert.ok(cache.getCachedConjugation("Spanish", "qa-novel"));
  const losing = createOwnedConjugationCache({
    store: {
      ...store,
      read() {
        const value = store.read();
        current = false;
        return value;
      },
    },
    isCurrent: () => current,
  });
  assert.equal(losing.getCachedConjugation("Spanish", "qa-novel"), undefined);
  const other = createLearnerDeviceStore({
    kind: "notes",
    actor: "A",
    storage: f.storage,
    isCurrent: () => true,
  });
  assert.throws(
    () => createOwnedConjugationCache({ store: other, isCurrent: () => true }),
    /owned conjugationTables/,
  );
  assert.throws(() => {
    other.kind = "conjugationTables";
  }, TypeError);
});
