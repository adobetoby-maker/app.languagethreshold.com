import { expect, test, type Page } from "@playwright/test";
import { ROOFING_LESSON_WORDS } from "../src/data/roofing-lesson-words.ts";

// Click tests for the Core 30 learning plan on the Roofing module (Spanish):
// the 90-day plan card, lesson steps, the practice kit, mastery and the review session.
// The app's record lives in localStorage "lt.app.v2" -> state.core30Log.roofing, which the
// tests read back to check that what the learner sees is what the app stored.

const MODULE = "roofing";
const LESSON_1_WORDS = ROOFING_LESSON_WORDS[1];
const LESSON_1_TERMS = LESSON_1_WORDS.filter((w) => w.kind === "term");

interface LessonLog {
  visits: Record<string, string>;
  masteredAt?: string;
  needsPractice?: boolean;
  reviews?: { at: string; ok: boolean }[];
}
interface ModuleLog {
  startDate?: string;
  lessons: Record<string, LessonLog>;
  lastReviewAt?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Local calendar date N days from today as YYYY-MM-DD (the app uses the local date too). */
function dateKey(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

const readLog = (page: Page): Promise<ModuleLog | undefined> =>
  page.evaluate((id) => {
    const state = JSON.parse(localStorage.getItem("lt.app.v2") || "{}");
    return state.core30Log?.[id];
  }, MODULE);

const visitKeys = async (page: Page, lesson: string) =>
  Object.keys((await readLog(page))?.lessons[lesson]?.visits ?? {});

/**
 * Opens the app on the Core 30 tab of the Roofing module with `log` as the saved plan record
 * (undefined = no plan started). A cold dev server can finish loading after the seed is written
 * and drop it, so the seed is written again (up to three times) until the app keeps it.
 */
async function openCore30(page: Page, log?: ModuleLog) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  const seeded = () =>
    page.evaluate(
      ({ id, startDate }) => {
        const state = JSON.parse(localStorage.getItem("lt.app.v2") || "{}");
        const saved = state.core30Log?.[id];
        return (
          state.activeModuleId === id &&
          state.currentTab === "core30" &&
          (startDate ? saved?.startDate === startDate : !saved?.startDate)
        );
      },
      { id: MODULE, startDate: log?.startDate ?? null },
    );
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.evaluate(
      ({ id, seed }) => {
        const state = JSON.parse(localStorage.getItem("lt.app.v2") || "{}");
        state.activeModuleId = id;
        state.selectedLanguage = "Spanish";
        state.currentTab = "core30";
        state.lessonProgress = { ...(state.lessonProgress ?? {}), [id]: 0 };
        state.core30Log = seed ? { [id]: seed } : {};
        localStorage.setItem("lt.app.v2", JSON.stringify(state));
      },
      { id: MODULE, seed: log ?? null },
    );
    await page.reload();
    // A dropped seed leaves the app on its default tab, so only wait a short while before retrying.
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

/** Back to the Core 30 tab the way a user does it: top bar on desktop, More sheet on a phone. */
async function gotoCore30Tab(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByText("More", { exact: true }).filter({ visible: true }).last().tap();
    const sheet = page.getByRole("dialog").filter({ hasText: "All Tabs" });
    const item = sheet.getByRole("button", { name: /core 30/i }).first();
    await item.scrollIntoViewIfNeeded();
    await item.tap();
  } else {
    await page.getByRole("button", { name: "Core 30", exact: true }).first().click();
  }
  await expect(page.getByTestId("core30-plan-card")).toBeVisible();
}

async function openLesson1(page: Page) {
  await page.getByRole("button", { name: /Today: Lesson 1/ }).click();
  await expect(page.getByText("✕ Exit")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Practice this lesson's words/ })).toBeVisible();
}

/** The action button of lesson step `n` (1-based), found by the step's own heading text. */
const stepButton = (page: Page, n: number, name: RegExp) =>
  page
    .getByText(new RegExp(`^Step ${n} —`))
    .locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]")
    .getByRole("button", { name });

const STARTED_TODAY: ModuleLog = { startDate: dateKey(0), lessons: {} };

test.describe("Core 30 plan: Roofing", () => {
  test("1. start the plan: Day 1 of 90 and Lesson 1", async ({ page }) => {
    await openCore30(page);
    const card = page.getByTestId("core30-plan-card");
    await expect(card.locator('input[type="date"]')).toHaveValue(dateKey(0));
    await expect(card.getByText("Day 1 of 90")).toHaveCount(0);
    await card.getByTestId("core30-start-plan").click();
    await expect(card.getByText("Day 1 of 90")).toBeVisible();
    await expect(card.getByText("Today: Lesson 1")).toBeVisible();
    await expect(card.getByText("On track")).toBeVisible();
    await expect(card.getByText("0 / 30")).toBeVisible();
    await expect.poll(async () => (await readLog(page))?.startDate).toBe(dateKey(0));
  });

  test("2. opening a step shows an Opened mark and is recorded", async ({ page, isMobile }) => {
    await openCore30(page, STARTED_TODAY);
    await openLesson1(page);
    await expect(page.getByTestId("core30-step-opened")).toHaveCount(0);
    await stepButton(page, 1, /^Go/).click();
    // The Go button leaves Core 30 for the step's own tab.
    await expect(page.getByTestId("core30-plan-card")).toHaveCount(0);
    await expect.poll(() => visitKeys(page, "1")).toEqual(["0"]);

    await gotoCore30Tab(page, isMobile);
    await openLesson1(page);
    const opened = page.getByTestId("core30-step-opened");
    await expect(opened).toHaveCount(1);
    await expect(opened).toContainText("Opened");
    const log = await readLog(page);
    expect(Object.keys(log!.lessons["1"].visits)).toEqual(["0"]);
    expect(Date.parse(log!.lessons["1"].visits["0"])).not.toBeNaN();
  });

  test("3. practice kit: study list, memory match, type", async ({ page }) => {
    await openCore30(page, STARTED_TODAY);
    await openLesson1(page);
    const total = LESSON_1_WORDS.length;
    await expect(
      page.getByRole("heading", { name: `Practice this lesson's words (${total})` }),
    ).toBeVisible();
    const kit = page.getByTestId("practice-kit");
    await expect(kit).toBeVisible();

    // Study: every lesson-1 word is listed, and the list length equals the heading count.
    const panel = kit.getByRole("tabpanel");
    const studyEs = panel.locator('li p[lang="es"]');
    await expect(studyEs).toHaveCount(total);
    expect((await studyEs.allInnerTexts()).sort()).toEqual(LESSON_1_WORDS.map((w) => w.es).sort());
    for (const word of LESSON_1_WORDS) {
      await expect(panel.locator("li").filter({ hasText: word.en }).first()).toBeVisible();
    }

    // Memory match: pair every Spanish tile with its English tile.
    await kit.getByTestId("practice-mode-match").click();
    const enOf = new Map(LESSON_1_TERMS.map((w) => [w.es, w.en]));
    const tiles = kit.getByTestId("match-tile");
    await expect(tiles.first()).toBeVisible();
    const finished = kit.getByText(new RegExp(`All ${LESSON_1_TERMS.length} terms matched`));
    for (let guard = 0; guard < 6 && !(await finished.isVisible()); guard++) {
      const view = await tiles.evaluateAll((els) =>
        els.map((el, index) => ({
          index,
          lang: (el as HTMLElement).lang,
          text: (el.textContent ?? "").trim(),
          matched: (el as HTMLElement).dataset.matched === "true",
        })),
      );
      const open = view.filter((t) => !t.matched);
      for (const es of open.filter((t) => t.lang === "es")) {
        const english = enOf.get(es.text);
        expect(english, `unknown Spanish tile "${es.text}"`).toBeTruthy();
        const partner = open.find((t) => t.lang === "en" && t.text === english);
        expect(partner, `no English tile "${english}"`).toBeTruthy();
        await tiles.nth(es.index).click();
        await tiles.nth(partner!.index).click();
        await expect(tiles.nth(partner!.index)).toHaveAttribute("data-matched", "true");
      }
      const next = kit.getByRole("button", { name: "Next round" });
      if (await next.isVisible()) await next.click();
    }
    await expect(finished).toBeVisible();
    await expect(
      kit.getByText(new RegExp(`${LESSON_1_TERMS.length} / ${LESSON_1_TERMS.length} pairs`)),
    ).toBeVisible();

    // Type: answer the first prompt with the correct Spanish.
    await kit.getByTestId("practice-mode-type").click();
    const prompt = kit.getByText("Type this in Spanish").locator("xpath=following-sibling::p[1]");
    await expect(prompt).toBeVisible();
    const english = (await prompt.innerText()).trim();
    const word = LESSON_1_WORDS.find((w) => w.en === english);
    expect(word, `prompt "${english}" is not a lesson-1 word`).toBeTruthy();
    await kit.getByTestId("type-input").fill(word!.es);
    await kit.getByRole("button", { name: "Check" }).click();
    await expect(kit.getByRole("status")).toContainText("Correct");

    // Practice-kit activity counts as opening the lesson's Word Match step (index 1).
    await expect.poll(() => visitKeys(page, "1")).toContain("1");
  });

  test("4. mastered button records the verdict and cannot be undone", async ({ page }) => {
    await openCore30(page, STARTED_TODAY);
    await openLesson1(page);
    await page.getByTestId("core30-mastered-button").click();
    await expect.poll(async () => (await readLog(page))?.lessons["1"]?.masteredAt).toBeTruthy();

    // Lesson 1 is the module's current lesson, so mastering it also closes the runner.
    await expect(page.getByText(/Lesson complete/)).toBeVisible();
    await expect(page.getByTestId("core30-plan-card").getByText("1 / 30")).toBeVisible();
    await expect(page.getByRole("button", { name: /Today: Lesson 2/ })).toBeVisible();

    // Reopen it from the lesson list.
    await page.getByText(/All 30 lessons/).click();
    await page.getByRole("button", { name: /1\. Name the Roof System/ }).click();
    await expect(page.getByTestId("core30-mastered-status")).toContainText("Mastered on");
    await expect(page.getByTestId("core30-mastered-button")).toHaveCount(0);
    // No way to take the verdict back from the lesson view.
    await expect(
      page.getByRole("button", { name: /un-?master|undo|not mastered|clear|reset|remove/i }),
    ).toHaveCount(0);
    const log = await readLog(page);
    expect(Date.parse(log!.lessons["1"].masteredAt!)).not.toBeNaN();
    expect(log!.lessons["1"].needsPractice).toBeFalsy();
  });

  test("5. review: needs-practice, summary, and re-mastering", async ({ page }) => {
    const seeded: ModuleLog = {
      startDate: dateKey(-5),
      lessons: {
        "1": { visits: {}, masteredAt: isoDaysAgo(4) },
        "2": { visits: {}, masteredAt: isoDaysAgo(2) },
      },
    };
    await openCore30(page, seeded);
    const card = page.getByTestId("core30-plan-card");
    await expect(card.getByText("Day 6 of 90")).toBeVisible();
    await expect(card.getByText("Today", { exact: true })).toBeVisible();
    await card.getByRole("button", { name: /Start today.s review/ }).click();

    const review = page.getByTestId("core30-review");
    await expect(review.getByText("Review · 2 mastered lessons")).toBeVisible();
    await expect(review.getByRole("heading", { name: /^Lesson 1 —/ })).toBeVisible();
    await expect(review.getByRole("heading", { name: /^Lesson 2 —/ })).toBeVisible();

    // Reveal one word: the Spanish appears where "Tap to reveal" was.
    const firstWord = review.locator("section ul li button").first();
    await expect(firstWord).toContainText("Tap to reveal");
    await firstWord.click();
    await expect(firstWord).toHaveAttribute("aria-expanded", "true");
    await expect(firstWord).not.toContainText("Tap to reveal");

    const finish = review.getByTestId("core30-review-finish");
    await expect(finish).toBeDisabled();
    const lesson1 = review.locator("section").filter({ hasText: /^Lesson 1 —/ });
    const lesson2 = review.locator("section").filter({ hasText: /^Lesson 2 —/ });
    await lesson1.getByRole("button", { name: "Still mastered" }).click();
    await lesson2.getByRole("button", { name: "Needs practice" }).click();
    await expect(finish).toBeEnabled();
    await finish.click();

    await expect(page.getByText("Review complete")).toBeVisible();
    await expect(page.getByText("1 of 2 lessons still mastered")).toBeVisible();
    await expect(page.getByText(/Practice again: Lesson 2/)).toBeVisible();
    await expect.poll(async () => (await readLog(page))?.lastReviewAt).toBeTruthy();
    const afterReview = await readLog(page);
    expect(afterReview!.lessons["2"].needsPractice).toBe(true);
    expect(afterReview!.lessons["1"].needsPractice).toBeFalsy();

    await page.getByRole("button", { name: "Back to Core 30" }).click();
    await expect(card.getByText(/Needs practice: Lesson 2/)).toBeVisible();
    await expect(card.getByText("Today", { exact: true })).toHaveCount(0);

    // Re-master lesson 2 from the lesson list.
    await page.getByText(/All 30 lessons/).click();
    await page.getByRole("button", { name: /2\. Deck, Underlayment/ }).click();
    await expect(page.getByText("Needs practice — review again")).toBeVisible();
    await page.getByRole("button", { name: "I've mastered it again" }).click();
    await expect.poll(async () => (await readLog(page))?.lessons["2"]?.needsPractice).toBe(false);
    await expect(page.getByTestId("core30-mastered-status")).toContainText("Mastered on");
  });

  test("6. speaking step lands on the Speak tab with the lesson mission", async ({ page }) => {
    await openCore30(page, STARTED_TODAY);
    await openLesson1(page);
    // Lesson 1 steps: 1 Reader, 2 Word Match, 3 Speak & Learn.
    await expect(page.getByText(/^Step 3 — Speak & Learn/)).toBeVisible();
    await stepButton(page, 3, /^Go/).click();
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem("lt.app.v2") || "{}").currentTab),
      )
      .toBe("speak");
    // The lesson's own mission is selected on the Speak tab.
    const mission = page.getByRole("heading", { name: /^Lesson 1:/ });
    await expect(mission).toBeVisible({ timeout: 60_000 });
    await expect(mission).toContainText("Name the Roof System");
    // If a sign-in wall covers the mission in the e2e auth state, record it instead of failing.
    const wall = page.getByRole("dialog").filter({ hasText: /sign in/i });
    if (await wall.isVisible()) {
      test.info().annotations.push({
        type: "note",
        description: "Speak tab shows a sign-in prompt over the selected mission",
      });
    }
    await expect.poll(() => visitKeys(page, "1")).toContain("2");
  });

  test("7. Practice here stays on Core 30 with Match selected", async ({ page }) => {
    await openCore30(page, STARTED_TODAY);
    await openLesson1(page);
    const urlBefore = page.url();
    await expect(page.getByText(/^Step 2 — /)).toBeVisible();
    await stepButton(page, 2, /^Practice here/).click();
    // Same tab and URL, no jump to the generic Word Match tab.
    expect(page.url()).toBe(urlBefore);
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem("lt.app.v2") || "{}").currentTab),
      )
      .toBe("core30");
    await expect(page.getByTestId("lesson-practice-section")).toBeVisible();
    await expect(page.getByTestId("practice-mode-match")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("match-tile").first()).toBeVisible();
    // Opening the drill step is recorded (step index 1), still inside this lesson.
    await expect.poll(() => visitKeys(page, "1")).toContain("1");
    await expect(page.getByText("✕ Exit")).toBeVisible();
  });
});
