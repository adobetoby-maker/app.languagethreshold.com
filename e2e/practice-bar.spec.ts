// Built by TAC — 2026-10-22
import { expect, test, type Page } from "@playwright/test";
import { appUrl, profileKey } from "./app-state.ts";

const PRACTICE_KEY = "lt.practice-time.v1";

/**
 * Opens `tab` past onboarding with an optional practice-time record. An init script seeds it on
 * the first load of the page only, so a reload keeps what the app saved.
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
        // The first load of each page owns the practice record: a saved storageState (the repo
        // config's setup project) may already hold one. Reloads of the same page keep what the
        // app saved, which the sessionStorage flag tells apart.
        if (!sessionStorage.getItem("pb-spec-seeded")) {
          sessionStorage.setItem("pb-spec-seeded", "1");
          localStorage.removeItem(practiceKey);
          if (practice) {
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
        }
      } catch {
        /* storage blocked */
      }
    },
    { profile: profileKey(), practiceKey: PRACTICE_KEY, tab, practice, seconds },
  );
  await page.goto(appUrl({ tab }));
}

// The phone settings sheet is modal, so the role tree hides the bar behind it; the test id still finds it.
const barById = (page: Page) => page.getByTestId("practice-time-bar");
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

test("it sits on the edge of the persistent app bar and adds no layout height", async ({
  page,
  isMobile,
}) => {
  await openTab(page, "reader", { seconds: 360 });
  await expect(bar(page)).toBeVisible({ timeout: 60_000 });
  await expect(bar(page)).toHaveCount(1);
  // Phone: the top edge of the bottom nav. Desktop: the bottom edge of the header.
  const host = isMobile
    ? page.getByRole("navigation", { name: "Primary" })
    : page.locator("header").filter({ visible: true }).first();
  const hostBox = (await host.boundingBox())!;
  const barBox = (await bar(page).boundingBox())!;
  expect(barBox.height).toBe(3);
  expect(barBox.width).toBeGreaterThan(250);
  if (isMobile) {
    // The 3px line overlays the nav's own 1px top border and the first 2px inside it.
    expect(barBox.y).toBeGreaterThanOrEqual(hostBox.y - 1.5);
    expect(barBox.y).toBeLessThanOrEqual(hostBox.y);
  } else {
    const bottom = hostBox.y + hostBox.height;
    expect(barBox.y + barBox.height).toBeGreaterThanOrEqual(bottom);
    expect(barBox.y + barBox.height).toBeLessThanOrEqual(bottom + 1.5);
  }
  // Turning the bar off must not move the app bar.
  await page.evaluate((key) => {
    const o = JSON.parse(localStorage.getItem(key) ?? "{}");
    localStorage.setItem(key, JSON.stringify({ ...o, enabled: false }));
  }, PRACTICE_KEY);
  await page.reload();
  await expect(host).toBeVisible({ timeout: 60_000 });
  await expect(bar(page)).toHaveCount(0);
  expect((await host.boundingBox())!.height).toBe(hostBox.height);
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

test("a fresh load with no interaction counts nothing, and there is exactly one bar", async ({
  page,
}) => {
  await openTab(page, "reader", { seconds: 100 });
  await expect(bar(page)).toBeVisible({ timeout: 60_000 });
  await expect(bar(page)).toHaveCount(1);
  await expect(bar(page)).toHaveAttribute("aria-valuenow", "100");
  await page.waitForTimeout(3500);
  await expect(bar(page)).toHaveAttribute("aria-valuenow", "100");
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

/** Opens the device-preferences surface: the phone's App settings sheet or the desktop Learning settings popover. */
async function openSettings(page: Page, isMobile: boolean): Promise<void> {
  const name = isMobile ? "App settings" : "Learning settings";
  await page.getByRole("button", { name, exact: true }).first().click();
  await expect(page.getByTestId("practice-bar-switch")).toBeVisible();
}

test("settings switch hides the bar and the goal select changes the target, both across reload", async ({
  page,
  isMobile,
}) => {
  await openTab(page, "reader", { seconds: 120 });
  await expect(barById(page)).toBeVisible({ timeout: 60_000 });
  await openSettings(page, isMobile);
  const toggle = page.getByTestId("practice-bar-switch");
  const goal = page.getByTestId("practice-bar-goal");
  await expect(toggle).toBeChecked();
  await expect(goal).toHaveValue("10");
  await expect(page.getByTestId("practice-bar-today")).toHaveText("Today: 2 of 10 min");

  await goal.selectOption("15");
  await expect(page.getByTestId("practice-bar-today")).toHaveText("Today: 2 of 15 min");
  await expect(barById(page)).toHaveAttribute("aria-valuemax", "900");
  await expect(barById(page)).toHaveAttribute("aria-label", /of 15 minutes$/);

  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(barById(page)).toHaveCount(0);

  await page.reload();
  await expect(barById(page)).toHaveCount(0);
  await openSettings(page, isMobile);
  await expect(page.getByTestId("practice-bar-switch")).not.toBeChecked();
  await expect(page.getByTestId("practice-bar-goal")).toHaveValue("15");

  await page.getByTestId("practice-bar-switch").click();
  await expect(barById(page)).toBeVisible();
  await expect(barById(page)).toHaveAttribute("aria-valuemax", "900");
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
