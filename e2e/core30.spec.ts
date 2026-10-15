import { expect, test, type Page } from "@playwright/test";

// Core 30 is a first-class tab: top navigation next to App Guide, and the left
// sidebar under Games. It teaches the module's 30-lesson path.

async function openWithModule(page: Page, moduleId: string | null) {
  const savedModule = () =>
    page.evaluate(
      () => JSON.parse(localStorage.getItem("lt.app.v2") || "{}").activeModuleId ?? null,
    );
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  // On a cold dev server the app can finish loading after the seed is written and
  // drop it, so seed again (up to three times) until the module sticks.
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.evaluate((id) => {
      const state = JSON.parse(localStorage.getItem("lt.app.v2") || "{}");
      state.activeModuleId = id;
      state.currentTab = "guide";
      localStorage.setItem("lt.app.v2", JSON.stringify(state));
    }, moduleId);
    await page.reload();
    await expect(
      page
        .getByRole("button", { name: /App Guide|Core 30/ })
        .or(page.getByText("More", { exact: true }))
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(2000);
    if ((await savedModule()) === moduleId) return;
  }
  expect(await savedModule()).toBe(moduleId);
}

const currentTab = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("lt.app.v2") || "{}").currentTab);

test.describe("desktop navigation", () => {
  test.skip(({ isMobile }) => isMobile, "desktop-only layout checks");

  test("top bar has Core 30 right after App Guide", async ({ page }) => {
    await openWithModule(page, "orthopedics");
    const labels = await page.locator("nav button").allInnerTexts();
    const guide = labels.findIndex((t) => /app guide/i.test(t));
    expect(guide).toBeGreaterThan(-1);
    expect(labels[guide + 1]).toMatch(/core 30/i);
  });

  test("left sidebar has Core 30 right under Games", async ({ page }) => {
    await openWithModule(page, "orthopedics");
    const rail = page.locator("aside").first();
    const labels = (await rail.getByRole("button").allInnerTexts()).map((t) => t.trim());
    const games = labels.findIndex((t) => /^games$/i.test(t));
    expect(games).toBeGreaterThan(-1);
    expect(labels[games + 1]).toMatch(/core 30/i);
  });

  test("Core 30 opens from the top bar and starts a lesson", async ({ page }) => {
    await openWithModule(page, "orthopedics");
    await page.getByRole("button", { name: "Core 30", exact: true }).first().click();
    await expect(page.getByText(/Core 30/).first()).toBeVisible();
    await expect.poll(() => currentTab(page)).toBe("core30");
    await expect(page.getByText(/lessons complete/i)).toBeVisible();
    await page.getByRole("button", { name: /Start Lesson 1/ }).click();
    await expect(page.getByText("✕ Exit")).toBeVisible();
    await expect(page.getByText(/^Step 1/)).toBeVisible();
    await page.getByText("✕ Exit").click();
    await expect(page.getByRole("button", { name: /Start Lesson 1/ })).toBeVisible();
  });

  test("Core 30 opens from the sidebar", async ({ page }) => {
    await openWithModule(page, "orthopedics");
    await page
      .locator("aside")
      .first()
      .getByRole("button", { name: /core 30/i })
      .click();
    await expect.poll(() => currentTab(page)).toBe("core30");
    await expect(page.getByRole("button", { name: /Start Lesson 1/ })).toBeVisible();
  });
});

test("Core 30 without a module points to Modules", async ({ page, isMobile }) => {
  await openWithModule(page, null);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("lt.app.v2") || "{}");
    state.currentTab = "core30";
    localStorage.setItem("lt.app.v2", JSON.stringify(state));
  });
  await page.reload();
  await expect(page.getByText(/Choose a module to start yours/i)).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Choose a module" }).click();
  await expect.poll(() => currentTab(page)).toBe("modules");
  expect(isMobile !== undefined).toBe(true);
});

test("phone: Core 30 is in the More menu and opens", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phone-only");
  await openWithModule(page, "orthopedics");
  await page.getByText("More", { exact: true }).filter({ visible: true }).last().tap();
  const sheet = page.getByRole("dialog").filter({ hasText: "All Tabs" });
  const item = sheet.getByRole("button", { name: /core 30/i }).first();
  await item.scrollIntoViewIfNeeded();
  await item.tap();
  await expect.poll(() => currentTab(page)).toBe("core30");
  await expect(page.getByRole("button", { name: /Start Lesson 1/ })).toBeVisible();
});
