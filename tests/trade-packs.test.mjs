import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  WORD_MATCH_PACK_RULES,
  loadTradePack,
  loadedTradePack,
  packBoardFor,
  parseTradePack,
  pickPackBoard,
  prefetchTradePack,
  resetTradePacksForTests,
  tradePackPath,
  validateWordMatchSection,
} from "../src/lib/trade-packs.ts";
import {
  checkWordMatchBoard,
  wordMatchCefr,
  wordMatchPairCount,
} from "../src/lib/word-match-core.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/** A valid board for a level; `tag` makes every word unique to it. */
function board(level, tag, topic = `topic ${tag}`) {
  return {
    topic,
    cefr: wordMatchCefr(level),
    pairs: Array.from({ length: wordMatchPairCount(level) }, (_, i) => ({
      target: `palabra ${tag} ${i}`,
      english: `word ${tag} ${i}`,
    })),
  };
}
const packBoard = (level, tag, topic) => ({ level, ...board(level, tag, topic) });

function packFile(boards, overrides = {}) {
  return {
    version: 1,
    module: "roofing",
    language: "Spanish",
    nativeLanguage: "English",
    reviewed: false,
    wordMatch: { boards },
    ...overrides,
  };
}

/** Replaces global fetch for one test; `handler(url)` returns a Response or throws. */
async function withFetch(handler, run) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return handler(String(url));
  };
  resetTradePacksForTests();
  try {
    await run(calls);
  } finally {
    globalThis.fetch = original;
    resetTradePacksForTests();
  }
}
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });

// ─── Validator ───────────────────────────────────────────────────────────────

test("a board needs 6 / 8 / 10 pairs and the matching CEFR level", () => {
  for (const [level, count, cefr] of [
    [1, 6, "A2"],
    [2, 8, "B1"],
    [3, 10, "B2"],
  ]) {
    assert.equal(wordMatchPairCount(level), count);
    assert.equal(wordMatchCefr(level), cefr);
    assert.equal(checkWordMatchBoard(board(level, "a"), level).ok, true);
    const short = board(level, "b");
    short.pairs.pop();
    const result = checkWordMatchBoard(short, level);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "incomplete");
  }
  // 8 pairs is not a level 1 board, and a B1 label is not a level 1 board either
  assert.equal(checkWordMatchBoard(board(2, "c"), 1).ok, false);
  assert.equal(checkWordMatchBoard({ ...board(1, "d"), cefr: "B1" }, 1).ok, false);
});

test("board text is trimmed and held to its length limits", () => {
  const padded = board(1, "e");
  padded.topic = "  roof deck  ";
  padded.pairs[0] = { target: "  teja  ", english: "  shingle " };
  const ok = checkWordMatchBoard(padded, 1);
  assert.equal(ok.ok, true);
  assert.equal(ok.board.topic, "roof deck");
  assert.deepEqual(ok.board.pairs[0], { target: "teja", english: "shingle" });

  const cases = [
    (b) => (b.pairs[0].target = "x".repeat(81)),
    (b) => (b.pairs[0].english = "x".repeat(161)),
    (b) => (b.topic = "x".repeat(81)),
    (b) => (b.pairs[0].target = "   "),
    (b) => (b.topic = ""),
    (b) => (b.pairs[0].english = 7),
  ];
  for (const mutate of cases) {
    const bad = board(1, "f");
    mutate(bad);
    assert.equal(checkWordMatchBoard(bad, 1).ok, false);
  }
  assert.equal(checkWordMatchBoard(null, 1).ok, false);
  assert.equal(checkWordMatchBoard({ ...board(1, "g"), pairs: "no" }, 1).ok, false);
});

test("targets and English meanings must be unique under NFC and lower case", () => {
  const sameTarget = board(1, "h");
  sameTarget.pairs[1].target = sameTarget.pairs[0].target.toUpperCase();
  const a = checkWordMatchBoard(sameTarget, 1);
  assert.equal(a.ok, false);
  assert.equal(a.reason, "duplicates");

  // "café" typed as e + combining acute equals the single-character form
  const composed = board(1, "i");
  composed.pairs[0].target = "café";
  composed.pairs[1].target = "café";
  assert.equal(checkWordMatchBoard(composed, 1).reason, "duplicates");

  const sameEnglish = board(1, "j");
  sameEnglish.pairs[2].english = ` ${sameEnglish.pairs[0].english.toUpperCase()}`;
  assert.equal(checkWordMatchBoard(sameEnglish, 1).reason, "duplicates");
});

