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
async function openCore30(
  page: Page,
  log?: ModuleLog,
  moduleId: string = MODULE,
  language: string = "Spanish",
) {
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
      { id: moduleId, startDate: log?.startDate ?? null },
    );
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.evaluate(
      ({ id, seed, lang }) => {
        const state = JSON.parse(localStorage.getItem("lt.app.v2") || "{}");
        state.activeModuleId = id;
        state.selectedLanguage = lang;
        state.currentTab = "core30";
        state.lessonProgress = { ...(state.lessonProgress ?? {}), [id]: 0 };
        state.core30Log = seed ? { [id]: seed } : {};
        localStorage.setItem("lt.app.v2", JSON.stringify(state));
      },
      { id: moduleId, seed: log ?? null, lang: language },
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

/** Any tab the way a user reaches it: left rail on desktop, the More sheet on a phone. */
async function gotoTab(page: Page, isMobile: boolean, label: RegExp) {
  if (isMobile) {
    await page.getByText("More", { exact: true }).filter({ visible: true }).last().tap();
    const sheet = page.getByRole("dialog").filter({ hasText: "All Tabs" });
    const item = sheet.getByRole("button", { name: label }).first();
    await item.scrollIntoViewIfNeeded();
    await item.tap();
  } else {
    await page.locator("aside").first().getByRole("button", { name: label }).first().click();
  }
}

async function openLesson1(page: Page) {
  await page.getByRole("button", { name: /Today: Lesson 1/ }).click();
  await expect(page.getByText("✕ Exit")).toBeVisible();
  await expect(page.getByTestId("lesson-section-nav")).toBeVisible();
}

type Section = "see" | "recall" | "hear" | "type" | "say" | "write";

/** Opens one of the six ways of learning from the lesson's section nav. */
async function goSection(page: Page, section: Section) {
  await page.getByTestId(`lesson-nav-${section}`).click();
  await expect(page.getByTestId(`lesson-nav-${section}`)).toHaveAttribute("aria-current", "step");
}

const currentTabOf = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("lt.app.v2") || "{}").currentTab);

