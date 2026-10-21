// Built by TAC — 2026-10-21
import { expect, test, type Page } from "@playwright/test";
import { appUrl, seedAppState } from "./app-state.ts";

/** Opens the Games tab with Spanish selected and no module, retrying like dictionary-roofing.spec.ts. */
async function openVerbs(page: Page, search = ""): Promise<void> {
  await page.goto("/");
  const title = page.getByRole("heading", { name: "Practice by pattern" });
  for (let attempt = 0; attempt < 3; attempt++) {
    await seedAppState(page, { activeModuleId: null, selectedLanguage: "Spanish", currentTab: "games" });
    await page.goto(appUrl({ tab: "games" }) + search);
    await title.waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 }).catch(() => undefined);
    if (await title.isVisible()) break;
  }
  await expect(title).toBeVisible({ timeout: 60_000 });
}

test("verbs home lists families and games", async ({ page }) => {
  await openVerbs(page);
  await expect(page.getByText('The "-go" family')).toBeVisible();
  await expect(page.getByText("Regular -ar")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bubble Pop" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Verb Crush" })).toBeVisible();
  await expect(page.getByText("Leaderboards coming soon")).toBeVisible();
});

test("verbs picker opens from a game card, keeps Back working and starts disabled-safe", async ({ page }) => {
  await openVerbs(page);
  await page.locator('[data-game="crush"]').click();
  await expect(page).toHaveURL(/verbs=pick/);
  await expect(page.getByRole("heading", { name: "Choose your round" })).toBeVisible();
  await expect(page.getByText(/Core · \d+ verbs/)).toBeVisible();
  await expect(page.locator('[data-level="1"]')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Practice by pattern" })).toBeVisible();
});

test("a hand-edited verbs link falls back to the home instead of failing", async ({ page }) => {
  await openVerbs(page, "&verbs=play&vgame=crush&vfamily=mix");
  await expect(page.getByRole("heading", { name: "Practice by pattern" })).toBeVisible();
  await openVerbs(page, "&verbs=board&vgame=crush&vscope=L9:xyz");
  await expect(page.getByRole("heading", { name: "Practice by pattern" })).toBeVisible();
});

// Screenshots at four viewports for the visual review: VERB_SCREENS=1 npx playwright test ... --grep @screens
const SCREENS: { name: string; path: string; prepare?: (page: Page) => Promise<void> }[] = [
  { name: "home", path: appUrl({ tab: "games" }) },
  { name: "picker-crush", path: appUrl({ tab: "games" }) + "&verbs=pick&vgame=crush&vfamily=es.present.go-yo" },
  { name: "picker-bubble", path: appUrl({ tab: "games" }) + "&verbs=pick&vgame=bubble&vfamily=mix" },
];
const VIEWPORTS = [
  { tag: "375", width: 375, height: 812, scale: 2 },
  { tag: "1440", width: 1440, height: 900, scale: 1 },
  { tag: "2560", width: 2560, height: 1440, scale: 1 },
  { tag: "2560x2", width: 2560, height: 1440, scale: 2 },
] as const;

test.describe("verb screens @screens", () => {
  test.skip(!process.env.VERB_SCREENS, "set VERB_SCREENS=1 to capture screens");
  for (const screen of SCREENS) {
    test(`${screen.name} fits every viewport`, async ({ browser, baseURL, storageState }) => {
      for (const vp of VIEWPORTS) {
        const context = await browser.newContext({
          baseURL,
          storageState,
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: vp.scale,
        });
        const page = await context.newPage();
        try {
          await page.goto("/");
          await seedAppState(page, { activeModuleId: null, selectedLanguage: "Spanish", currentTab: "games" });
          await page.goto(screen.path);
          await expect(page.locator("[data-verbs-root]")).toBeVisible({ timeout: 60_000 });
          await screen.prepare?.(page);
          await page.evaluate(() => document.fonts.ready);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          expect(overflow, `${screen.name} @${vp.tag} scrollWidth overflow`).toBeLessThanOrEqual(0);
          await page.screenshot({ path: `test-results/verb-games-screens/${screen.name}-${vp.tag}.png`, fullPage: true });
          // Fixed bars would paint over the middle of a full-page capture; hide them for the section clip only.
          await page.evaluate(() => {
            for (const el of document.querySelectorAll<HTMLElement>("body *")) {
              if (getComputedStyle(el).position === "fixed" && !el.closest("[data-verbs-root]")) el.style.visibility = "hidden";
            }
          });
          // A clip of the full-page capture keeps the fixed top and bottom bars out of the middle of the section.
          const box = await page.locator("[data-verbs-root]").evaluate((el) => {
            const r = el.getBoundingClientRect();
            return { x: Math.max(0, r.left + scrollX - 8), y: Math.max(0, r.top + scrollY - 8), width: Math.min(innerWidth, r.width + 16), height: r.height + 16 };
          });
          await page.screenshot({ path: `test-results/verb-games-screens/${screen.name}-${vp.tag}-section.png`, fullPage: true, clip: box });
        } finally {
          await context.close();
        }
      }
    });
  }
});
