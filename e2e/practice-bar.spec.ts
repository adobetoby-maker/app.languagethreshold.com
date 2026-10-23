// Built by TAC — 2026-10-22
import { expect, test, type Page } from "@playwright/test";
import { appUrl, profileKey } from "./app-state.ts";

const PRACTICE_KEY = "lt.practice-time.v1";

/**
 * Opens `tab` past onboarding with an optional practice-time record. Everything is seeded by an
 * init script that only fills keys that are still empty, so a reload keeps what the app saved.
 */
async function openTab(
  page: Page,
  tab: string,
  practice?: { seconds?: number; enabled?: boolean; goalMinutes?: number },
): Promise<void> {
  const seconds = practice?.seconds ?? 0;
  await page.addInitScript(
    ({ profile, practiceKey, tab, practice, seconds }) => {
      try {
        if (!localStorage.getItem(profile)) {
          localStorage.setItem(
            profile,
            JSON.stringify({
              schema: 1,
              userId: null,
              data: {
                selectedLanguage: "Spanish",
                currentTab: tab,
                onboardingComplete: true,
              },
            }),
          );
        }
        localStorage.setItem("lt.languageChosen", "1");
        if (practice && !localStorage.getItem(practiceKey)) {
          const d = new Date();
          const p = (n: number) => String(n).padStart(2, "0");
          const key = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
          localStorage.setItem(
            practiceKey,
            JSON.stringify({
              v: 1,
              enabled: practice.enabled ?? true,
              goalMinutes: practice.goalMinutes ?? 10,
              days: seconds > 0 ? { [key]: seconds } : {},
            }),
          );
        }
      } catch {
        /* storage blocked */
      }
    },
    { profile: profileKey(), practiceKey: PRACTICE_KEY, tab, practice, seconds },
  );
  await page.goto(appUrl({ tab }));
}

