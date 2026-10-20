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
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
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
  await expect(page.getByText("✕ Exit")).toBeVisible();
  await expect(page.getByTestId("lesson-section-nav")).toBeVisible();
}

async function goSection(page: Page, section: "see" | "recall" | "type") {
  await page.getByTestId(`lesson-nav-${section}`).click();
  await expect(page.getByTestId(`lesson-nav-${section}`)).toHaveAttribute("aria-current", "step");
}

test.describe("Lesson content: Plumber lesson 1", () => {
  test("See it shows the passage written for this lesson", async ({ page }) => {
    await openModuleCore30(page);
    await openLesson1(page);
    const reader = page.getByTestId("lesson-reader");
    await expect(reader).toBeVisible({ timeout: 60_000 });
    await expect(reader).toContainText(LESSON_1.passage.title);
    await expect(reader).toContainText(LESSON_1.passage.target[0]);
    expect(await reader.locator("[data-sentence-index]").count()).toBe(
      LESSON_1.passage.target.length,
    );
    // The translation toggle shows the aligned English sentence.
    await reader.getByRole("button", { name: "English", exact: true }).click();
    await expect(reader).toContainText(LESSON_1.passage.native[0]);
  });

  test("Recall it has a Verbs tab with the lesson's verb cards", async ({ page }) => {
    await openModuleCore30(page);
    await openLesson1(page);
    await goSection(page, "recall");
    await expect(page.getByTestId("practice-recall-switch")).toBeVisible({ timeout: 60_000 });
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
