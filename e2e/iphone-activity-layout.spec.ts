import { expect, test, type Page } from "@playwright/test";
import { appUrl, readAppState } from "./app-state";
import { mkdirSync } from "node:fs";

// Layout fixtures use network responses directly, without a cached app shell.
test.use({ serviceWorkers: "block" });

const proof = process.env.LT_PHONE_REVIEW_DIR ?? "test-results/iphone-cleanup";
type Json = string | number | null | undefined | Json[] | { [key: string]: Json };
function encode(root: Json) {
  let id = 0;
  const enc = (v: Json): unknown =>
    v === null
      ? { t: 2, s: 0 }
      : v === undefined
        ? { t: 2, s: 1 }
        : typeof v === "string"
          ? { t: 1, s: v }
          : typeof v === "number"
            ? { t: 0, s: v }
            : Array.isArray(v)
              ? { t: 9, i: ++id, a: v.map(enc), o: 0 }
              : { t: 10, i: ++id, p: { k: Object.keys(v), v: Object.values(v).map(enc) }, o: 0 };
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
async function geometry(page: Page, ids: string[]) {
  return page.evaluate((ids) => {
    const nav = document.querySelector('nav[aria-label="Primary"]')!;
    const main = document.querySelector("main")!;
    return {
      nav: nav.getBoundingClientRect().top,
      scroll: main.scrollTop,
      overflow: document.documentElement.scrollWidth - innerWidth,
      boxes: ids.map((id) => {
        const r = document.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: r.height };
      }),
    };
  }, ids);
}
for (const size of [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`flashcard grades work on both faces and keep position at ${size.width}×${size.height}`, async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile);
    await page.setViewportSize(size);
    await page.goto(appUrl({ tab: "flashcards", module: "roofing" }));
    const card = page.getByTestId("flashcards-study-card"),
      grades = page.getByTestId("flashcards-grading");
    await expect(card).toBeVisible();
    const before = await readAppState(page);
    const ids = ["flashcards-study-card", "flashcards-grading"];
    const a = await geometry(page, ids);
    expect(a.overflow).toBeLessThanOrEqual(0);
    expect(a.boxes[1].bottom).toBeLessThanOrEqual(a.nav);
    for (const b of await grades.getByRole("button").all()) await expect(b).toBeEnabled();
    await card.click();
    const b = await geometry(page, ids);
    expect(b.scroll).toBe(a.scroll);
    expect(b.boxes).toEqual(a.boxes);
    await card.click();
    await grades.getByRole("button", { name: /^Good/ }).click();
    await expect(page.getByText("1 reviewed this session", { exact: true })).toBeVisible();
    const c = await geometry(page, ids);
    expect(c.scroll).toBe(a.scroll);
    expect(c.boxes).toEqual(a.boxes);
    await card.click();
    await grades.getByRole("button", { name: /^Easy/ }).click();
    await expect(page.getByText("2 reviewed this session", { exact: true })).toBeVisible();
    const d = await geometry(page, ids);
    expect(d.scroll).toBe(a.scroll);
    expect(d.boxes).toEqual(a.boxes);
    const after = await readAppState(page);
    expect(after.core30Log).toEqual(before.core30Log);
    expect(after.lessonProgress).toEqual(before.lessonProgress);
    mkdirSync(proof, { recursive: true });
    await page.screenshot({ path: `${proof}/flashcards-${size.height}.png` });
  });
}