const bar = (page: Page) => page.getByRole("progressbar", { name: /^Today's practice/ });

test("the bar is on by default, is a labelled progressbar, and counts toward a 10 minute goal", async ({
  page,
}) => {
  await openTab(page, "reader");
  await expect(bar(page)).toBeVisible({ timeout: 60_000 });
  await expect(bar(page)).toHaveAttribute("aria-valuemin", "0");
  await expect(bar(page)).toHaveAttribute("aria-valuemax", "600");
  await expect(bar(page)).toHaveAttribute("aria-valuenow", /^\d+$/);
  await expect(bar(page)).toHaveAttribute("aria-label", /^Today's practice: 0 of 10 minutes$/);
});

test("it sits on the top edge of the primary bar and adds no layout height", async ({ page }) => {
  await openTab(page, "reader", { seconds: 360 });
  await expect(bar(page)).toBeVisible({ timeout: 60_000 });
  const nav = page.getByRole("navigation", { name: "Primary" });
  const navBox = (await nav.boundingBox())!;
  const barBox = (await bar(page).boundingBox())!;
  expect(barBox.height).toBe(3);
  expect(barBox.width).toBeGreaterThan(250);
  // The 3px line overlays the nav's own 1px top border and the first 2px inside it.
  expect(barBox.y).toBeGreaterThanOrEqual(navBox.y - 1.5);
  expect(barBox.y).toBeLessThanOrEqual(navBox.y);
  // Turning the bar off must not move the nav.
  await page.evaluate((key) => {
    const o = JSON.parse(localStorage.getItem(key) ?? "{}");
    localStorage.setItem(key, JSON.stringify({ ...o, enabled: false }));
  }, PRACTICE_KEY);
  await page.reload();
  await expect(nav).toBeVisible({ timeout: 60_000 });
  await expect(bar(page)).toHaveCount(0);
  expect((await nav.boundingBox())!.height).toBe(navBox.height);
});

test("seeded time fills the bar and the label reads in whole minutes", async ({ page }) => {
  await openTab(page, "reader", { seconds: 360 });
  await expect(bar(page)).toBeVisible({ timeout: 60_000 });
  // The app may add a few seconds while the page is open; 6 minutes shows as "6 of 10".
  await expect(bar(page)).toHaveAttribute("aria-label", "Today's practice: 6 of 10 minutes");
  const now = Number(await bar(page).getAttribute("aria-valuenow"));
  expect(now).toBeGreaterThanOrEqual(360);
  expect(now).toBeLessThan(420);
  const fill = await page.getByTestId("practice-time-fill").evaluate((el) => {
    const track = el.parentElement!;
    return el.getBoundingClientRect().width / track.getBoundingClientRect().width;
  });
  expect(fill).toBeGreaterThan(0.55);
  expect(fill).toBeLessThan(0.7);
});

test("a goal already met shows a full bar", async ({ page }) => {
  await openTab(page, "reader", { seconds: 2000, goalMinutes: 5 });
  await expect(bar(page)).toBeVisible({ timeout: 60_000 });
  await expect(bar(page)).toHaveAttribute("aria-valuemax", "300");
  await expect(bar(page)).toHaveAttribute("aria-valuenow", "300");
  await expect(bar(page)).toHaveAttribute("aria-label", "Today's practice: 5 of 5 minutes");
});

test("an active learner on a visible tab gains seconds", async ({ page }) => {
  await openTab(page, "reader", { seconds: 100 });
  await expect(bar(page)).toBeVisible({ timeout: 60_000 });
  const read = async () => Number(await bar(page).getAttribute("aria-valuenow"));
  const start = await read();
  await page.mouse.click(5, 5);
  await expect.poll(read, { timeout: 15_000 }).toBeGreaterThanOrEqual(start + 3);
});

test("yesterday does not count toward today", async ({ page }) => {
  await openTab(page, "reader");
  await expect(bar(page)).toBeVisible({ timeout: 60_000 });
  await page.evaluate((key) => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const p = (n: number) => String(n).padStart(2, "0");
    const yesterday = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    localStorage.setItem(
      key,
      JSON.stringify({ v: 1, enabled: true, goalMinutes: 10, days: { [yesterday]: 590 } }),
    );
  }, PRACTICE_KEY);
  await page.reload();
  await expect(bar(page)).toBeVisible({ timeout: 60_000 });
  expect(Number(await bar(page).getAttribute("aria-valuenow"))).toBeLessThan(60);
});

test("Dashboard switch hides the bar and the goal select changes the target, both across reload", async ({
  page,
}) => {
  await openTab(page, "dashboard", { seconds: 120 });
  const toggle = page.getByTestId("practice-bar-switch");
  const goal = page.getByTestId("practice-bar-goal");
  await expect(toggle).toBeVisible({ timeout: 60_000 });
  await expect(toggle).toBeChecked();
  await expect(goal).toHaveValue("10");
  await expect(bar(page)).toBeVisible();

  await goal.selectOption("15");
  await expect(bar(page)).toHaveAttribute("aria-valuemax", "900");
  await expect(bar(page)).toHaveAttribute("aria-label", /of 15 minutes$/);

  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(bar(page)).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId("practice-bar-switch")).not.toBeChecked({ timeout: 60_000 });
  await expect(page.getByTestId("practice-bar-goal")).toHaveValue("15");
  await expect(bar(page)).toHaveCount(0);

  await page.getByTestId("practice-bar-switch").click();
  await expect(bar(page)).toBeVisible();
  await expect(bar(page)).toHaveAttribute("aria-valuemax", "900");
});

test("blocked storage never throws from the practice code", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const blocked = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: blocked,
    });
  });
  await page.goto(appUrl({ tab: "reader" }));
  // With storage blocked the app may stop at its own loading screen; the practice code must not throw.
  await page.waitForLoadState("domcontentloaded");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForTimeout(2500);
  expect(errors.filter((m) => /practice/i.test(m))).toEqual([]);
});
