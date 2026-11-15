import { expect, test, type Page } from "@playwright/test";
import { appUrl, currentTab, readAppState, seedAppState } from "./app-state.ts";

async function openWithModule(page: Page, moduleId: string | null) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Speaking menu", exact: true })).toBeVisible();
  await seedAppState(page, { activeModuleId: moduleId, currentTab: "guide" });
  await page.goto(appUrl({ tab: "guide", module: moduleId }));
  await expect(page.getByRole("button", { name: "Navigation menu", exact: true })).toBeVisible();
  await expect.poll(async () => (await readAppState(page)).activeModuleId ?? null).toBe(moduleId);
}

async function openExplore(page: Page) {
  await page.getByRole("button", { name: "Navigation menu", exact: true }).click();
  const sheet = page.getByRole("dialog").filter({ hasText: "Explore" });
  await expect(sheet).toBeVisible();
  return sheet;
}

test("the Study screen keeps other features in one deeper navigation menu", async ({ page }) => {
  await openWithModule(page, "orthopedics");
  await expect(page.getByRole("navigation", { name: "Desktop navigation" })).not.toBeVisible();
  await expect(page.getByRole("navigation", { name: "Study and speak" })).toBeVisible();
  const menu = await openExplore(page);
  await expect(menu.getByRole("button", { name: "Core 60", exact: true })).toHaveCount(1);
  await expect(menu.getByRole("button", { name: "Modules", exact: true })).toBeVisible();
  await menu.getByRole("button", { name: "Games", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Lesson practice modes", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Study and speak", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Navigation menu", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Verbs", exact: true }).click();
  await expect.poll(() => currentTab(page)).toBe("verbs");
  await expect(
    page.getByRole("navigation", { name: "Lesson practice modes", exact: true }),
  ).toHaveCount(0);
});

test("the deeper Learn menu groups Core 60 before Modules", async ({ page }) => {
  await openWithModule(page, "orthopedics");
  const menu = await openExplore(page);
  const labels = (await menu.getByRole("button").allInnerTexts()).map((text) => text.trim());
  const core = labels.findIndex((text) => /^core 60$/i.test(text));
  expect(core).toBeGreaterThanOrEqual(0);
  expect(labels.findIndex((text) => /^modules$/i.test(text))).toBeGreaterThan(core);
});

test("Core 60 opens from the deeper menu, starts a lesson and returns to course lessons", async ({
  page,
}) => {
  await openWithModule(page, "orthopedics");
  const menu = await openExplore(page);
  await menu.getByRole("button", { name: "Core 60", exact: true }).click();
  await expect.poll(() => currentTab(page)).toBe("core30");
  await page.getByTestId("study-options").locator(":scope > summary").click();
  await expect(page.getByText(/lessons complete/i)).toBeVisible();
  await page.getByRole("button", { name: /Start Lesson 1/ }).click();
  await expect(
    page.getByRole("navigation", { name: "Lesson practice modes", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lesson details and goal", exact: true }).click();
  await page.getByRole("button", { name: "Course lessons", exact: true }).click();
  await expect(page.getByRole("button", { name: /Continue Lesson 1/ })).toBeVisible();
});

test("Core 60 without a module offers Spanish 101 and specialty selection", async ({ page }) => {
  await openWithModule(page, null);
  await seedAppState(page, { currentTab: "core30" });
  await page.goto(appUrl({ tab: "core30" }));
  await expect(
    page.getByRole("link", { name: "Start Spanish 101 · Foundation", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choose a module" }).click();
  await expect.poll(() => currentTab(page)).toBe("modules");
});
