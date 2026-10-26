import { expect, test } from "@playwright/test";
import { appUrl, readAppState } from "./app-state";

test("selected module opens its card first, with Add cards and a compact deck below", async ({
  page,
}) => {
  await page.goto(appUrl({ tab: "flashcards", module: "roofing" }));
  await expect(
    page.getByRole("heading", { name: "Roofing Supervisor cards", exact: true }),
  ).toBeVisible();
  const card = page.getByTestId("flashcards-study-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText("Teja asfáltica");
  const add = page.getByTestId("flashcards-add-cards");
  const deck = page.getByTestId("flashcards-your-deck");
  await expect(add).not.toHaveAttribute("open", "");
  await expect(deck).not.toHaveAttribute("open", "");
  expect(
    await card.evaluate((el) =>
      Boolean(
        el.compareDocumentPosition(
          document.querySelector('[data-testid="flashcards-add-cards"]')!,
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ),
  ).toBe(true);
  const before = await readAppState(page);
  const readCards = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("lt.learner-device.v1.flashcards.guest") || "null")?.data
          ?.cards ?? {},
    );
  const beforeCards = await readCards();
  // Opening deck-management controls with the keyboard must not flip/grade a card.
  const summary = add.locator("summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(add).toHaveAttribute("open", "");
  await expect(page.getByText("Study sections · tap to mix", { exact: true })).toBeVisible();
  await expect(page.getByText("Topic decks · translated as you go", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Make your own flashcards", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("flashcards-shortcuts")).toContainText("reveal translation");
  await summary.click();
  await deck.locator("summary").click();
  await expect(deck).toHaveAttribute("open", "");
  await expect(deck.getByText("Your field focus", { exact: true })).toBeVisible();
  await deck.locator("summary").click();
  const usage = page.getByRole("region", { name: "Card usage" });
  await expect(usage).toBeVisible();
  await expect(usage.getByText("Example", { exact: true })).toBeVisible();
  await expect(usage.getByRole("button", { name: "Hear example" })).toBeVisible();
  await usage.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/flashcards-usage-${test.info().project.name}.png` });
  await page.reload();
  await expect(card).toContainText("Teja asfáltica");
  await expect(add).not.toHaveAttribute("open", "");
  const after = await readAppState(page);
  expect(after.core30Log).toEqual(before.core30Log);
  expect(after.lessonProgress).toEqual(before.lessonProgress);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/flashcards-${test.info().project.name}.png` });
  const afterCards = await readCards();
  for (const [id, entry] of Object.entries(beforeCards) as [string, { srs: unknown }][])
    expect(afterCards[id].srs).toEqual(entry.srs);
  const original = (
    Object.values(afterCards) as {
      id: string;
      word: string;
      moduleId?: string;
      srs: { repetitions: number };
    }[]
  ).find((entry) => entry.moduleId === "roofing" && entry.word === "Teja asfáltica")!;
  await card.click();
  await page.getByRole("button", { name: /^Good/ }).click();
  await expect(page.getByText("1 reviewed this session", { exact: true })).toBeVisible();
  await expect
    .poll(async () => (await readCards())[original.id].srs.repetitions)
    .toBe(original.srs.repetitions + 1);
  const reviewed = (await readCards())[original.id].srs;
  await page.goto(appUrl({ tab: "flashcards", module: "core" }));
  await expect(card).toContainText("poder");
  await page.goto(appUrl({ tab: "flashcards", module: "roofing" }));
  await expect(
    page.getByRole("heading", { name: "Roofing Supervisor cards", exact: true }),
  ).toBeVisible();
  expect((await readCards())[original.id].srs).toEqual(reviewed);
});

test("conjugation stays expanded below the deck row and card creation still works", async ({
  page,
}) => {
  await page.goto(appUrl({ tab: "flashcards", module: "core" }));
  const card = page.getByTestId("flashcards-study-card");
  await expect(card).toBeVisible();
  await expect(page.getByText("Conjugation · poder", { exact: true })).toBeVisible();
  await expect(page.getByText("Common uses", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const add = page.getByTestId("flashcards-add-cards");
  await add.locator("summary").click();
  await add.getByRole("button", { name: /^Vocab/ }).click();
  await expect(page.getByTestId("flashcards-your-deck").locator("summary")).toContainText(
    "0 cards",
  );
  await expect(page.getByText("No cards in this set yet", { exact: true })).toBeVisible();
  await page.getByLabel("English word or phrase").fill("Roofing nails");
  await page.getByLabel("Spanish translation (optional for one card)").fill("Clavos para techo");
  await page.getByRole("button", { name: "Add to study cards", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /added to your study flow/ }),
  ).toBeVisible();
  await page.getByTestId("flashcards-your-deck").locator("summary").click();
  await expect(
    page.getByTestId("flashcards-your-deck").getByText("Clavos para techo", { exact: true }),
  ).toBeVisible();
  const gloss = page.getByTestId("flashcards-word-gloss");
  await expect(gloss).toBeHidden();
  await card.click();
  await expect(gloss).toBeVisible();
  await expect(gloss.locator(":scope > span")).toHaveText(["Clavosnails", "parafor", "techoroof"]);
  await expect(card.getByText("Roofing nails", { exact: true })).toHaveCount(1);
  await expect(card).not.toContainText("roofing term");
  await page.screenshot({
    path: `test-results/flashcards-gloss-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("flipping preserves the frame and reveals usage English only on the back", async ({
  page,
}) => {
  await page.goto(appUrl({ tab: "flashcards", module: "roofing" }));
  const card = page.getByTestId("flashcards-study-card");
  const grades = page.getByTestId("flashcards-grading");
  const usage = page.getByRole("region", { name: "Card usage" });
  const meaning = page.getByTestId("usage-meaning");
  const translation = page.getByTestId("usage-translation");
  await expect(card).toBeVisible();
  await expect(usage).toBeAttached();
  await expect(meaning).toBeHidden();
  await expect(translation).toBeHidden();
  await expect(
    page
      .getByTestId("flashcards-shortcuts")
      .getByText("Tap the card, Enter or Space to reveal translation", { exact: true }),
  ).toBeVisible();
  for (const button of await grades.getByRole("button").all()) await expect(button).toBeDisabled();
  const frame = () =>
    page.evaluate(() => {
      const selectors = [
        '[data-testid="flashcards-study-card"]',
        '[data-testid="flashcards-grading"]',
        '[data-testid="flashcards-add-cards"]',
        '[data-testid="flashcards-your-deck"]',
        '[aria-label="Card usage"]',
      ];
      return selectors.map((selector) => {
        const rect = document.querySelector(selector)!.getBoundingClientRect();
        return { y: rect.top + scrollY, height: rect.height, width: rect.width };
      });
    });
  // Focus may scroll the app content when the phone text scale is larger.
  // Measure after that intentional scroll so the assertion isolates flipping.
  await card.focus();
  const before = await frame();
  await page.keyboard.press("Enter");
  await expect(meaning).toBeVisible();
  await expect(translation).toBeVisible();
  await expect(
    page
      .getByTestId("flashcards-shortcuts")
      .getByText("Tap the card or Enter: flip back · Space: accept (Good) · 1–4: grade", {
        exact: true,
      }),
  ).toBeVisible();
  for (const button of await grades.getByRole("button").all()) await expect(button).toBeEnabled();
  expect(await frame()).toEqual(before);
  await page.screenshot({
    path: `test-results/flashcards-stable-back-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.keyboard.press("Enter");
  await expect(meaning).toBeHidden();
  expect(await frame()).toEqual(before);
  await page.keyboard.press("Space");
  await expect(meaning).toBeVisible();
  await page.keyboard.down("Space");
  await expect(page.getByText("1 reviewed this session", { exact: true })).toBeVisible();
  // Holding a key must not reveal/accept the next card again.
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  await expect(page.getByText("1 reviewed this session", { exact: true })).toBeVisible();
  await expect(meaning).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("reward chime follows a successful grade and can be switched off without changing voices", async ({
  page,
  isMobile,
}) => {
  await page.addInitScript(() => {
    const NativeAudio = window.AudioContext;
    (window as unknown as { rewardContexts: number }).rewardContexts = 0;
    window.AudioContext = class extends NativeAudio {
      constructor(options?: AudioContextOptions) {
        super(options);
        (window as unknown as { rewardContexts: number }).rewardContexts++;
      }
    };
  });
  await page.goto(appUrl({ tab: "flashcards", module: "roofing" }));
  const card = page.getByTestId("flashcards-study-card");
  await expect(card).toBeVisible();
  await card.click();
  await page.getByRole("button", { name: /^Good/ }).click();
  const count = () =>
    page.evaluate(() => (window as unknown as { rewardContexts: number }).rewardContexts);
  await expect.poll(count).toBe(1);
  if (isMobile) await page.getByRole("button", { name: "App settings", exact: true }).click();
  else await page.getByRole("button", { name: "Learning settings", exact: true }).click();
  const sounds = page
    .getByRole("switch", { name: "Flashcard sound effects", exact: true })
    .filter({ visible: true });
  await expect(sounds).toBeChecked();
  await sounds.uncheck();
  await expect(
    page.getByRole("button", { name: "Preview reward sound" }).filter({ visible: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(card).toBeVisible();
  await card.click();
  await page.getByRole("button", { name: /^Easy/ }).click();
  expect(await count()).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem("lt.sound-effects.v1"))).toBe("off");
});
