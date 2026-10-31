import test from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { loadModule } from "./helpers/bundle.mjs";

test("core/module packs preserve authored content and stay within the selected language", async () => {
  const [{ ALL_SEEDS }, { planLibraryPacks }, { LIBRARY_PACK_LOADERS }] = await Promise.all([
    loadModule("src/data/all-seeds.ts"),
    loadModule("src/data/library-pack-plan.ts"),
    loadModule("src/data/library-pack-loaders.ts"),
  ]);
  const plan = planLibraryPacks(ALL_SEEDS);
  const loadedIds = new Set();
  const normalize = (entries) =>
    JSON.parse(JSON.stringify(entries)).sort((a, b) => a.id.localeCompare(b.id));
  for (const language of new Set(ALL_SEEDS.map((e) => e.language))) {
    for (const [id, entries] of Object.entries({ core: plan.core, ...plan.modules })) {
      const pack = await LIBRARY_PACK_LOADERS[`${language}/${id}`]();
      assert.deepEqual(
        normalize(pack),
        normalize(entries.filter((e) => e.language === language)),
        `${language}/${id}`,
      );
      pack.forEach((e) => loadedIds.add(e.id));
    }
    assert.ok(
      (await LIBRARY_PACK_LOADERS[`${language}/core`]()).some((e) => e.available),
      `${language} needs usable core reading`,
    );
  }
  assert.equal(
    loadedIds.size,
    new Set(ALL_SEEDS.map((e) => e.id)).size,
    "no authored reading disappears",
  );
  const spanishCore = await LIBRARY_PACK_LOADERS["Spanish/core"]();
  const nursing = await LIBRARY_PACK_LOADERS["Spanish/nursing"]();
  assert.ok(
    !nursing.some((e) => e.id === "seed-es-ortho-fracture"),
    "explicit orthopedic reading must not load for nursing",
  );
  assert.ok(
    gzipSync(JSON.stringify([...spanishCore, ...nursing])).length <
      0.25 * gzipSync(JSON.stringify(ALL_SEEDS)).length,
  );
});

test("new modules accumulate, deduplicate, and language switches remove other-language seeds", async () => {
  const { appendLanguageSeeds } = await loadModule("src/lib/library-seed-set.ts");
  const core = { id: "core", language: "Spanish", section: "culture" };
  const nurse = { id: "nurse", language: "Spanish", section: "culture" };
  const roof = { id: "roof", language: "Spanish", section: "culture" };
  const custom = { id: "own", language: "German", section: "custom" };
  let entries = appendLanguageSeeds([custom], [core, nurse], "Spanish");
  entries = appendLanguageSeeds(entries, [core, roof, roof], "Spanish");
  assert.deepEqual(entries, [custom, core, nurse, roof]);
  assert.deepEqual(appendLanguageSeeds(entries, [core, roof], "Spanish"), entries);
  const french = { id: "bonjour", language: "French", section: "culture" };
  assert.deepEqual(appendLanguageSeeds(entries, [french, roof], "French"), [custom, french]);
});

test("pack requests deduplicate concurrent loads, retain successful results and retry failures", async () => {
  const { createLibraryPackCache } = await loadModule("src/lib/library-pack-cache.ts");
  let calls = 0;
  const entries = [{ id: "saved-reading" }];
  const load = createLibraryPackCache({
    Spanish: async () => {
      calls++;
      if (calls === 1) throw new Error("offline");
      return entries;
    },
  });
  const first = load("Spanish");
  assert.equal(load("Spanish"), first);
  await assert.rejects(first, /offline/);
  assert.deepEqual(await Promise.all([load("Spanish"), load("Spanish")]), [entries, entries]);
  assert.equal(await load("Spanish"), entries);
  assert.equal(calls, 2);
  assert.deepEqual(await load("Unknown"), []);
});
