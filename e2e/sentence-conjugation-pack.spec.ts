// Built by TAC — 2026-10-23
import { readFileSync } from "node:fs";
import { expect, test, type Page, type Request } from "@playwright/test";
import { appUrl, seedAppState } from "./app-state.ts";

// Sentence Builder and Conjugation read the selected module's trade pack first
// (public/trade-packs/es/<module>.json) and call the live AI only when the pack has nothing.
// The server functions are identified by the name encoded in the dev-server URL, so these tests
// only run against a local dev server.
const REMOTE = /^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(process.env.E2E_BASE_URL ?? "");
test.skip(REMOTE, "server functions are named only on a dev server");

type Json = null | undefined | string | number | Json[] | { [k: string]: Json };

// TanStack server-function wire format, as in word-match-pack.spec.ts.
function encode(root: Json): string {
  let nextId = 0;
  const enc = (v: Json): unknown => {
    if (v === null) return { t: 2, s: 0 };
    if (v === undefined) return { t: 2, s: 1 };
    if (typeof v === "string") return { t: 1, s: v };
    if (typeof v === "number") return { t: 0, s: v };
    if (Array.isArray(v)) return { t: 9, i: ++nextId, a: v.map(enc), o: 0 };
    const keys = Object.keys(v);
    return { t: 10, i: ++nextId, p: { k: keys, v: keys.map((k) => enc(v[k])) }, o: 0 };
  };
  return JSON.stringify({
    t: 10,
    i: 0,
    p: {
      k: ["result", "error", "context"],
      v: [enc(root), { t: 2, s: 1 }, { t: 11, i: 9999, p: { k: [], v: [] }, o: 0 }],
    },
    o: 0,
  });
}

function serverFnName(url: string) {
  const id = url.match(/\/_serverFn\/([^?/]+)/)?.[1];
  if (!id) return null;
  try {
    const decoded = JSON.parse(Buffer.from(id, "base64url").toString()) as { export?: string };
    return decoded.export?.replace(/_createServerFn_handler$/, "") ?? null;
  } catch {
    return null;
  }
}

const SENTENCE_FN = "generateSentenceBuilder";
const CONJUGATION_FN = "generateConjugationQuestion";
const isCall = (name: string) => (request: Request) =>
  request.method() === "POST" && serverFnName(request.url()) === name;

interface PackSentence {
  level: number;
  targetSentence: string;
  englishTranslation: string;
  tokens: string[];
}
interface PackQuestion {
  level: number;
  phrase: string;
  phraseTranslation: string;
  infinitive: string;
  axisTested: string;
}
const roofing = JSON.parse(readFileSync("public/trade-packs/es/roofing.json", "utf8")) as {
  sentenceBuild: { items: PackSentence[] };
  conjugation: { items: PackQuestion[] };
};

const MOCK_SENTENCE = {
  targetSentence: "Mock live sentence here.",
  englishTranslation: "A mock live sentence.",
  tokens: ["Mock", "live", "sentence", "here."],
  scrambled: ["here.", "sentence", "Mock", "live"],
  topic: "mock",
  cefr: "A2",
  explanation: "Mock explanation.",
};
const MOCK_QUESTION = {
  phrase: "Yo ___ la mock live.",
  phraseTranslation: "I [verb] the mock live question.",
  infinitive: "mockear",
  infinitiveTranslation: "to mock",
  correctConjugation: "mockeo",
  wrongOptions: ["mockeas", "mockea", "mockean"],
  explanation: "Mock explanation.",
  axisTested: "person",
  cefr: "A2",
};

async function openTab(page: Page, tab: string, module: string, heading: string): Promise<void> {
  await page.goto("/");
  const title = page.getByRole("heading", { name: heading });
  for (let attempt = 0; attempt < 3; attempt++) {
    await seedAppState(page, {
      activeModuleId: module,
      selectedLanguage: "Spanish",
      currentTab: tab,
      onboardingComplete: true,
    });
    await page.evaluate(() => localStorage.setItem("lt.languageChosen", "1"));
    await page.goto(appUrl({ tab, module }));
    await title.waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 }).catch(() => undefined);
    if (await title.isVisible()) break;
  }
  await expect(title).toBeVisible({ timeout: 60_000 });
}