test("Listening keeps feedback and Next in place between short and long questions", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile);
  await page.setViewportSize({ width: 375, height: 667 });
  let n = 0;
  await page.route("**/_serverFn/**", async (route) => {
    const id = route
      .request()
      .url()
      .match(/\/_serverFn\/([^?/]+)/)?.[1];
    if (!id || !Buffer.from(id, "base64url").toString().includes("generateListeningDrill"))
      return route.fallback();
    n++;
    const phrase =
      n === 1
        ? "Trae los clavos."
        : "Antes de subir al techo, revisa que todos tengan el equipo necesario.";
    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json", "x-tss-serialized": "true" },
      body: encode({
        data: {
          phrase,
          englishTranslation: "Check the equipment before going onto the roof.",
          cefr: "A2",
          topic: "Roofing",
          options: [
            phrase,
            "Revisa las tablas antes de poner las tejas.",
            "Trae las herramientas del camión.",
            "No subas todavía.",
          ],
          correctIndex: 0,
          listenFor: "Listen for the command.",
        },
        error: null,
      }),
    });
  });
  await page.goto(appUrl({ tab: "listeningDrill", module: "roofing" }));
  const before = await readAppState(page);
  const start = page.getByRole("button", { name: /Start Run/ });
  await expect(start).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Primary", exact: true });
  expect((await start.boundingBox())!.y + (await start.boundingBox())!.height).toBeLessThan(
    (await nav.boundingBox())!.y,
  );
  await start.click();
  const next = page.getByTestId("listening-next");
  await expect(next).toBeVisible();
  await expect(next).toBeDisabled();
  const ids = ["listening-question", "listening-options", "listening-feedback", "listening-next"];
  const a = await geometry(page, ids);
  expect(a.boxes[3].bottom).toBeLessThanOrEqual(a.nav);
  await page.getByTestId("listening-options").getByRole("button").first().click();
  await expect(next).toBeEnabled();
  const b = await geometry(page, ids);
  expect(b.scroll).toBe(a.scroll);
  expect(b.boxes).toEqual(a.boxes);
  await next.click();
  await expect(next).toBeDisabled();
  await expect(page.getByTestId("listening-options")).toContainText("Antes de subir");
  const c = await geometry(page, ids);
  expect(c.scroll).toBe(a.scroll);
  expect(c.boxes).toEqual(a.boxes);
  const after = await readAppState(page);
  expect(after.core30Log).toEqual(before.core30Log);
  expect(after.lessonProgress).toEqual(before.lessonProgress);
  mkdirSync(proof, { recursive: true });
  for (const option of await page.getByTestId("listening-options").getByRole("button").all()) {
    const fits = await option.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const text = el.querySelector("span.flex-1")!.getBoundingClientRect();
      return text.bottom <= box.bottom && text.right <= box.right;
    });
    expect(fits, "long answers stay inside their own button").toBe(true);
  }
  await page.screenshot({ path: `${proof}/listening-667.png` });
});