test("a section needs enough boards per level, one topic each, and little target reuse", () => {
  const min = WORD_MATCH_PACK_RULES.minBoardsPerLevel;
  const full = [];
  for (const level of [1, 2, 3])
    for (let i = 0; i < min; i++) full.push(packBoard(level, `L${level}-${i}`));
  assert.deepEqual(validateWordMatchSection(full), []);

  assert.match(validateWordMatchSection(full.slice(1)).join("\n"), /level 1 has 11 valid boards/);

  const sameTopic = structuredClone(full);
  sameTopic[1].topic = sameTopic[0].topic.toUpperCase();
  assert.match(validateWordMatchSection(sameTopic).join("\n"), /topic .* is used by two boards/);

  // a target on a third board is too much reuse; two boards is allowed
  const reuse = structuredClone(full);
  reuse[1].pairs[0].target = reuse[0].pairs[0].target;
  assert.deepEqual(validateWordMatchSection(reuse), []);
  reuse[2].pairs[0].target = reuse[0].pairs[0].target;
  assert.match(validateWordMatchSection(reuse).join("\n"), /appears on 3 boards/);

  const invalid = structuredClone(full);
  invalid[0].pairs.pop();
  assert.match(validateWordMatchSection(invalid).join("\n"), /board 1 \(level 1\)/);
  assert.match(
    validateWordMatchSection([{ ...full[0], level: 4 }]).join("\n"),
    /level must be 1, 2 or 3/,
  );
});

// ─── Parser ──────────────────────────────────────────────────────────────────

test("the runtime parser drops invalid boards and keeps the rest", () => {
  const broken = packBoard(1, "broken");
  broken.pairs.pop();
  const raw = packFile([
    packBoard(1, "ok1"),
    broken,
    packBoard(2, "ok2"),
    { ...packBoard(3, "nolevel"), level: 9 },
    "nope",
  ]);
  const file = parseTradePack(raw, { moduleId: "roofing", language: "Spanish" });
  assert.deepEqual(
    file.wordMatch.boards.map((item) => item.topic),
    ["topic ok1", "topic ok2"],
  );
  assert.equal(file.nativeLanguage, "English");
  assert.equal(file.reviewed, false);
});

test("the parser refuses a pack for another module, language or version, and an empty one", () => {
  const raw = packFile([packBoard(1, "x")]);
  const expected = { moduleId: "roofing", language: "Spanish" };
  assert.ok(parseTradePack(raw, expected));
  assert.equal(parseTradePack({ ...raw, version: 2 }, expected), null);
  assert.equal(parseTradePack({ ...raw, module: "gutters" }, expected), null);
  assert.equal(parseTradePack({ ...raw, language: "French" }, expected), null);
  assert.equal(parseTradePack({ ...raw, nativeLanguage: "" }, expected), null);
  assert.equal(parseTradePack(packFile([]), expected), null);
  assert.equal(parseTradePack({ ...raw, wordMatch: undefined }, expected), null);
  assert.equal(parseTradePack("text", expected), null);
  assert.equal(parseTradePack(null, expected), null);
});

test("pack paths use the language tag and the module id", () => {
  assert.equal(tradePackPath("roofing", "Spanish"), "/trade-packs/es/roofing.json");
  assert.equal(tradePackPath("master-roofing", "Spanish"), "/trade-packs/es/master-roofing.json");
});

// ─── Picker ──────────────────────────────────────────────────────────────────

const POOL = [
  packBoard(1, "a1", "tools"),
  packBoard(1, "a2", "safety"),
  packBoard(1, "a3", "materials"),
  packBoard(2, "b1", "steps"),
  packBoard(3, "c1", "failures"),
];

test("pickPackBoard returns a board of the asked level, without the level field", async () => {
  await withFetch(
    () => json(packFile(POOL)),
    async () => {
      await loadTradePack("roofing", "Spanish");
      for (const level of [1, 2, 3]) {
        for (let i = 0; i < 20; i++) {
          const picked = pickPackBoard({ moduleId: "roofing", language: "Spanish", level });
          assert.equal(picked.pairs.length, wordMatchPairCount(level));
          assert.equal(picked.cefr, wordMatchCefr(level));
          assert.equal("level" in picked, false);
        }
      }
      // the random source picks among the eligible boards
      const topics = (random) =>
        pickPackBoard({ moduleId: "roofing", language: "Spanish", level: 1, random }).topic;
      assert.equal(
        topics(() => 0),
        "tools",
      );
      assert.equal(
        topics(() => 0.5),
        "safety",
      );
      assert.equal(
        topics(() => 0.999),
        "materials",
      );
    },
  );
});

