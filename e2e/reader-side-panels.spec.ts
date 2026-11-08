import { expect, test } from "@playwright/test";
import { appUrl } from "./app-state";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("lt.languageChosen", "1");
    localStorage.setItem("lt.profile-device.v1.guest", JSON.stringify({
      schema: 1,
      userId: null,
      data: {
        activeModuleId: null,
        selectedLanguage: "Spanish",
        nativeLanguage: "English",
        currentTab: "reader",
        onboardingComplete: true,
      },
    }));
  });
  await page.setViewportSize({ width: 2560, height: 1200 });
  await page.goto(appUrl({ tab: "reader" }));
  await expect(page.locator('p[data-pane="right"] .lt-word').first()).toBeVisible();
});

test("word details follow their reading pane and the tutor leaves text scrollable", async ({ page }) => {
  const word = page.locator('[data-reader-panel="word"]');
  const tutor = page.getByRole("dialog", { name: "Language Threshold Tutor" });
  const reading = page.getByRole("region", { name: "Selected reading" });
  await page.locator('p[data-pane="left"] .lt-word').first().click();
  await expect(word).toHaveAttribute("data-reader-panel-side", "left");
  const leftBox = (await word.boundingBox())!;
  expect(leftBox.x + leftBox.width).toBeLessThan((await reading.boundingBox())!.x);

  // Opening via the existing event keeps the dictionary open as well.
  await page.evaluate(() => window.dispatchEvent(new Event("lt:open-tutor")));
  await expect(tutor).toHaveAttribute("data-reader-panel-side", "right");
  await expect(tutor).not.toHaveAttribute("aria-modal", "true");
  await page.locator('p[data-pane="right"] .lt-word').first().click();
  await expect(word).toHaveAttribute("data-reader-panel-side", "right");
  await expect(tutor).toHaveAttribute("data-reader-panel-side", "left");
  const rightBox = (await word.boundingBox())!;
  const readingBox = (await reading.boundingBox())!;
  expect(rightBox.x).toBeGreaterThan(readingBox.x + readingBox.width);

  const workspace = page.locator("#learning-space");
  const before = await page.evaluate(() => window.scrollY);
  await workspace.hover({ position: { x: 600, y: 200 } });
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  await expect(tutor).toBeVisible();
  const tutorBox = (await tutor.boundingBox())!;
  expect(tutorBox.y).toBeGreaterThanOrEqual(0);
  expect(tutorBox.y + tutorBox.height).toBeLessThanOrEqual(1200);
  await page.getByRole("button", { name: "Close tutor" }).click();
  await expect(tutor).not.toBeVisible();
  await expect(word).toBeVisible();
});

test("resizing keeps the compact dictionary and tutor inside a small screen", async ({ page }) => {
  const word = page.locator('[data-reader-panel="word"]');
  await page.locator('p[data-pane="right"] .lt-word').first().click();
  await expect(word).toHaveAttribute("data-reader-panel-side", "right");
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await expect(word).not.toHaveAttribute("data-reader-panel-side");
    await expect.poll(async () => {
      const box = (await word.boundingBox())!;
      return box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height;
    }).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(word).not.toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("lt:open-tutor")));
  const tutor = page.getByRole("dialog", { name: "Language Threshold Tutor" });
  await expect(tutor).toHaveAttribute("aria-modal", "true");
  await expect(tutor).not.toHaveAttribute("data-reader-panel-side");
  await page.keyboard.press("Escape");
  await expect(tutor).not.toBeVisible();
});