test("Reader, More, Modules and Practice Lab lead with their activity", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile);
  await page.setViewportSize({ width: 375, height: 667 });
  mkdirSync(proof, { recursive: true });
  await page.goto(appUrl({ tab: "reader", module: "roofing" }));
  await expect(page.getByTestId("reader-options")).not.toHaveAttribute("open", "");
  const reading = page.getByRole("region", { name: "Selected reading" });
  await expect(reading).toBeVisible();
  expect((await reading.boundingBox())!.y).toBeLessThan(350);
  await expect(page.getByRole("group", { name: "Reader voice", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open margin notes", exact: true })).toHaveCSS(
    "position",
    "static",
  );
  await expect(page.getByRole("button", { name: "Open margin notes", exact: true })).toHaveCSS(
    "translate",
    "none",
  );
  for (const name of ["Previous reading", "Next reading"]) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  }
  await page.screenshot({ path: `${proof}/reader-667.png` });
  const before = await readAppState(page);
  await page
    .getByRole("navigation", { name: "Primary", exact: true })
    .getByRole("button", { name: "More", exact: true })
    .click();
  const sheet = page.getByRole("dialog", { name: "All Tabs" });
  await expect(sheet.getByText("Your account", { exact: true })).toBeVisible();
  for (const id of ["more-settings", "more-note", "more-recent"])
    await expect(page.getByTestId(id)).not.toHaveAttribute("open", "");
  await expect(sheet.getByRole("button", { name: "App Guide", exact: true })).toBeVisible();
  await page.screenshot({ path: `${proof}/more-667.png` });
  await sheet.getByRole("button", { name: "App Guide", exact: true }).click();
  await page.goto(appUrl({ tab: "modules", module: "roofing" }));
  await expect(page.getByTestId("module-filters")).not.toHaveAttribute("open", "");
  await expect(page.getByPlaceholder("Search modules, roles, or keywords…")).toBeVisible();
  await page.screenshot({ path: `${proof}/modules-667.png` });
  await page.goto(appUrl({ tab: "games", module: "roofing" }));
  await expect(page.getByTestId("practice-statistics")).not.toHaveAttribute("open", "");
  await expect(page.locator("[data-games-grid] > button").first()).toBeInViewport();
  await page.screenshot({ path: `${proof}/practice-lab-667.png` });
  const after = await readAppState(page);
  expect(after.core30Log).toEqual(before.core30Log);
  expect(after.lessonProgress).toEqual(before.lessonProgress);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("lesson card grades are available on either language face", async ({ page, isMobile }) => {
  test.skip(!isMobile);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/?tab=core30&module=roofing&target=Spanish&native=English&lesson=1&way=recall");
  await page.getByTestId("practice-mode-flashcards").click();
  const card = page.getByTestId("flashcard"),
    grades = page.getByTestId("lesson-cards-grading");
  await expect(grades.getByRole("button", { name: "Got it", exact: true })).toBeEnabled();
  await grades.getByRole("button", { name: "Got it", exact: true }).click();
  await page
    .getByRole("group", { name: "Card direction" })
    .getByRole("button", { name: "ES to EN", exact: true })
    .click();
  await expect(grades.getByRole("button", { name: "Got it", exact: true })).toBeEnabled();
  await card.click();
  await expect(grades.getByRole("button", { name: "Again", exact: true })).toBeEnabled();
  const after = await readAppState(page);
  expect(JSON.stringify(after.core30Log)).not.toContain("masteredAt");
});

test("lesson Type keeps prompt, input and Check/Next steady", async ({ page, isMobile }) => {
  test.skip(!isMobile);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/?tab=core30&module=roofing&target=Spanish&native=English&lesson=1&way=type");
  const input = page.getByTestId("type-input"),
    primary = page.getByTestId("typing-primary");
  await expect(input).toBeVisible();
  await primary.scrollIntoViewIfNeeded();
  await input.fill("not-the-answer");
  const ids = ["typing-prompt", "type-input", "typing-primary"];
  const a = await geometry(page, ids);
  await input.press("Enter");
  await expect(primary).toHaveText("Next word");
  const b = await geometry(page, ids);
  expect(b.scroll).toBe(a.scroll);
  expect(b.boxes).toEqual(a.boxes);
  await primary.click();
  await expect(primary).toHaveText("Check");
  await expect(input).toBeFocused();
  const c = await geometry(page, ids);
  expect(c.scroll).toBe(a.scroll);
  expect(c.boxes).toEqual(a.boxes);
});

test("lesson Hear keeps answer and Next rows steady", async ({ page, isMobile }) => {
  test.skip(!isMobile);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/?tab=core30&module=roofing&target=Spanish&native=English&lesson=1&way=hear");
  const options = page.getByTestId("lesson-listening-options"),
    next = page.getByTestId("lesson-listening-next");
  await expect(options).toBeVisible();
  await options.getByRole("button").first().scrollIntoViewIfNeeded();
  const ids = ["lesson-listening-options", "lesson-listening-next"];
  const a = await geometry(page, ids);
  await options.getByRole("button").first().click();
  await expect(next).toBeEnabled();
  const b = await geometry(page, ids);
  expect(b.boxes).toEqual(a.boxes);
  expect(b.scroll).toBe(a.scroll);
  await next.click();
  await expect(next).toBeDisabled();
  const c = await geometry(page, ids);
  expect(c.boxes).toEqual(a.boxes);
  expect(c.scroll).toBe(a.scroll);
});

test("larger phone text keeps card grades separate and the flip frame steady", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(appUrl({ tab: "flashcards", module: "roofing" }));
  const card = page.getByTestId("flashcards-study-card");
  await expect(card).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "20px";
  });
  const grades = page.getByTestId("flashcards-grading");
  await grades.scrollIntoViewIfNeeded();
  const a = await geometry(page, ["flashcards-study-card", "flashcards-grading"]);
  expect(a.overflow).toBeLessThanOrEqual(0);
  expect(a.boxes[0].bottom).toBeLessThan(a.boxes[1].top);
  for (const button of await grades.getByRole("button").all()) await expect(button).toBeEnabled();
  // Programmatic activation avoids an intentional scroll back to an offscreen card.
  await card.press("Enter");
  const b = await geometry(page, ["flashcards-study-card", "flashcards-grading"]);
  expect(b.boxes.map((box) => box.height)).toEqual(a.boxes.map((box) => box.height));
});
