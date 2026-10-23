import { expect, test, type Page } from "@playwright/test";
import { appUrl, currentTab, readAppState, seedAppState } from "./app-state.ts";

// Core 60 (tab key core30) is a first-class tab in the desktop sidebar
// near the top and the phone's bottom bar. It holds the module's path: the free
// Foundation, Core 30 and Master 20.

async function openWithModule(page: Page, moduleId: string | null) {
  const savedModule = async () => (await readAppState(page)).activeModuleId ?? null;
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  // On a cold dev server the app can finish loading after the seed is written and
  // drop it, so seed again (up to three times) until the module sticks.
  for (let attempt = 0; attempt < 3; attempt++) {
    await seedAppState(page, { activeModuleId: moduleId, currentTab: "guide" });
    await page.goto(appUrl({ tab: "guide", module: moduleId }));
    await expect(
      page
        .getByRole("button", { name: /App Guide|Core 60/ })
        .or(page.getByText("More", { exact: true }))
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(2000);
    if ((await savedModule()) === moduleId) return;
  }
  expect(await savedModule()).toBe(moduleId);
}

test.describe("desktop navigation", () => {
  test.skip(({ isMobile }) => isMobile, "desktop-only layout checks");

  test("desktop has one feature menu in the sidebar", async ({ page }) => {
    await openWithModule(page, "orthopedics");
    await expect(page.getByRole("navigation", { name: "Desktop navigation" })).toBeVisible();
    await expect(page.locator("header nav")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Primary", exact: true })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Core 60", exact: true })).toHaveCount(1);
  });

  test("left sidebar puts Core 60 immediately after Modules", async ({ page }) => {
    await openWithModule(page, "orthopedics");
    const rail = page.locator("aside").first();
    const labels = (await rail.getByRole("button").allInnerTexts()).map((t) => t.trim());
    const modules = labels.findIndex((t) => /^modules$/i.test(t));
    expect(modules).toBeGreaterThan(-1);
    expect(labels[modules + 1]).toMatch(/core 60/i);
  });

  test("Core 60 opens from the sidebar and starts a lesson", async ({ page }) => {
    await openWithModule(page, "orthopedics");
    await page.getByRole("button", { name: "Core 60", exact: true }).first().click();
    await expect(page.getByText(/Core 60/).first()).toBeVisible();
    await expect.poll(() => currentTab(page)).toBe("core30");
    await expect(page.getByText(/lessons complete/i)).toBeVisible();
    await page.getByRole("button", { name: /Start Lesson 1/ }).click();
    await expect(page.getByText("✕ Exit")).toBeVisible();
    await expect(page.getByText(/^Step 1/)).toBeVisible();
    await page.getByText("✕ Exit").click();
    await expect(page.getByRole("button", { name: /Continue Lesson 1/ })).toBeVisible();
  });

  test("Core 60 opens from the sidebar", async ({ page }) => {
    await openWithModule(page, "orthopedics");
    await page
      .locator("aside")
      .first()
      .getByRole("button", { name: /core 60/i })
      .click();
    await expect.poll(() => currentTab(page)).toBe("core30");
    await expect(page.getByRole("button", { name: /Start Lesson 1/ })).toBeVisible();
  });
});

test("Core 60 without a module points to Modules", async ({ page, isMobile }) => {
  await openWithModule(page, null);
  await seedAppState(page, { currentTab: "core30" });
  await page.goto(appUrl({ tab: "core30" }));
  await expect(page.getByText(/Choose a module to start yours/i)).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Choose a module" }).click();
  await expect.poll(() => currentTab(page)).toBe("modules");
  expect(isMobile !== undefined).toBe(true);
});

test("phone: Core 60 is in the bottom bar and opens", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone-only");
  await openWithModule(page, "orthopedics");
  await page.getByText("Core 60", { exact: true }).filter({ visible: true }).last().tap();
  await expect.poll(() => currentTab(page)).toBe("core30");
  await expect(page.getByRole("button", { name: /Start Lesson 1/ })).toBeVisible();
});
