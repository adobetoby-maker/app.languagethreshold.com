import { expect, test, type Page } from "@playwright/test";
import { MASTER_ROOFING_LESSONS } from "../src/data/master-roofing-curriculum";
import { appUrl, core30Key, seedAppState } from "./app-state";

// The Core 60 path (Foundation, Core 30, Master 20) at the top of every Roofing stage page, and
// the Roofing Master 20 page itself: 70-day plan, "Master · Lesson N" labels, grammar focus, no
// exams link. The Foundation page needs an account, so its half of the path is covered in
// foundation.spec.ts. Runs as a guest (the pilot is free); progress is seeded into the profile envelope.
//
// The assertions that need the Master lessons (the plan card's "Learn all 20 lessons", "Day 1 of
// 70" with a Lesson 1 to open, the grammar focus) are skipped while MASTER_ROOFING_LESSONS is
// empty and run as soon as the content lands.

const FOUNDATION = "foundation-roofing";
const MASTER = "master-roofing";
const HAS_MASTER_CONTENT = MASTER_ROOFING_LESSONS.length > 0;

const pad = (n: number) => String(n).padStart(2, "0");
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function masteredLog(count: number, startDate?: string) {
  const lessons: Record<string, unknown> = {};
  for (let n = 1; n <= count; n++) {
    lessons[String(n)] = { visits: {}, masteredAt: "2026-03-02T12:00:00.000Z" };
  }
  return { ...(startDate ? { startDate } : {}), lessons };
}

/**
 * Opens a module's Core 30 page with `core30Log` in the saved profile. The profile is written
 * after the first load and again (up to three times) until the app keeps it, because a cold dev
 * server can finish loading after the seed and save its own state over it.
 */
async function openStage(
  page: Page,
  moduleId: string,
  core30Log: Record<string, unknown>,
  ready: string,
) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    await seedAppState(page, {
      onboardingComplete: true,
      activeModuleId: moduleId,
      purchasedModules: [FOUNDATION, "roofing", MASTER],
      selectedLanguage: "Spanish",
      nativeLanguage: "English",
      currentTab: "core30",
      core30Log,
    });
    await page.goto(appUrl({ tab: "core30", module: moduleId }));
    await page
      .getByTestId(ready)
      .waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 })
      .catch(() => undefined);
    if (await page.getByTestId(ready).isVisible()) return;
  }
  await expect(page.getByTestId(ready)).toBeVisible();
}

