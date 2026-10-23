import { expect, test } from "@playwright/test";
import { appUrl, core30Key, readAppState, seedAppState } from "./app-state";

test("one desktop menu retains tools and utilities; phone navigation stays familiar", async ({
  page,
  isMobile,
}, info) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible();
  const log = { lessons: { "1": { masteredAt: "2026-10-20T12:00:00Z", visits: {} } } };
  await seedAppState(page, {
    activeModuleId: "roofing",
    currentTab: "core30",
    onboardingComplete: true,
    core30Log: { [core30Key("roofing")]: log },
    lessonProgress: { [core30Key("roofing")]: 1 },
  });
  await page.goto(appUrl({ tab: "core30", module: "roofing" }));
  await expect(page.getByTestId("continue-learning")).toBeVisible();
  const sidebar = page.getByRole("navigation", { name: "Desktop navigation" });
  const bottom = page.getByRole("navigation", { name: "Primary", exact: true });
  if (isMobile) {
    await expect(sidebar).not.toBeVisible();
    await expect(page.locator("header")).not.toBeVisible();
    await expect(bottom).toBeVisible();
    expect(
      await bottom.locator("div.flex.items-center.justify-around > button").allTextContents(),
    ).toEqual(["More", "Reader", "Cards", "Grammar", "Games", "Speak", "Core 60", "Tutor"]);
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--lt-nav-height").trim(),
      ),
    ).toBe("6.5rem");
    await page.screenshot({ path: `test-results/navigation-${info.project.name}.png` });
    // A touch tablet keeps the phone navigation even above the desktop width threshold.
    await page.setViewportSize({ width: 1024, height: 1366 });
    await expect(bottom).toBeVisible();
    await expect(sidebar).not.toBeVisible();
  } else {
    await expect(sidebar).toBeVisible();
    await expect(bottom).not.toBeVisible();
    await expect(page.locator("header nav")).toHaveCount(0);
    for (const label of [
      "Reader",
      "Cards",
      "Grammar",
      "Games",
      "Speak",
      "Core 60",
      "Modules",
      "Anatomy",
    ]) {
      await expect(sidebar.getByRole("button", { name: label, exact: true })).toHaveCount(1);
    }
    for (const width of [1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator("header")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(0);
      expect(
        await page.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue("--lt-nav-height").trim(),
        ),
      ).toBe("0rem");
      await page.screenshot({ path: `test-results/navigation-desktop-${width}.png` });
    }
    await page
      .getByRole("button", { name: "Add a word to My Vocab from this page", exact: true })
      .filter({ visible: true })
      .click();
    await expect(page.getByRole("dialog", { name: "Add to My Vocab" })).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Open AI Tutor", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Language Threshold Tutor" })).toBeVisible();
    await page.getByRole("button", { name: "Minimize tutor" }).click();
    await sidebar.getByRole("button", { name: "Reader", exact: true }).click();
    await expect(page).toHaveURL(/tab=reader/);
    await sidebar.getByRole("button", { name: "Core 60", exact: true }).click();
    await expect(page).toHaveURL(/tab=core30/);
    await expect(sidebar.getByRole("button", { name: "Core 60", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
  const after = await readAppState(page);
  expect(after.core30Log).toEqual({ [core30Key("roofing")]: log });
  expect(after.lessonProgress).toEqual({ [core30Key("roofing")]: 1 });
});

test("desktop keeps the Japanese-only Kana entry in the sidebar", async ({ page, isMobile }) => {
  test.skip(isMobile, "phone menu is intentionally unchanged");
  await page.goto(appUrl({ tab: "reader", target: "Japanese" }));
  const sidebar = page.getByRole("navigation", { name: "Desktop navigation" });
  await expect(sidebar.getByRole("button", { name: "Kana Pad", exact: true })).toBeVisible();
  await sidebar.getByRole("button", { name: "Kana Pad", exact: true }).click();
  await expect(page).toHaveURL(/tab=kana/);
});