test("pickPackBoard honors avoid, case and accent insensitively, and returns null when nothing is eligible", async () => {
  await withFetch(
    () => json(packFile(POOL)),
    async () => {
      await loadTradePack("roofing", "Spanish");
      const pick = (avoid, level = 1) =>
        pickPackBoard({ moduleId: "roofing", language: "Spanish", level, avoid });
      for (let i = 0; i < 30; i++) {
        assert.notEqual(pick(["Tools", "SAFETY"]).topic, "tools");
        assert.notEqual(pick(["Tools", "SAFETY"]).topic, "safety");
      }
      assert.equal(pick(["tools", "safety"]).topic, "materials");
      assert.equal(pick(["tools", "safety", "materials"]), null);
      assert.equal(pick(["steps"], 2), null);
      assert.equal(pick(undefined, 2).topic, "steps");
      assert.equal(pick([], 3).topic, "failures");
    },
  );
});

test("pickPackBoard returns null with no pack, no module or a different native language", async () => {
  await withFetch(
    () => json(packFile(POOL)),
    async () => {
      assert.equal(
        pickPackBoard({ moduleId: "roofing", language: "Spanish", level: 1 }),
        null,
        "not loaded yet",
      );
      await loadTradePack("roofing", "Spanish");
      assert.equal(pickPackBoard({ moduleId: null, language: "Spanish", level: 1 }), null);
      assert.equal(pickPackBoard({ moduleId: "gutters", language: "Spanish", level: 1 }), null);
      assert.equal(pickPackBoard({ moduleId: "roofing", language: "French", level: 1 }), null);
      assert.ok(
        pickPackBoard({
          moduleId: "roofing",
          language: "Spanish",
          level: 1,
          nativeLanguage: "English",
        }),
      );
      assert.equal(
        pickPackBoard({
          moduleId: "roofing",
          language: "Spanish",
          level: 1,
          nativeLanguage: "French",
        }),
        null,
      );
    },
  );
});

test("a picked board is a copy: changing it does not change the pack", async () => {
  await withFetch(
    () => json(packFile([packBoard(1, "only", "solo")])),
    async () => {
      await loadTradePack("roofing", "Spanish");
      const first = pickPackBoard({ moduleId: "roofing", language: "Spanish", level: 1 });
      first.pairs[0].target = "changed";
      first.topic = "changed";
      const second = pickPackBoard({ moduleId: "roofing", language: "Spanish", level: 1 });
      assert.equal(second.topic, "solo");
      assert.notEqual(second.pairs[0].target, "changed");
    },
  );
});

// ─── Loader ──────────────────────────────────────────────────────────────────

test("a 404 is remembered as no pack and not asked again", async () => {
  await withFetch(
    () => new Response("", { status: 404 }),
    async (calls) => {
      assert.equal(loadedTradePack("roofing", "Spanish"), undefined);
      assert.equal(await loadTradePack("roofing", "Spanish"), null);
      assert.equal(loadedTradePack("roofing", "Spanish"), null);
      assert.equal(await loadTradePack("roofing", "Spanish"), null);
      assert.deepEqual(calls, ["/trade-packs/es/roofing.json"]);
      assert.equal(
        await packBoardFor({ moduleId: "roofing", language: "Spanish", level: 1 }),
        null,
      );
      assert.equal(calls.length, 1);
    },
  );
});

test("a page that is not JSON (dev server fallback) is remembered as no pack", async () => {
  await withFetch(
    () => new Response("<!doctype html><title>app</title>", { status: 200 }),
    async (calls) => {
      assert.equal(await loadTradePack("roofing", "Spanish"), null);
      assert.equal(loadedTradePack("roofing", "Spanish"), null);
      await loadTradePack("roofing", "Spanish");
      assert.equal(calls.length, 1);
    },
  );
});

test("a network failure is not remembered, so a later call can retry", async () => {
  let fail = true;
  await withFetch(
    () => {
      if (fail) throw new TypeError("offline");
      return json(packFile(POOL));
    },
    async (calls) => {
      assert.equal(await loadTradePack("roofing", "Spanish"), null);
      assert.equal(loadedTradePack("roofing", "Spanish"), undefined);
      fail = false;
      assert.ok(await loadTradePack("roofing", "Spanish"));
      assert.equal(calls.length, 2);
    },
  );
});