test.describe("Core 60 path", () => {
  test("Roofing page: three steps in order, mastered counts, Core 30 is current", async ({ page }) => {
    await openStage(
      page,
      "roofing",
      {
        [core30Key(FOUNDATION)]: masteredLog(3),
        [core30Key("roofing")]: masteredLog(5, today()),
        [core30Key(MASTER)]: masteredLog(2),
      },
      "core60-path",
    );
    const path = page.getByTestId("core60-path");
    const steps = path.locator("li");
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(0)).toContainText("Foundation · 10 lessons · free");
    await expect(steps.nth(1)).toContainText("Core 30 · 30 lessons");
    await expect(steps.nth(2)).toContainText("Master 20 · 20 lessons");
    await expect(page.getByTestId("core60-step-foundation")).toContainText("3 / 10 mastered");
    await expect(page.getByTestId("core60-step-core")).toContainText("5 / 30 mastered");
    await expect(page.getByTestId("core60-step-master")).toContainText("2 / 20 mastered");

    // The current stage is not a button; the other two are.
    await expect(page.getByTestId("core60-step-core")).toHaveAttribute("aria-current", "step");
    await expect(page.getByTestId("core60-step-core")).not.toHaveJSProperty("tagName", "BUTTON");
    await expect(page.getByTestId("core60-step-foundation")).toHaveJSProperty("tagName", "BUTTON");
    await expect(page.getByTestId("core60-step-master")).toHaveJSProperty("tagName", "BUTTON");
    await expect(page.getByTestId("core60-step-foundation")).not.toHaveAttribute("aria-current");

    // The eyebrow names the trade and the step above the stage heading.
    await expect(page.getByTestId("core60-eyebrow")).toHaveText("Core 60 · Roofing · Step 2 of 3");

    // The two other steps say "Open"; the current one does not.
    await expect(page.getByTestId("core60-step-foundation")).toContainText("Open");
    await expect(page.getByTestId("core60-step-master")).toContainText("Open");
    await expect(page.getByTestId("core60-step-core")).not.toContainText("Open");

    // Side by side (sm and up) the three steps are the same height; stacked they simply stack.
    const rects = await steps.evaluateAll((items) => items.map((item) => {
        const box = item.getBoundingClientRect();
        return { top: box.top, height: box.height };
      }),
    );
    if (rects[0].top === rects[1].top) {
      expect(Math.abs(rects[0].height - rects[1].height)).toBeLessThanOrEqual(1);
      expect(Math.abs(rects[1].height - rects[2].height)).toBeLessThanOrEqual(1);
      const buttonHeights = await page
        .locator('[data-testid^="core60-step-"]:not([data-testid$="-count"])')
        .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
      expect(Math.abs(buttonHeights[0] - buttonHeights[1])).toBeLessThanOrEqual(1);
      expect(Math.abs(buttonHeights[1] - buttonHeights[2])).toBeLessThanOrEqual(1);
    } else {
      expect(rects[1].top).toBeGreaterThan(rects[0].top);
    }

    // Above the plan card, and nothing spills sideways at any width.
    const pathBox = await path.boundingBox();
    const planBox = await page.getByTestId("core30-plan-card").boundingBox();
    expect(pathBox!.y).toBeLessThan(planBox!.y);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("tapping Master opens the Master page, with its own heading, no exams and no How Core 30 works", async ({
    page,
  }) => {
    await openStage(page, "roofing", {}, "core60-path");
    await page.getByTestId("core60-step-master").click();
    await expect(page).toHaveURL(/module=master-roofing/);
    await expect(page.getByRole("heading", { name: "The Roofing Master 20" })).toBeVisible();
    await expect(page.getByTestId("core60-eyebrow")).toHaveText("Core 60 · Roofing · Step 3 of 3");
    await expect(page.getByText(/^By Lesson 20, you can train a new roofer/)).toBeVisible();
    await expect(page.getByTestId("core60-step-master")).toHaveAttribute("aria-current", "step");
    await expect(page.getByTestId("core60-step-core")).toHaveJSProperty("tagName", "BUTTON");
    await expect(page.getByText("Entrance, day 45 and day 90 exams")).toHaveCount(0);
    await expect(page.getByTestId("core30-how-link")).toHaveCount(0);
    // No beginner nudge off the Core 30 page.
    await expect(page.getByText("New to Spanish? Start here.")).toHaveCount(0);
    // The page banner names the stage.
    const banner = page.getByRole("region", { name: /purpose/i }).first();
    await expect(banner).toContainText("Core 60 · Master");
    await expect(banner).toContainText("Twenty lessons for the day that doesn't go as planned.");
    // The way back: Core 30 is a button again.
    await page.getByTestId("core60-step-core").click();
    await expect(page.getByRole("heading", { name: "The Roofing Foreman Core 30" })).toBeVisible();
  });
});

test.describe("Roofing Master 20 page", () => {
  test("a plan started today shows Day 1 of 70 and no exams prompt", async ({ page }) => {
    await openStage(page, MASTER, { [core30Key(MASTER)]: masteredLog(0, today()) }, "core30-plan-card");
    await expect(page.getByTestId("core30-plan-card")).toContainText("Day 1 of 70");
    await expect(page.getByText("Entrance, day 45 and day 90 exams")).toHaveCount(0);
  });
});

test.describe("Roofing Master 20 lessons", () => {
  test.skip(!HAS_MASTER_CONTENT, "Master lessons have not landed yet (MASTER_ROOFING_LESSONS is empty)");

  test("shows the 70-day plan, starts at Day 1 of 70, and Lesson 1 is a Master lesson with a grammar focus", async ({
    page,
  }) => {
    await openStage(page, MASTER, {}, "core30-plan-card");
    const card = page.getByTestId("core30-plan-card");
    await expect(card).toContainText("70-day plan");
    await expect(card).toContainText("Learn all 20 lessons in 70 days");
    await expect(card).toContainText("Two new lessons a week.");
    await expect(page.getByTestId("core30-start-plan")).toHaveText("Start my 70-day plan");
    await page.getByTestId("core30-start-plan").click();
    await expect(card).toContainText("Day 1 of 70");
    await expect(page.getByText(/Next Up · Master Lesson 1/)).toBeVisible();

    await page.getByRole("button", { name: /Today: Master Lesson 1|Start Master Lesson 1/ }).first().click();
    await expect(page.getByText("✕ Exit")).toBeVisible();
    await expect(page.getByText(/Master · Lesson 1 · /)).toBeVisible();
    // The runner's previous / next buttons carry the stage: "Master 2", not a bare "Lesson 2".
    const nav = page.getByTestId("lesson-nav-top");
    await expect(nav.getByRole("button", { name: "Master 2" })).toBeVisible();
    await expect(nav.getByRole("button", { name: /^Lesson / })).toHaveCount(0);
    if (MASTER_ROOFING_LESSONS[0].grammar) {
      const grammar = page.getByTestId("lesson-grammar-focus");
      await expect(grammar).toBeVisible();
      await expect(grammar).toContainText("Grammar focus");
      await expect(grammar).toContainText(MASTER_ROOFING_LESSONS[0].grammar.focus);
      for (const example of MASTER_ROOFING_LESSONS[0].grammar.examples) {
        await expect(grammar).toContainText(example.es);
        await expect(grammar).toContainText(example.en);
      }
    }
  });
});

test.describe("Grammar focus box", () => {
  test("is absent from a lesson without grammar (Roofing Lesson 1)", async ({ page }) => {
    await openStage(page, "roofing", { [core30Key("roofing")]: masteredLog(0, today()) }, "core30-plan-card");
    await page.getByRole("button", { name: /Today: Lesson 1|Start Lesson 1/ }).first().click();
    await expect(page.getByTestId("lesson-section-see")).toBeVisible();
    await expect(page.getByTestId("lesson-grammar-focus")).toHaveCount(0);
  });
});

test.describe("Core 30 page of a module without a Core 60 path", () => {
  test("the banner says the Core 30 is ready and the Foundation and Master 20 are coming soon", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
      timeout: 60_000,
    });
    for (let attempt = 0; attempt < 3; attempt++) {
      await seedAppState(page, {
        onboardingComplete: true,
        activeModuleId: "electrician",
        purchasedModules: ["electrician"],
        selectedLanguage: "Spanish",
        nativeLanguage: "English",
        currentTab: "core30",
      });
      await page.goto(appUrl({ tab: "core30", module: "electrician" }));
      const banner = page.getByRole("region", { name: /purpose/i }).first();
      await banner.waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 }).catch(() => undefined);
      if (await banner.isVisible()) break;
    }
    const banner = page.getByRole("region", { name: /purpose/i }).first();
    await expect(banner).toContainText(
      "Core 30 is ready for this module. The free Foundation and Master 20 are coming soon.",
    );
    await expect(banner).not.toContainText("Your module's Core 30");
    // No path card and no eyebrow on a trade without a Core 60 path.
    await expect(page.getByTestId("core60-path")).toHaveCount(0);
    await expect(page.getByTestId("core60-eyebrow")).toHaveCount(0);
  });
});