/** Opens the lesson's practice kit (Recall it) and waits for its heading. */
async function openRecall(page: Page, wordCount?: number) {
  await goSection(page, "recall");
  await expect(
    page.getByRole("heading", {
      name: wordCount
        ? `Practice this lesson's words (${wordCount})`
        : /Practice this lesson's words/,
    }),
  ).toBeVisible();
}

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

  test("2. See it: the passage reads inline, words are tappable, and use is recorded", async ({
    page,
  }) => {
    await openCore30(page, STARTED_TODAY);
    await openLesson1(page);
    // No Opened mark yet: seeing the section is not the same as using it.
    await expect(page.getByTestId("core30-step-opened")).toHaveCount(0);
    const reader = page.getByTestId("lesson-reader");
    await expect(reader).toBeVisible({ timeout: 60_000 });
    await expect(reader).toContainText("Primer día en el techo");
    await expect(reader).toContainText("Hoy es el primer día en la obra nueva.");
    expect(await reader.locator("[data-sentence-index]").count()).toBeGreaterThanOrEqual(8);
    // The passage is the lesson's Spanish text, tapped in place.
    const word = reader.locator(".lt-word", { hasText: /^techo$/ }).first();
    await expect(word).toBeVisible();
    await word.click();
    await expect(page.getByRole("dialog", { name: /Word details for/ })).toBeVisible();
    // Still on the Core 30 tab: no jump to the Reader.
    expect(await currentTabOf(page)).toBe("core30");
    await expect.poll(() => visitKeys(page, "1")).toEqual(["0"]);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /Word details for/ })).toHaveCount(0);
    const opened = page.getByTestId("core30-step-opened");
    await expect(opened).toHaveCount(1);
    await expect(opened).toContainText("Opened");
    const log = await readLog(page);
    expect(Date.parse(log!.lessons["1"].visits["0"])).not.toBeNaN();
  });

  test("2b. Open in full Reader goes there and the Back to Lesson pill returns", async ({
    page,
  }) => {
    await openCore30(page, STARTED_TODAY);
    await openLesson1(page);
    await expect(page.getByTestId("lesson-reader")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("lesson-open-full-reader").click();
    await expect.poll(() => currentTabOf(page)).toBe("reader");
    await expect.poll(() => visitKeys(page, "1")).toEqual(["0"]);
    const pill = page.getByTestId("lesson-return-pill");
    await expect(pill).toBeVisible();
    await expect(pill).toContainText("Back to Lesson 1");
    await pill.click();
    await expect.poll(() => currentTabOf(page)).toBe("core30");
    // The lesson reopens by itself, on See it.
    await expect(page.getByText("✕ Exit")).toBeVisible();
    await expect(page.getByTestId("lesson-nav-see")).toHaveAttribute("aria-current", "step");
    await expect(page.getByTestId("lesson-reader")).toBeVisible();
    await expect(page.getByTestId("core30-step-opened")).toHaveCount(1);
  });

  test("2c. a stale Reader trip does not pull a later Reader visit back to Core 30", async ({
    page,
    isMobile,
  }) => {
    await openCore30(page, STARTED_TODAY);
    await openLesson1(page);
    await expect(page.getByTestId("lesson-reader")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("lesson-open-full-reader").click();
    await expect.poll(() => currentTabOf(page)).toBe("reader");
    await expect(page.getByTestId("lesson-return-pill")).toBeVisible();
    const marker = () => page.evaluate(() => sessionStorage.getItem("lt.core30.returnTo"));
    expect(await marker()).not.toBeNull();

    // Leave for the Dictionary with the tab bar: the trip is over and the marker is gone.
    await gotoTab(page, isMobile, /^\s*(dictionary|dict\.?)\s*$/i);
    await expect.poll(() => currentTabOf(page)).toBe("dictionary");
    await expect.poll(marker).toBeNull();

    // Back to the Reader later: no Back to Lesson pill, and choosing another text stays put.
    await gotoTab(page, isMobile, /^\s*reader\s*$/i);
    await expect.poll(() => currentTabOf(page)).toBe("reader");
    await expect(page.getByTestId("lesson-return-pill")).toHaveCount(0);
    const next = page.getByRole("button", { name: "Next lesson" });
    await expect(next).toBeEnabled();
    await next.click();
    await page.waitForTimeout(1000);
    expect(await currentTabOf(page)).toBe("reader");
    await expect(page.getByTestId("lesson-return-pill")).toHaveCount(0);
  });

  test("2d. opening Core 30 any way spends a leftover return marker", async ({ page }) => {
    await openCore30(page, STARTED_TODAY);
    await openLesson1(page);
    await expect(page.getByTestId("lesson-reader")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("lesson-open-full-reader").click();
    await expect.poll(() => currentTabOf(page)).toBe("reader");
    expect(await page.evaluate(() => sessionStorage.getItem("lt.core30.returnTo"))).not.toBeNull();
    // A plain reload lands on the Core 30 tab again (as the App Guide would): the marker is spent.
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("lt.app.v2") || "{}");
      state.currentTab = "core30";
      localStorage.setItem("lt.app.v2", JSON.stringify(state));
    });
    await page.reload();
    await expect(page.getByTestId("core30-plan-card").or(page.getByText("✕ Exit"))).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("lt.core30.returnTo")))
      .toBeNull();
  });

  test("3. practice kit: study list, memory match, type", async ({ page }) => {
    await openCore30(page, STARTED_TODAY);
    await openLesson1(page);
    const total = LESSON_1_WORDS.length;
    await openRecall(page, total);
    const kit = page.getByTestId("practice-kit");
    await expect(kit).toBeVisible();

    // Recall opens on Cards; Study stays one tap away.
    await expect(kit.getByTestId("practice-mode-flashcards")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await kit.getByTestId("practice-mode-study").click();

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

    // Type: answer the first prompt with the correct Spanish. The section nav follows the kit.
    await goSection(page, "type");
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
    await page.getByTestId("core30-all-lessons-toggle").click();
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
    await page.getByTestId("core30-all-lessons-toggle").click();
    await page.getByRole("button", { name: /2\. Deck, Underlayment/ }).click();
    await expect(page.getByText("Needs practice — review again")).toBeVisible();
    await page.getByRole("button", { name: "I've mastered it again" }).click();
    await expect.poll(async () => (await readLog(page))?.lessons["2"]?.needsPractice).toBe(false);
    await expect(page.getByTestId("core30-mastered-status")).toContainText("Mastered on");
  });

  test("6. Say it opens the lesson mission on the Speak tab and Back to Lesson returns", async ({
    page,
  }) => {
    await openCore30(page, STARTED_TODAY);
    await openLesson1(page);
    await goSection(page, "say");
    await page.getByTestId("lesson-say-go").click();
    await expect.poll(() => currentTabOf(page)).toBe("speak");
    // The lesson's own mission is selected on the Speak tab.
    const mission = page.getByRole("heading", { name: /^Lesson 1:/ });
    await expect(mission).toBeVisible({ timeout: 60_000 });
    await expect(mission).toContainText("Name the Roof System");
    await expect.poll(() => visitKeys(page, "1")).toContain("2");
    const pill = page.getByTestId("lesson-return-pill");
    await expect(pill).toBeVisible();
    await expect(pill).toContainText("Back to Lesson 1");
    await pill.click();
    await expect.poll(() => currentTabOf(page)).toBe("core30");
    await expect(page.getByText("✕ Exit")).toBeVisible();
    await expect(page.getByTestId("lesson-nav-say")).toHaveAttribute("aria-current", "step");
    await expect(page.getByTestId("lesson-section-say")).toBeVisible();
    // The marker was used up: the lesson cleared it when it reopened.
    expect(await page.evaluate(() => sessionStorage.getItem("lt.core30.returnTo"))).toBeNull();
  });

  test("6b. leaving the lesson mission returns to Say it by itself", async ({ page }) => {
    await openCore30(page, STARTED_TODAY);
    await openLesson1(page);
    await goSection(page, "say");
    await page.getByTestId("lesson-say-go").click();
    await expect(page.getByRole("heading", { name: /^Lesson 1:/ })).toBeVisible({
      timeout: 60_000,
    });
    // Backing out of the mission (its setup screen has an All missions button) ends the trip.
    await page.getByRole("button", { name: /All missions/ }).click();
    await expect.poll(() => currentTabOf(page)).toBe("core30");
    await expect(page.getByTestId("lesson-nav-say")).toHaveAttribute("aria-current", "step");
    await expect(page.getByText("✕ Exit")).toBeVisible();
    await expect(page.getByTestId("lesson-return-pill")).toHaveCount(0);
  });

  test("7. Recall it stays on Core 30 with Cards open and Match one tap away", async ({ page }) => {
    await openCore30(page, STARTED_TODAY);
    await openLesson1(page);
    const urlBefore = page.url();
    await goSection(page, "recall");
    // Same tab and URL, no jump to the generic Word Match tab.
    expect(page.url()).toBe(urlBefore);
    expect(await currentTabOf(page)).toBe("core30");
    await expect(page.getByTestId("lesson-practice-section")).toBeVisible();
    await expect(page.getByTestId("practice-mode-flashcards")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.getByTestId("practice-mode-match").click();
    await expect(page.getByTestId("match-tile").first()).toBeVisible();
    await expect(page.getByTestId("lesson-nav-recall")).toHaveAttribute("aria-current", "step");
    // Opening the word-drill section is recorded (step index 1), still inside this lesson.
    await expect.poll(() => visitKeys(page, "1")).toContain("1");
    await expect(page.getByText("✕ Exit")).toBeVisible();
    // Hear it and Type it switch the same kit.
    await goSection(page, "hear");
    await expect(page.getByTestId("lesson-nav-hear")).toHaveAttribute("aria-current", "step");
    await expect(page.getByText("Listen, then pick the English meaning.")).toBeVisible();
    await goSection(page, "type");
    await expect(page.getByText("Type this in Spanish")).toBeVisible();
    // Inside a lesson there is no second six-way tab row or "ways to practice" counter, and
    // only Recall keeps a small Study / Cards / Match switch.
    await expect(page.getByText(/ways to practice/)).toHaveCount(0);
    await expect(page.getByRole("tablist", { name: "Practice mode" })).toHaveCount(0);
    await expect(page.getByTestId("practice-recall-switch")).toHaveCount(0);
    await goSection(page, "recall");
    await expect(page.getByTestId("practice-recall-switch")).toBeVisible();
    await expect(page.getByTestId("practice-mode-type")).toHaveCount(0);
  });

  test("7f. Next section scrolls the step bar clear of the sticky top bar", async ({ page }) => {
    await openCore30(page, STARTED_TODAY);
    await openLesson1(page);
    for (const section of ["recall", "hear"] as const) {
      const next = page.getByTestId("lesson-next-section").locator("visible=true").first();
      await next.scrollIntoViewIfNeeded();
      await next.click();
      await expect(page.getByTestId(`lesson-nav-${section}`)).toHaveAttribute(
        "aria-current",
        "step",
      );
      // Smooth scrolling settles; then the bar must sit at or below the top bar's bottom edge.
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const nav = document.querySelector('[data-testid="lesson-section-nav"]');
              const bar = document.querySelector("header.sticky");
              const barBottom =
                bar && getComputedStyle(bar).display !== "none"
                  ? bar.getBoundingClientRect().bottom
                  : 0;
              const top = nav ? nav.getBoundingClientRect().top : -999;
              return Math.round(top - barBottom);
            }),
          { timeout: 5000 },
        )
        .toBeGreaterThanOrEqual(0);
    }
  });

  test("7b. Previous and Next lesson open the neighbours in place", async ({ page }) => {
    await openCore30(page, STARTED_TODAY);
    await openLesson1(page);
    const top = page.getByTestId("lesson-nav-top");
    const bottom = page.getByTestId("lesson-nav-bottom");
    // Lesson 1 has no previous lesson.
    await expect(top.getByRole("button", { name: /^Lesson 1$/ })).toBeDisabled();
    await expect(bottom.getByRole("button", { name: /^Lesson 1$/ })).toBeDisabled();
    await top.getByRole("button", { name: /^Lesson 2$/ }).click();
    await expect(page.getByRole("heading", { name: "Deck, Underlayment & Edges" })).toBeVisible();
    await expect(page.getByText("✕ Exit")).toBeVisible();
    expect(await currentTabOf(page)).toBe("core30");
    await bottom.getByRole("button", { name: /^Lesson 3$/ }).click();
    await expect(page.getByRole("heading", { name: "Flashing & Valleys" })).toBeVisible();
    await top.getByRole("button", { name: /^Lesson 2$/ }).click();
    await expect(page.getByRole("heading", { name: "Deck, Underlayment & Edges" })).toBeVisible();
    await top.getByRole("button", { name: /^Lesson 1$/ }).click();
    await expect(page.getByRole("heading", { name: "Name the Roof System" })).toBeVisible();
    await expect(top.getByRole("button", { name: /^Lesson 1$/ })).toBeDisabled();
  });

  test("7c. the Core 30 header opens How Core 30 works in place, with Back", async ({ page }) => {
    await openCore30(page, STARTED_TODAY);
    await page.getByTestId("core30-how-link").click();
    await expect(page.getByTestId("core30-philosophy")).toBeVisible();
    expect(await currentTabOf(page)).toBe("core30");
    await page.getByTestId("core30-philosophy-back").click();
    await expect(page.getByTestId("core30-philosophy")).toHaveCount(0);
    await expect(page.getByTestId("core30-plan-card")).toBeVisible();
  });

  test("7e. How Core 30 works follows the module: no roofing-crew promise elsewhere", async ({
    page,
  }) => {
    await openCore30(page, undefined, "orthopedics");
    await page.getByTestId("core30-how-link").click();
    const page30 = page.getByTestId("core30-philosophy");
    await expect(page30).toBeVisible();
    for (const id of ["see", "recall", "hear", "type", "say", "write"]) {
      await expect(page.getByTestId(`core30-way-${id}`)).toBeVisible();
    }
    await expect(page30).toContainText("without switching languages");
    await expect(page30).toContainText("The Clinical Core 30");
    await expect(page30).toContainText("Example from the Roofing Foreman course");
    await expect(page30).not.toContainText("roofing crew");
    await expect(page30).not.toContainText("built from the Roofing Foreman course");
    await expect(page30).toContainText("speaking mission, word lookup, and having the app read");
  });

  test("7d. the App Guide card opens Core 30 on How it works", async ({ page }) => {
    await openCore30(page, STARTED_TODAY);
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("lt.app.v2") || "{}");
      state.currentTab = "guide";
      localStorage.setItem("lt.app.v2", JSON.stringify(state));
    });
    await page.reload();
    const card = page.getByTestId("guide-core30-how");
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await expect.poll(() => currentTabOf(page)).toBe("core30");
    await expect(page.getByTestId("core30-philosophy")).toBeVisible();
  });
});

