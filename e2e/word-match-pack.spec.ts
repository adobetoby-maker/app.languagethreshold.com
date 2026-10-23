// Built by TAC — 2026-10-23
import { readFileSync } from "node:fs";
import { expect, test, type Page, type Request } from "@playwright/test";
import { appUrl, seedAppState } from "./app-state.ts";

// Word Match reads the selected module's trade pack first (public/trade-packs/es/<module>.json)
// and calls the live AI only when the pack has nothing. These tests identify the server function
// by the name encoded in the dev-server URL, so they only run against a local dev server.
const REMOTE = /^https?:\/\/(?!localhost|127\.0\.0\.1)/.test(process.env.E2E_BASE_URL ?? "");
test.skip(REMOTE, "server functions are named only on a dev server");

type Json = null | undefined | string | number | Json[] | { [k: string]: Json };

// TanStack server-function wire format, as in grammar-quiz.spec.ts.
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

const isWordMatchCall = (request: Request) =>
  request.method() === "POST" && serverFnName(request.url()) === "generateWordMatchBoard";

interface PackBoard {
  level: 1 | 2 | 3;
  cefr: string;
  topic: string;
  pairs: { target: string; english: string }[];
}
const roofingPack = JSON.parse(readFileSync("public/trade-packs/es/roofing.json", "utf8")) as {
  wordMatch: { boards: PackBoard[] };
};
const packBoards = roofingPack.wordMatch.boards;

const MOCK_BOARD = {
  topic: "mock live topic",
  cefr: "A2",
  pairs: ["uno", "dos", "tres", "cuatro", "cinco", "seis"].map((target, i) => ({
    target,
    english: `number ${i + 1}`,
  })),
};

/** Opens the Word Match lobby for a module, retrying the seed like the other specs do. */
async function openWordMatch(page: Page, module: string): Promise<void> {
  await page.goto("/");
  const title = page.getByRole("heading", { name: "Memory matching" });
  for (let attempt = 0; attempt < 3; attempt++) {
    await seedAppState(page, {
      activeModuleId: module,
      selectedLanguage: "Spanish",
      currentTab: "wordMatch",
      onboardingComplete: true,
    });
    await page.evaluate(() => localStorage.setItem("lt.languageChosen", "1"));
    await page.goto(appUrl({ tab: "wordMatch", module }));
    await title.waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 }).catch(() => undefined);
    if (await title.isVisible()) break;
  }
  await expect(title).toBeVisible({ timeout: 60_000 });
}

async function startLevel(page: Page, level: 1 | 2 | 3): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^Level ${level}`) }).click();
  await page.getByRole("button", { name: /Start Game/ }).click();
}

const topicPill = (page: Page) => page.getByText(/^topic:/);
// The pill shows the topic in capitals (CSS), so compare in lower case.
const topicOf = async (page: Page) =>
  (await topicPill(page).innerText())
    .replace(/^topic:\s*/i, "")
    .trim()
    .toLowerCase();
const cards = (page: Page) => page.getByRole("button", { name: "Hidden card" });

test("with roofing selected the board comes from the pack and no live AI call is made", async ({
  page,
}) => {
  const liveCalls: string[] = [];
  page.on("request", (request) => {
    if (isWordMatchCall(request)) liveCalls.push(request.url());
  });
  const packRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/trade-packs/")) packRequests.push(new URL(request.url()).pathname);
  });

  await openWordMatch(page, "roofing");
  await expect.poll(() => packRequests).toContain("/trade-packs/es/roofing.json");

  for (const [level, cardCount] of [
    [1, 12],
    [2, 16],
    [3, 20],
  ] as const) {
    await startLevel(page, level);
    await expect(cards(page)).toHaveCount(cardCount);
    const topic = await topicOf(page);
    const fromPack = packBoards.find((board) => board.level === level && board.topic === topic);
    expect(fromPack, `topic "${topic}" at level ${level} is a roofing pack board`).toBeTruthy();
    expect(fromPack!.pairs).toHaveLength(cardCount / 2);
    await page.getByRole("button", { name: "Quit game" }).click();
    await expect(page.getByRole("heading", { name: "Memory matching" })).toBeVisible();
  }
  expect(liveCalls, "no generateWordMatchBoard server call").toEqual([]);
});

test("back-to-back games draw different pack boards and never call the live AI", async ({
  page,
}) => {
  const liveCalls: string[] = [];
  page.on("request", (request) => {
    if (isWordMatchCall(request)) liveCalls.push(request.url());
  });
  await openWordMatch(page, "roofing");

  const seen: string[] = [];
  for (let game = 0; game < 4; game++) {
    await startLevel(page, 1);
    await expect(cards(page)).toHaveCount(12);
    const topic = await topicOf(page);
    // The game remembers the last topics it showed and asks the pack to skip them.
    expect(seen).not.toContain(topic);
    seen.push(topic);
    await page.getByRole("button", { name: "Quit game" }).click();
    await expect(page.getByRole("heading", { name: "Memory matching" })).toBeVisible();
  }
  expect(liveCalls).toEqual([]);
});

test("a module without a pack still calls the live AI", async ({ page }) => {
  const liveCalls: string[] = [];
  await page.route("**/_serverFn/**", async (route) => {
    if (serverFnName(route.request().url()) !== "generateWordMatchBoard") return route.continue();
    liveCalls.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "x-tss-serialized": "true" },
      body: encode({ data: MOCK_BOARD, error: null }),
    });
  });

  await openWordMatch(page, "construction-foreman");
  await startLevel(page, 1);
  await expect(cards(page)).toHaveCount(12);
  await expect(topicPill(page)).toContainText("mock live topic");
  expect(liveCalls).toHaveLength(1);
});

test.describe("without the service worker", () => {
  // page.route does not see requests a service worker makes, so block it for this test.
  test.use({ serviceWorkers: "block" });

  test("when the pack cannot be loaded the live AI is the fallback, even for roofing", async ({
    page,
  }) => {
    const liveCalls: string[] = [];
    await page.route("**/trade-packs/**", (route) => route.fulfill({ status: 404, body: "" }));
    await page.route("**/_serverFn/**", async (route) => {
      if (serverFnName(route.request().url()) !== "generateWordMatchBoard") return route.continue();
      liveCalls.push(route.request().url());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "x-tss-serialized": "true" },
        body: encode({ data: MOCK_BOARD, error: null }),
      });
    });

    await openWordMatch(page, "roofing");
    await startLevel(page, 1);
    await expect(cards(page)).toHaveCount(12);
    await expect(topicPill(page)).toContainText("mock live topic");
    expect(liveCalls).toHaveLength(1);
  });
});
