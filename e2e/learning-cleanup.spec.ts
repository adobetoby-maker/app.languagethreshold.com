import { expect, test } from "@playwright/test";
import { appUrl, core30Key, readAppState, seedAppState } from "./app-state";
import { lessonPositionKey } from "../src/lib/lesson-drafts";

test("Continue is first and resumes the saved step without rewriting mastery", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible();
  const log = { lessons: { "1": { masteredAt: "2026-10-20T12:00:00Z", visits: {} } } };
  await seedAppState(page, {
    activeModuleId: "roofing",
    currentTab: "core30",
    onboardingComplete: true,
    lessonProgress: { [core30Key("roofing")]: 1 },
    core30Log: { [core30Key("roofing")]: log },
  });
  await page.evaluate(
    ({ key }) =>
      sessionStorage.setItem(
        key,
        JSON.stringify({
          lesson: 2,
          way: "hear",
          at: "2026-10-23T12:00:00Z",
        }),
      ),
    { key: lessonPositionKey("anonymous", "roofing", "Spanish", "English") },
  );
  await page.goto(appUrl({ tab: "core30", module: "roofing" }));
  const card = page.getByTestId("continue-learning");
  await expect(card).toContainText("Continue learning");
  const next = card.getByRole("button", { name: /Continue Lesson/ });
  await expect(next).toBeInViewport();
  expect(await card.evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(250);
  await expect(card.locator("details")).not.toHaveAttribute("open", "");
  expect((await readAppState(page)).core30Log).toEqual({ [core30Key("roofing")]: log });
  await page.screenshot({ path: `test-results/cleanup-${info.project.name}.png` });
  await next.click();
  await expect(page).toHaveURL(/lesson=2/);
  await expect(page).toHaveURL(/way=hear/);
  await page.reload();
  await expect(page).toHaveURL(/lesson=2.*way=hear|way=hear.*lesson=2/);
  const after = await readAppState(page);
  expect(
    (after.core30Log as Record<string, typeof log>)[core30Key("roofing")].lessons["1"].masteredAt,
  ).toBe(log.lessons["1"].masteredAt);
  expect(after.lessonProgress).toEqual({ [core30Key("roofing")]: 1 });
});

test("compact preferences retain accent and appearance controls", async ({ page, isMobile }) => {
  await page.goto(appUrl({ tab: "reader" }));
  if (isMobile) {
    await page.getByRole("button", { name: "App settings", exact: true }).click();
    await expect(page.getByLabel("Accent and microphone language")).toBeVisible();
    await expect(page.getByRole("button", { name: /Appearance/ })).toBeVisible();
    await expect(page.getByText("Your account", { exact: true })).toBeVisible();
  } else {
    await page.getByRole("button", { name: "Learning settings", exact: true }).click();
    await expect(page.getByLabel("Accent and microphone language")).toBeVisible();
    await expect(page.getByText("Appearance", { exact: true })).toBeVisible();
    await page.getByTitle("Native language: English").click();
    await expect(page.getByRole("menuitem", { name: /French/ })).toBeVisible();
  }
});

test("new lesson entry ignores a resume from another language", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible();
  await seedAppState(page, {
    activeModuleId: "roofing",
    currentTab: "core30",
    onboardingComplete: true,
  });
  await page.evaluate(
    ({ key }) =>
      sessionStorage.setItem(
        key,
        JSON.stringify({ lesson: 8, way: "write", at: "2026-10-23T12:00:00Z" }),
      ),
    { key: lessonPositionKey("anonymous", "roofing", "French", "English") },
  );
  await page.goto(appUrl({ tab: "core30", module: "roofing" }));
  const card = page.getByTestId("continue-learning");
  await expect(card).toContainText("Your next lesson");
  await card.getByRole("button", { name: "Start Lesson 1", exact: true }).click();
  await expect(page).toHaveURL(/lesson=1/);
});

test("started Core 60 overview puts next lesson in one compact button", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible();
  const log = { startDate: new Date().toISOString().slice(0, 10), lessons: {} };
  await seedAppState(page, {
    activeModuleId: "roofing",
    currentTab: "core30",
    onboardingComplete: true,
    core30Log: { [core30Key("roofing")]: log },
  });
  await page.goto(appUrl({ tab: "core30", module: "roofing" }));
  const card = page.getByTestId("continue-learning");
  await expect(
    card.getByRole("button", { name: /Start Lesson 1.*Name the Roof System/ }),
  ).toBeVisible();
  await expect(card).not.toContainText("Goal:");
  await expect(card).not.toContainText("Six ways to practice");
  const before = await readAppState(page);
  expect(before.core30Log).toEqual({ [core30Key("roofing")]: log });
  await card.getByRole("button", { name: /Start Lesson 1.*Name the Roof System/ }).click();
  await expect(page).toHaveURL(/lesson=1/);
  if (await page.getByTestId("lesson-quick-next").isVisible()) {
    await expect(page.getByText("Goal:", { exact: true })).toBeHidden();
  }
  const after = await readAppState(page);
  expect(after.lessonProgress).toEqual(before.lessonProgress);
  expect(JSON.stringify(after.core30Log)).not.toContain("masteredAt");
});

test("phone Core 60 lesson gives the screen to practice and opens navigation on demand", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile);
  await page.goto("/?tab=core30&module=roofing&target=Spanish&native=English&lesson=1&way=recall");
  await expect(page.getByTestId("practice-mode-study")).toBeVisible();
  const primary = page.getByRole("navigation", { name: "Primary", exact: true });
  const menu = page.getByRole("button", { name: "Navigation, language and module" });
  const next = page.getByTestId("lesson-quick-next");
  await expect(primary).toBeHidden();
  await expect(menu).toBeVisible();
  await expect(next).toContainText("Next lesson");
  await expect(next).toBeInViewport();
  const before = await readAppState(page);
  await menu.click();
  await expect(primary).toBeVisible();
  await expect(primary.getByRole("button", { name: "Hide navigation" })).toContainText(
    "Back to lesson",
  );
  await primary.getByRole("button", { name: "Hide navigation" }).click();
  await expect(primary).toBeHidden();
  await next.click();
  await expect(page).toHaveURL(/lesson=2/);
  const after = await readAppState(page);
  expect(after.lessonProgress).toEqual(before.lessonProgress);
  expect(JSON.stringify(after.core30Log)).not.toContain("masteredAt");
});
