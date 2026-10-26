import { expect, test, type Page } from "@playwright/test";

// No provider credentials or paid calls: the signed-out mission setup is enough
// to reproduce the long page whose fixed bar overlapped the iPad screenshot.
for (const device of [
  { name: "iPad", width: 1024, height: 1366 },
  { name: "iPhone", width: 390, height: 844 },
]) {
  test.describe(`${device.name} navigation`, () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      viewport: { width: device.width, height: device.height },
      storageState: { cookies: [], origins: [] },
    });

    test("reserves space below the mission through scrolling, resizing and rotation", async ({
      page,
    }) => {
      await page.addInitScript(() => {
        localStorage.setItem("lt.languageChosen", "1");
        localStorage.setItem(
          "lt.profile-device.v1.guest",
          JSON.stringify({
            schema: 1,
            userId: null,
            data: {
              onboardingComplete: true,
              currentTab: "speak",
              selectedLanguage: "Spanish",
              nativeLanguage: "English",
              activeModuleId: "core",
            },
          }),
        );
      });
      await page.goto("/?tab=speak&module=core&target=Spanish&native=English");
      const nav = page.getByRole("navigation", { name: "Primary", exact: true });
      await page
        .getByRole("button")
        .filter({ has: page.getByRole("heading", { name: /Core Speaking/, level: 3 }) })
        .click();
      await page.getByTestId("speaking-mission-card").first().click();
      await expect(page.getByText("Choose conversation partner", { exact: true })).toBeVisible();
      await expectLayout(page);
      const start = page.getByRole("button", { name: "Sign in to start mission", exact: true });
      await start.scrollIntoViewIfNeeded();
      await expect(start).toBeInViewport();
      const buttonBox = await start.boundingBox();
      const navBox = await nav.boundingBox();
      expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(navBox!.y);
      await expectLayout(page);
      for (const theme of ["light", "dark"]) {
        await page.evaluate(
          (mode) => document.documentElement.classList.toggle("dark", mode === "dark"),
          theme,
        );
        await expectLayout(page);
      }
      await page.setViewportSize({
        width: device.width,
        height: Math.floor(device.height * 0.6),
      });
      await expectLayout(page);
      await page.setViewportSize({ width: device.width, height: device.height });
      await expectLayout(page);
      await page.setViewportSize({ width: device.height, height: device.width });
      await expectLayout(page);
      await nav.getByRole("button", { name: "Cards", exact: true }).click();
      await page.waitForURL(/tab=flashcards/);
      await expectLayout(page);
    });
  });
}

async function expectLayout(page: Page) {
  const geometry = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Primary"]')!;
    const main = document.querySelector("main.lt-scroll-safe")!;
    return {
      navTop: nav.getBoundingClientRect().top,
      navBottom: nav.getBoundingClientRect().bottom,
      mainBottom: main.getBoundingClientRect().bottom,
      height: innerHeight,
      overflow: document.documentElement.scrollWidth - innerWidth,
      position: getComputedStyle(nav).position,
    };
  });
  expect(Math.abs(geometry.navBottom - geometry.height)).toBeLessThan(2);
  expect(geometry.mainBottom).toBeLessThanOrEqual(geometry.navTop + 1);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.position).not.toBe("fixed");
}