async function startRun(page: Page, level: 1 | 2 | 3): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^Level ${level}`) }).click();
  await page.getByRole("button", { name: /Start Run/ }).click();
}

/** Answers the current Sentence Builder question (by tapping the tokens in order) and goes on. */
async function solveSentence(page: Page, item: PackSentence): Promise<void> {
  for (const token of item.tokens) {
    // The pool shows each remaining token once per occurrence; tap the first matching one.
    await page.getByRole("button", { name: token, exact: true }).last().click();
  }
  await page.getByRole("button", { name: "Check Sentence" }).click();
  await page.getByRole("button", { name: /^Next/ }).click();
}

test("Sentence Builder with roofing selected takes its questions from the pack, no live call", async ({
  page,
}) => {
  const liveCalls: string[] = [];
  page.on("request", (request) => {
    if (isCall(SENTENCE_FN)(request)) liveCalls.push(request.url());
  });
  await openTab(page, "sentenceBuild", "roofing", "Order the words");
  await startRun(page, 2);

  const seen: string[] = [];
  for (let n = 0; n < 3; n++) {
    await expect(page.getByText(new RegExp(`^Sentence ${n + 1} / 5`))).toBeVisible();
    await expect(page.getByRole("button", { name: "Check Sentence" })).toBeVisible();
    const english = await page.locator("p.font-display").first().innerText();
    const item = roofing.sentenceBuild.items.find(
      (i) => i.level === 2 && i.englishTranslation === english.trim(),
    );
    expect(item, `"${english}" is a level 2 roofing pack sentence`).toBeTruthy();
    expect(seen, "the run never repeats a sentence").not.toContain(item!.targetSentence);
    seen.push(item!.targetSentence);
    await solveSentence(page, item!);
  }
  expect(liveCalls, "no generateSentenceBuilder server call").toEqual([]);
});

test("Conjugation with roofing selected takes its questions from the pack, no live call", async ({
  page,
}) => {
  const liveCalls: string[] = [];
  page.on("request", (request) => {
    if (isCall(CONJUGATION_FN)(request)) liveCalls.push(request.url());
  });
  await openTab(page, "conjugation", "roofing", "Pick the right form");
  await startRun(page, 1);

  const infinitives: string[] = [];
  for (let n = 0; n < 3; n++) {
    await expect(page.getByText(new RegExp(`^Question ${n + 1} / 5`))).toBeVisible();
    const translation = page.locator("p.italic").first();
    await expect(translation).toBeVisible();
    const text = (await translation.innerText()).trim();
    const item = roofing.conjugation.items.find(
      (i) => i.level === 1 && i.phraseTranslation === text,
    );
    expect(item, `"${text}" is a level 1 roofing pack question`).toBeTruthy();
    expect(["tense", "person", "number"]).toContain(item!.axisTested);
    await expect(page.getByText(`axis: ${item!.axisTested}`)).toBeVisible();
    expect(infinitives, "the run avoids a verb it already asked about").not.toContain(
      item!.infinitive,
    );
    infinitives.push(item!.infinitive);
    // answer anything, then go on
    await page.locator("div.grid button").first().click();
    await page.getByRole("button", { name: /^Next/ }).click();
  }
  expect(liveCalls, "no generateConjugationQuestion server call").toEqual([]);
});

/** Answers both live server functions with a mock and counts the calls. */
async function mockLive(page: Page) {
  const calls: Record<string, number> = { [SENTENCE_FN]: 0, [CONJUGATION_FN]: 0 };
  await page.route("**/_serverFn/**", async (route) => {
    const name = serverFnName(route.request().url());
    if (name !== SENTENCE_FN && name !== CONJUGATION_FN) return route.continue();
    calls[name]++;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "x-tss-serialized": "true" },
      body: encode({ data: name === SENTENCE_FN ? MOCK_SENTENCE : MOCK_QUESTION, error: null }),
    });
  });
  return calls;
}

test("a module without a pack still calls the live AI in both games", async ({ page }) => {
  const calls = await mockLive(page);
  await openTab(page, "sentenceBuild", "construction-foreman", "Order the words");
  await startRun(page, 1);
  await expect(page.getByText(MOCK_SENTENCE.englishTranslation)).toBeVisible();
  expect(calls[SENTENCE_FN]).toBe(1);

  await openTab(page, "conjugation", "construction-foreman", "Pick the right form");
  await startRun(page, 1);
  await expect(page.getByText(MOCK_QUESTION.phraseTranslation)).toBeVisible();
  expect(calls[CONJUGATION_FN]).toBe(1);
});

test.describe("without the service worker", () => {
  // page.route does not see requests a service worker makes, so block it for this test.
  test.use({ serviceWorkers: "block" });

  test("when the pack cannot be loaded both games fall back to the live AI, even for roofing", async ({
    page,
  }) => {
    await page.route("**/trade-packs/**", (route) => route.fulfill({ status: 404, body: "" }));
    const calls = await mockLive(page);
    await openTab(page, "sentenceBuild", "roofing", "Order the words");
    await startRun(page, 1);
    await expect(page.getByText(MOCK_SENTENCE.englishTranslation)).toBeVisible();
    expect(calls[SENTENCE_FN]).toBe(1);

    await openTab(page, "conjugation", "roofing", "Pick the right form");
    await startRun(page, 1);
    await expect(page.getByText(MOCK_QUESTION.phraseTranslation)).toBeVisible();
    expect(calls[CONJUGATION_FN]).toBe(1);
  });
});
