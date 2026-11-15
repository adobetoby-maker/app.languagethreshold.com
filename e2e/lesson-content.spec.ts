import { collectRecallCards, openRecallTools } from "./recall-deck";
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { core30Key, readAppState, seedAppState } from "./app-state.ts";

// Authored lesson content on the Landscaper module (Spanish): lesson 1's passage in See it, and
// the verb drill under Type it. The expected text is read from the same generated file the app
// serves (public/lesson-content/es/plumber.json; landscaper, roofing and
// construction-foreman show their hand-written readings instead), so the test follows the content.

const MODULE = "plumber";

interface Verb {
  infinitive: string;
  native: string;
  forms: Record<string, string>;
}
interface LessonContent {
  passage: { title: string; target: string[]; native: string[] };
  words: { es: string; en: string; kind: string }[];
  verbs: Verb[];
}
const content = JSON.parse(
  readFileSync(new URL("../public/lesson-content/es/plumber.json", import.meta.url), "utf8"),
) as { lessons: Record<string, LessonContent> };
const LESSON_1 = content.lessons["1"];

const pad = (n: number) => String(n).padStart(2, "0");
function dateKey(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Opens the app on the Core 30 tab of the test module with the plan started today. A cold
 * dev server can finish loading after the seed is written and drop it, so the seed is written
 * again (up to three times) until the app keeps it.
 */
async function openModuleCore30(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Speaking menu", exact: true }).first(),
  ).toBeVisible({
    timeout: 60_000,
  });
  const startDate = dateKey(0);
  const seeded = async () => {
    const state = await readAppState(page);
    const log = state.core30Log as Record<string, { startDate?: string }> | undefined;
    return (
      state.activeModuleId === MODULE &&
      state.currentTab === "core30" &&
      log?.[core30Key(MODULE)]?.startDate === startDate
    );
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    const previous = await readAppState(page);
    await seedAppState(page, {
      activeModuleId: MODULE,
      selectedLanguage: "Spanish",
      currentTab: "core30",
      lessonProgress: {
        ...((previous.lessonProgress as object | undefined) ?? {}),
        [core30Key(MODULE)]: 0,
      },
      core30Log: { [core30Key(MODULE)]: { startDate, lessons: {} } },
    });
    // Name the module in the address: the app routes a bare Core 30 link to its default module.
    await page.goto(`/?tab=core30&module=${MODULE}&target=Spanish&native=English`);
    await page.getByTestId("study-options").locator(":scope > summary").click();
    await page
      .getByTestId("core30-plan-card")
      .waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1500);
    if ((await page.getByTestId("core30-plan-card").isVisible()) && (await seeded())) return;
  }
  await expect(page.getByTestId("core30-plan-card")).toBeVisible();
  expect(await seeded()).toBe(true);
}

async function openLesson1(page: Page) {
  await page
    .getByRole("button", { name: /Today: Lesson 1|Start Lesson 1/ })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Lesson details and goal", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Lesson practice modes", exact: true }),
  ).toBeVisible();
}

async function goSection(page: Page, section: "see" | "recall" | "type") {
  await page.getByTestId(`v6-nav-${section}`).click();
  await expect(page.getByTestId(`v6-nav-${section}`)).toHaveAttribute("aria-current", "page");
}