test("concurrent loads share one request and packBoardFor waits for it", async () => {
  await withFetch(
    () => json(packFile(POOL)),
    async (calls) => {
      const [a, b] = await Promise.all([
        loadTradePack("roofing", "Spanish"),
        loadTradePack("roofing", "Spanish"),
      ]);
      assert.equal(a, b);
      assert.equal(calls.length, 1);
    },
  );
  await withFetch(
    () => json(packFile(POOL)),
    async (calls) => {
      prefetchTradePack("roofing", "Spanish", "English");
      const picked = await packBoardFor({
        moduleId: "roofing",
        language: "Spanish",
        nativeLanguage: "English",
        level: 2,
      });
      assert.equal(picked.topic, "steps");
      assert.equal(calls.length, 1);
    },
  );
});

test("prefetch and packBoardFor skip a pairing the packs are not written for", async () => {
  await withFetch(
    () => json(packFile(POOL)),
    async (calls) => {
      prefetchTradePack("roofing", "Spanish", "French");
      prefetchTradePack(null, "Spanish", "English");
      assert.equal(
        await packBoardFor({
          moduleId: "roofing",
          language: "Spanish",
          nativeLanguage: "French",
          level: 1,
        }),
        null,
      );
      assert.equal(calls.length, 0);
    },
  );
});

// ─── Hosting: service worker and Vercel routes ───────────────────────────────

test("the service worker serves /trade-packs/ JSON stale-while-revalidate", () => {
  const sw = read("public/sw.js");
  const clause = sw.slice(
    sw.indexOf("// Pre-built lesson word decks"),
    sw.indexOf("// Cache-first for content-hashed"),
  );
  assert.match(clause, /startsWith\("\/trade-packs\/"\)/);
  assert.match(clause, /startsWith\("\/lesson-content\/"\)/);
  assert.match(clause, /endsWith\("\.json"\)/);
  assert.match(clause, /storePublicResponse/);
  const cache = /const CACHE = "lt-v(\d+)"/.exec(sw);
  assert.ok(Number(cache[1]) >= 19, "CACHE was bumped when /trade-packs/ was added");
});

test("the Vercel adapter routes /trade-packs/ with the lesson-content cache headers, before the catch-all", () => {
  const adapter = read("scripts/vercel-adapter.mjs");
  const route = (src) => {
    const at = adapter.indexOf(`src: "${src}"`);
    assert.ok(at > 0, `route ${src} exists`);
    return { at, text: adapter.slice(at, adapter.indexOf("dest:", at) + 60) };
  };
  const packs = route("/trade-packs/(.*)");
  const content = route("/lesson-content/(.*)");
  const header = /headers: \{ "cache-control": "([^"]+)" \}/;
  assert.equal(header.exec(packs.text)[1], header.exec(content.text)[1]);
  assert.match(packs.text, /dest: "\/trade-packs\/\$1"/);
  assert.ok(packs.at < adapter.indexOf('{ src: "/(.*)", dest: "/" }'), "before the catch-all");
});

// ─── The shipped roofing pack ────────────────────────────────────────────────

test("the shipped roofing pack passes every rule and is listed in the index", () => {
  const text = read("public/trade-packs/es/roofing.json");
  const raw = JSON.parse(text);
  assert.deepEqual(validateWordMatchSection(raw.wordMatch.boards), []);
  const file = parseTradePack(raw, { moduleId: "roofing", language: "Spanish" });
  assert.equal(
    file.wordMatch.boards.length,
    raw.wordMatch.boards.length,
    "the parser keeps every board",
  );
  for (const level of [1, 2, 3]) {
    const count = file.wordMatch.boards.filter((item) => item.level === level).length;
    assert.ok(
      count >= WORD_MATCH_PACK_RULES.minBoardsPerLevel,
      `level ${level} has ${count} boards`,
    );
  }
  assert.equal(raw.nativeLanguage, "English");
  assert.equal(raw.reviewed, false);

  const index = JSON.parse(read("public/trade-packs/index.json"));
  const entry = index.packs.find(
    (item) => item.module === "roofing" && item.language === "Spanish",
  );
  assert.ok(entry);
  assert.equal(entry.path, tradePackPath("roofing", "Spanish"));
  assert.equal(entry.bytes, Buffer.byteLength(text));
  assert.deepEqual(entry.areas, ["wordMatch"]);
});