// ─── A lesson with no authored words: the list comes from the server function ────────────
// The server function is stubbed with page.route, so these tests need no API key or network.

/** Builds the seroval-encoded body TanStack Start returns for a server function result. */
function serverFnBody(result: {
  words?: Array<Record<string, string>>;
  lang?: string;
  error?: string;
}) {
  let id = 0;
  const str = (s: string) => ({ t: 1, s });
  const obj = (entries: Array<[string, unknown]>) => ({
    t: 10,
    i: ++id,
    p: { k: entries.map(([k]) => k), v: entries.map(([, v]) => v) },
    o: 0,
  });
  const nil = { t: 2, s: 0 };
  const undef = { t: 2, s: 1 };
  const words = result.words
    ? {
        t: 9,
        i: ++id,
        a: result.words.map((w) => obj(Object.entries(w).map(([k, v]) => [k, str(v)]))),
      }
    : nil;
  const payload = obj([
    ["words", words],
    ["lang", result.lang ? str(result.lang) : undef],
    ["error", result.error ? str(result.error) : nil],
  ]);
  return JSON.stringify({
    t: 10,
    i: 0,
    p: {
      k: ["result", "error", "context"],
      v: [payload, undef, { t: 11, i: ++id, p: { k: [], v: [] }, o: 0 }],
    },
    o: 0,
  });
}