test.describe("Lesson content: Plumber lesson 1", () => {
  test("See it shows the passage written for this lesson", async ({ page }) => {
    await openModuleCore30(page);
    await openLesson1(page);
    const reader = page.getByTestId("lesson-reader");
    await expect(reader).toBeVisible({ timeout: 60_000 });
    await expect(reader.getByRole("article", { name: "Lesson phrase" })).toHaveCount(1);
    for (let index = 0; index < LESSON_1.passage.target.length; index++) {
      await expect(reader.locator(".lt-native-reading-target")).toHaveText(
        LESSON_1.passage.target[index],
      );
      await expect(reader.locator(".lt-native-reading-translation")).toHaveText(
        LESSON_1.passage.native[index],
      );
      if (index + 1 < LESSON_1.passage.target.length)
        await reader.getByRole("button", { name: "Next →", exact: true }).click();
    }
    await expect(reader.getByRole("button", { name: "Finish round", exact: true })).toBeVisible();
  });

  test("Recall combines word, phrase and verb cards with practice breaks", async ({ page }) => {
    await openModuleCore30(page);
    await openLesson1(page);
    await goSection(page, "recall");
    const deck = page.getByTestId("lesson-recall-deck");
    await expect(deck).toBeVisible();
    await expect(page.getByTestId("practice-recall-switch")).not.toBeVisible();
    const recalled = await collectRecallCards(page);
    for (const verb of LESSON_1.verbs)
      expect(recalled.some((card) => card.target === verb.infinitive && card.kind === "Verb")).toBe(
        true,
      );
    expect(recalled.some((card) => card.kind === "Word")).toBe(true);
    expect(recalled.some((card) => card.kind === "Phrase")).toBe(true);
    await expect(deck).toContainText("skipped");
  });

  test("Recall matching and verb rounds return to the combined cards", async ({ page }) => {
    await openModuleCore30(page);
    await openLesson1(page);
    await goSection(page, "recall");
    const deck = page.getByTestId("lesson-recall-deck");
    const seen = new Map<string, string>();
    for (let step = 0; step < 30; step++) {
      const current = deck.getByTestId("recall-step");
      if ((await current.getAttribute("data-kind")) !== "card") break;
      const native = await current.getByTestId("recall-card-text").innerText();
      await current.getByRole("button", { name: "Flip the card", exact: true }).click();
      seen.set(await current.getByTestId("recall-card-text").innerText(), native);
      await current.getByRole("button", { name: "Got it", exact: true }).click();
    }
    await expect(deck.getByTestId("recall-step")).toHaveAttribute("data-kind", "match");
    const targets = deck.locator('[data-testid="match-tile"][lang="es"]');
    const meanings = deck.locator('[data-testid="match-tile"][lang="en"]');
    const texts = await targets.allInnerTexts();
    const nativeTexts = await meanings.allInnerTexts();
    for (let i = 0; i < texts.length; i++) {
      const at = nativeTexts.indexOf(seen.get(texts[i])!);
      expect(at).toBeGreaterThanOrEqual(0);
      await targets.nth(i).click();
      await meanings.nth(at).click();
    }
    await expect(deck.getByTestId("recall-step")).toHaveAttribute("data-kind", "card");
    for (let step = 0; step < 30; step++) {
      const current = deck.getByTestId("recall-step");
      const kind = await current.getAttribute("data-kind");
      if (kind === "verb-game") break;
      if (kind === "card") {
        await current.getByRole("button", { name: "Flip the card", exact: true }).click();
        await current.getByRole("button", { name: "Got it", exact: true }).click();
      } else await deck.getByRole("button", { name: "Skip this activity", exact: true }).click();
    }
    await expect(deck.getByTestId("recall-step")).toHaveAttribute("data-kind", "verb-game");
    const game = deck.getByTestId("lesson-verb-game-round");
    for (let question = 0; question < 4; question++) {
      const options = game.locator("div.grid > button");
      const count = await options.count();
      expect(count).toBeGreaterThan(1);
      for (let option = 0; option < count; option++) {
        await options.nth(option).click();
        if (await game.getByText(/^Correct\./).isVisible()) break;
      }
      await expect(game.getByText(/^Correct\./)).toBeVisible();
      await game.getByRole("button", { name: /^(Next question|See score)$/ }).click();
    }
    await game.getByRole("button", { name: "Continue cards", exact: true }).click();
    await expect(deck.getByTestId("recall-step")).toHaveAttribute("data-kind", "card");
  });

  test("Recall tools retain the lesson's verb reference cards", async ({ page }) => {
    await openModuleCore30(page);
    await openLesson1(page);
    await goSection(page, "recall");
    await expect(page.getByTestId("lesson-recall-deck")).toBeVisible({ timeout: 60_000 });
    await openRecallTools(page);
    await page.getByTestId("practice-mode-verbs").click();
    const study = page.getByTestId("verb-practice-study");
    await expect(study).toBeVisible();
    await expect(study.getByTestId("verb-card")).toHaveCount(LESSON_1.verbs.length);
    const first = LESSON_1.verbs[0];
    await expect(study).toContainText(first.infinitive);
    await expect(study).toContainText(first.forms["nosotros"]);
  });

  test("Type it, Verbs: a correct form is accepted and a wrong one gets feedback", async ({
    page,
  }) => {
    await openModuleCore30(page);
    await openLesson1(page);
    await goSection(page, "type");
    await expect(page.getByTestId("type-kind-switch")).toBeVisible({ timeout: 60_000 });
    // Words is the default and keeps working.
    await expect(page.getByTestId("type-input")).toBeVisible();
    await page.getByTestId("type-kind-verbs").click();
    await expect(page.getByTestId("verb-practice-conjugate")).toBeVisible();

    const expectedFor = async (): Promise<string> => {
      const prompt = page.getByTestId("verb-prompt");
      const infinitive = (await prompt.getAttribute("data-infinitive")) ?? "";
      const key = (await prompt.getAttribute("data-pronoun-key")) ?? "";
      const verb = LESSON_1.verbs.find((v) => v.infinitive === infinitive);
      expect(verb, `verb ${infinitive} is in the lesson`).toBeTruthy();
      return verb!.forms[key];
    };

    // Right answer.
    const right = await expectedFor();
    await page.getByTestId("verb-input").fill(right);
    await page.getByRole("button", { name: "Check" }).click();
    const verdict = page.getByTestId("answer-feedback-verdict");
    await expect(verdict).toHaveText("Correct");
    await expect(page.getByTestId("answer-feedback-word")).toContainText(right);
    await page.getByRole("button", { name: "Next form" }).click();

    // Wrong answer: feedback explains it and shows the right form.
    const wanted = await expectedFor();
    await page.getByTestId("verb-input").fill("zzzzz");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByTestId("answer-feedback")).toHaveAttribute("data-verdict", "wrong");
    await expect(verdict).toHaveText("Not quite");
    await expect(page.getByTestId("answer-feedback-word")).toContainText(wanted);
  });
});
