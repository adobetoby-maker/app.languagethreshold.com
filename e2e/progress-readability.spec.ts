import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
test.use({ storageState: { cookies: [], origins: [] } });
for (const theme of ["light", "dark"] as const) {
  test(`Progress uses upright readable status text in ${theme}`, async ({ page }) => {
    test.setTimeout(60000);
    await page.addInitScript((mode) => {
      localStorage.setItem("lt.theme.v1", mode);
      localStorage.setItem("lt.languageChosen", "1");
      localStorage.setItem(
        "lt.profile-device.v1.guest",
        JSON.stringify({
          schema: 1,
          userId: null,
          data: {
            onboardingComplete: true,
            currentTab: "dashboard",
            selectedLanguage: "Spanish",
            nativeLanguage: "English",
            activeModuleId: "roofing",
            purchasedModules: ["roofing"],
            xp: 760,
            wordsLookedUp: 85,
            challengesCleared: 4,
          },
        }),
      );
    }, theme);
    await page.goto("/?tab=dashboard&module=roofing&target=Spanish&native=English", {
      waitUntil: "domcontentloaded",
    });
    const welcome = page.getByRole("dialog", { name: "Choose your learning language" });
    await welcome.waitFor({ timeout: 3000 }).catch(() => {});
    if (await welcome.isVisible()) {
      await welcome.getByRole("button", { name: /^\s*Spanish/ }).click();
      await page.getByRole("button", { name: "Start reading", exact: true }).click();
      await page.goto("/?tab=dashboard&module=roofing&target=Spanish&native=English", {
        waitUntil: "domcontentloaded",
      });
    }
    await expect(page.getByRole("heading", { name: "Your Dashboard" })).toBeVisible();
    await page.getByRole("button", { name: /Plan travel break/ }).click();
    await expect(page.getByText("Use one travel pass", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(async () => {
        const faces = await document.fonts.load('16px "Inter Variable"');
        return faces.length > 0 && faces.every((face) => face.status === "loaded");
      }),
    ).toBe(true);
    const checks = await page.locator(".progress-dashboard").evaluate((root) => {
      const rgba = (value: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = value;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data].map((v, i) => (i === 3 ? v / 255 : v));
      };
      const luminance = (color: number[]) =>
        color
          .slice(0, 3)
          .map((v) => v / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
          .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
      const contrast = (element: Element) => {
        let bg = [255, 255, 255, 1];
        const chain: Element[] = [];
        for (let el: Element | null = element; el; el = el.parentElement) chain.unshift(el);
        for (const el of chain) {
          const next = rgba(getComputedStyle(el).backgroundColor);
          bg = bg.map((v, i) => (i === 3 ? 1 : next[i] * next[3] + v * (1 - next[3])));
        }
        const fg = rgba(getComputedStyle(element).color),
          a = luminance(fg),
          b = luminance(bg);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const target = [...root.querySelectorAll("p,label,button")].filter((el) =>
        /^(Use one travel pass|Protect your current streak|Break length|Plan travel break)/.test(
          el.textContent?.trim() ?? "",
        ),
      );
      return {
        styles: [...root.querySelectorAll("h1,h2,p,label,button")]
          .filter((el) => el.getClientRects().length)
          .map((el) => getComputedStyle(el).fontStyle),
        ratios: [
          ...target,
          ...document.querySelectorAll(".achievement-toast [data-description]"),
        ].map((el) => ({
          text: el.textContent?.trim().slice(0, 65),
          ratio: contrast(el),
        })),
        width: document.documentElement.scrollWidth,
        viewport: innerWidth,
      };
    });
    expect(checks.styles.every((style) => style === "normal")).toBe(true);
    expect(checks.ratios.length).toBeGreaterThanOrEqual(3);
    for (const check of checks.ratios) expect(check.ratio, check.text).toBeGreaterThanOrEqual(4.5);
    expect(checks.width).toBeLessThanOrEqual(checks.viewport);
    mkdirSync("output/document-reader-review", { recursive: true });
    await page.screenshot({
      path: `output/document-reader-review/progress-status-${theme}-${test.info().project.name}.png`,
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `output/document-reader-review/progress-top-${theme}-${test.info().project.name}.png`,
    });
    await page.screenshot({
      path: `output/document-reader-review/progress-${theme}-${test.info().project.name}.png`,
      fullPage: true,
    });
  });
}