const STUB_WORDS = [
  ...Array.from({ length: 8 }, (_, i) => ({
    en: `stub term ${i + 1}`,
    es: `término simulado ${i + 1}`,
    kind: "term",
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    en: `stub phrase ${i + 1}`,
    es: `frase simulada ${i + 1}`,
    kind: "phrase",
  })),
];

/** Answers the lesson-words server function; `respond` is called once per request. */
async function stubLessonWords(
  page: Page,
  respond: (n: number) => Parameters<typeof serverFnBody>[0],
) {
  const requests: string[] = [];
  // These tests are about live generation, so no pre-built deck may answer for the lesson.
  await page.route("**/lesson-decks/**", (route) => route.fulfill({ status: 404, body: "" }));
  await page.route("**/_serverFn/**", async (route) => {
    const body = route.request().postData() ?? "";
    if (!body.includes("lessonNumber")) return route.fallback();
    requests.push(body);
    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json", "x-tss-serialized": "true" },
      body: serverFnBody(respond(requests.length)),
    });
  });
  return requests;
}

async function openOrthopedicsLesson1(page: Page) {
  await openCore30(page, undefined, "orthopedics");
  await page.getByRole("button", { name: /Start Lesson 1/ }).click();
  await expect(page.getByText("✕ Exit")).toBeVisible();
  await goSection(page, "recall");
}

