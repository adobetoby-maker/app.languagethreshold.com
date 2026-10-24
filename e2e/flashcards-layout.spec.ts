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
  await expect(card).toContainText("tap to flip");
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
  await page.getByLabel("English word or phrase").fill("QA roofing anchor");
  await page.getByLabel("Spanish translation (optional for one card)").fill("anclaje de prueba QA");
  await page.getByRole("button", { name: "Add to study cards", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /added to your study flow/ }),
  ).toBeVisible();
  await page.getByTestId("flashcards-your-deck").locator("summary").click();
  await expect(
    page.getByTestId("flashcards-your-deck").getByText("anclaje de prueba QA", { exact: true }),
  ).toBeVisible();
});