test.describe("Core 30 plan: generated lesson words (Orthopedics, no authored list)", () => {
  // The service worker would answer deck requests itself, past page.route.
  test.use({ serviceWorkers: "block" });
  test("8. the practice kit shows the generated words and Match plays them", async ({ page }) => {
    const requests = await stubLessonWords(page, () => ({ words: STUB_WORDS, lang: "Spanish" }));
    await openOrthopedicsLesson1(page);

    await expect(
      page.getByRole("heading", { name: `Practice this lesson's words (${STUB_WORDS.length})` }),
    ).toBeVisible();
    const kit = page.getByTestId("practice-kit");
    // Recall opens on Cards; the Study list is one tap away.
    await kit.getByTestId("practice-mode-study").click();
    const panel = kit.getByRole("tabpanel");
    await expect(panel.locator('li p[lang="es"]')).toHaveCount(STUB_WORDS.length);
    expect((await panel.locator('li p[lang="es"]').allInnerTexts()).sort()).toEqual(
      STUB_WORDS.map((w) => w.es).sort(),
    );
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain("orthopedics");

    // Match uses the 8 stubbed terms only.
    await kit.getByTestId("practice-mode-match").click();
    const terms = STUB_WORDS.filter((w) => w.kind === "term");
    await expect(kit.getByText(`0 / ${terms.length} pairs`)).toBeVisible();
    const enOf = new Map(terms.map((w) => [w.es, w.en]));
    const tiles = kit.getByTestId("match-tile");
    await expect(tiles).toHaveCount(terms.length * 2);
    for (const term of terms) {
      const view = await tiles.evaluateAll((els) =>
        els.map((el, index) => ({
          index,
          lang: (el as HTMLElement).lang,
          text: (el.textContent ?? "").trim(),
          matched: (el as HTMLElement).dataset.matched === "true",
        })),
      );
      const es = view.find((t) => !t.matched && t.lang === "es" && enOf.has(t.text));
      expect(es, `an open tile for ${term.es}`).toBeTruthy();
      const partner = view.find(
        (t) => !t.matched && t.lang === "en" && t.text === enOf.get(es!.text),
      );
      expect(partner).toBeTruthy();
      await tiles.nth(es!.index).click();
      await tiles.nth(partner!.index).click();
      await expect(tiles.nth(partner!.index)).toHaveAttribute("data-matched", "true");
    }
    await expect(kit.getByText(new RegExp(`All ${terms.length} terms matched`))).toBeVisible();

    // A second visit (page reload, lesson reopened) reads the cached list: no new request.
    await page.reload();
    await expect(page.getByTestId("core30-plan-card")).toBeVisible();
    await page.getByRole("button", { name: /Start Lesson 1/ }).click();
    await expect(page.getByText("✕ Exit")).toBeVisible();
    await goSection(page, "recall");
    await expect(
      page.getByRole("heading", { name: `Practice this lesson's words (${STUB_WORDS.length})` }),
    ).toBeVisible();
    expect(requests).toHaveLength(1);
  });

  test("9. a failed word list shows Retry, and Retry builds the kit", async ({ page }) => {
    const requests = await stubLessonWords(page, (n) =>
      n === 1 ? { error: "Word list failed" } : { words: STUB_WORDS, lang: "Spanish" },
    );
    await openOrthopedicsLesson1(page);
    await expect(page.getByText("Couldn't build the word list")).toBeVisible();
    await expect(page.getByTestId("practice-kit")).toHaveCount(0);
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(
      page.getByRole("heading", { name: `Practice this lesson's words (${STUB_WORDS.length})` }),
    ).toBeVisible();
    await expect(page.getByText("Couldn't build the word list")).toHaveCount(0);
    expect(requests).toHaveLength(2);
  });
});

const DECK_MODULE = "construction-foreman";
const deckWords = (tag: string) => [
  ...Array.from({ length: 8 }, (_, i) => ({
    en: `deck term ${i + 1}`,
    es: `${tag} terme ${i + 1}`,
    kind: "term",
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    en: `deck phrase ${i + 1}`,
    es: `${tag} phrase ${i + 1}`,
    kind: "phrase",
  })),
];

test.describe("Core 30 plan: pre-built static deck (Construction Foreman, French)", () => {
  test.use({ serviceWorkers: "block" });
  test("10. the kit renders words from the static deck with no server-function call", async ({
    page,
  }) => {
    const deck = {
      version: 1,
      module: DECK_MODULE,
      language: "French",
      nativeLanguage: "English",
      model: "stub",
      generatedAt: "2026-10-15T00:00:00.000Z",
      lessons: { "1": deckWords("un"), "2": deckWords("deux") },
    };
    const deckRequests: string[] = [];
    const serverFnRequests: string[] = [];
    await page.route("**/lesson-decks/**", async (route) => {
      const url = route.request().url();
      deckRequests.push(url);
      if (url.endsWith(`/lesson-decks/fr/${DECK_MODULE}.json`)) {
        await route.fulfill({
          status: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(deck),
        });
      } else {
        await route.fulfill({ status: 404, body: "" });
      }
    });
    await page.route("**/_serverFn/**", async (route) => {
      const body = route.request().postData() ?? "";
      if (body.includes("lessonNumber")) serverFnRequests.push(body);
      await route.fallback();
    });

    await openCore30(page, undefined, DECK_MODULE, "French");
    await page.getByRole("button", { name: /Start Lesson 1/ }).click();
    await expect(page.getByText("✕ Exit")).toBeVisible();
    await goSection(page, "recall");

    await expect(
      page.getByRole("heading", { name: "Practice this lesson's words (12)" }),
    ).toBeVisible();
    await page.getByTestId("practice-mode-study").click();
    const panel = page.getByTestId("practice-kit").getByRole("tabpanel");
    await expect(panel.locator('li p[lang="fr"]')).toHaveCount(12);
    expect((await panel.locator('li p[lang="fr"]').allInnerTexts()).sort()).toEqual(
      deck.lessons["1"].map((w) => w.es).sort(),
    );

    // The whole module deck is one file, fetched once; the lesson words server fn is never used.
    expect(deckRequests.filter((url) => url.endsWith(`/fr/${DECK_MODULE}.json`))).toHaveLength(1);
    expect(serverFnRequests).toHaveLength(0);
  });
});
