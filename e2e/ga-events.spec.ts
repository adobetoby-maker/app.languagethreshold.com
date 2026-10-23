import { expect, test, type Page } from "@playwright/test";
import { appUrl, core30Key, readAppState, seedAppState } from "./app-state.ts";

// GA4 key events. The app's inline gtag snippet (src/routes/__root.tsx) declares a global
// `gtag` that pushes to window.dataLayer, so a stub assigned to window.gtag would be replaced.
// The dataLayer is therefore the observation point: it holds exactly what gtag was called with.

const MODULE = "roofing";
const pad = (n: number) => String(n).padStart(2, "0");
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const gaEvents = (page: Page) =>
  page.evaluate(() =>
    ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? [])
      .map((entry) => Array.from(entry))
      .filter((entry) => entry[0] === "event"),
  );

async function openCore30(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    await seedAppState(page, {
      activeModuleId: MODULE,
      selectedLanguage: "Spanish",
      currentTab: "core30",
      core30Log: { [core30Key(MODULE, "Spanish")]: { startDate: today(), lessons: {} } },
    });
    await page.goto(appUrl({ tab: "core30", module: MODULE, target: "Spanish" }));
    await page
      .getByTestId("core30-plan-card")
      .waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1500);
    const state = await readAppState(page);
    if ((await page.getByTestId("core30-plan-card").isVisible()) && state.activeModuleId === MODULE)
      return;
  }
  await expect(page.getByTestId("core30-plan-card")).toBeVisible();
}

test.describe("GA4 key events", () => {
  test.skip(({ isMobile }) => isMobile, "desktop run is enough for event wiring");

  test("marking a lesson mastered sends lesson_mastered with module and lesson only", async ({
    page,
  }) => {
    await openCore30(page);
    await page.getByRole("button", { name: /Today: Lesson 1/ }).click();
    await expect(page.getByText("✕ Exit")).toBeVisible();
    expect(await gaEvents(page)).toEqual([]);

    await page.getByTestId("core30-mastered-button").click();

    await expect
      .poll(async () => (await gaEvents(page)).filter((e) => e[1] === "lesson_mastered"))
      .toEqual([
        ["event", "lesson_mastered", { module_id: MODULE, lesson: 1, transport_type: "beacon" }],
      ]);
  });

  test("no event is sent while speaking privacy mode is on", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__languageThresholdSpeakingPrivacy = true;
    });
    await openCore30(page);
    await page.getByRole("button", { name: /Today: Lesson 1/ }).click();
    await expect(page.getByText("✕ Exit")).toBeVisible();
    await page.getByTestId("core30-mastered-button").click();
    await expect(page.getByText(/Lesson complete/)).toBeVisible();
    expect(await gaEvents(page)).toEqual([]);
  });

  test("a purchase on a private page waits, then loads GA and sends once after client-side navigation", async ({
    page,
  }) => {
    const session = "cs_test_e2eClientNav123456";
    await page.goto(`/subscribe/success?session_id=${session}`);
    await expect(page.getByText("You're in.")).toBeVisible({ timeout: 60_000 });
    // GA never loads on a private page, so the event waits in sessionStorage.
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("lt.ga.pending.v1")))
      .toContain("purchase");
    expect(await page.evaluate(() => typeof (window as unknown as { gtag?: unknown }).gtag)).toBe(
      "undefined",
    );
    expect(await gaEvents(page)).toEqual([]);

    // Client-side navigation to a public page: the app loads GA, then flushes the queue.
    await page.getByRole("link", { name: /Start learning/ }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect
      .poll(() => page.evaluate(() => typeof (window as unknown as { gtag?: unknown }).gtag))
      .toBe("function");
    await expect
      .poll(async () => (await gaEvents(page)).filter((e) => e[1] === "purchase"))
      .toEqual([
        [
          "event",
          "purchase",
          { transaction_id: session, currency: "USD", transport_type: "beacon" },
        ],
      ]);
    expect(await page.evaluate(() => sessionStorage.getItem("lt.ga.pending.v1"))).toBeNull();

    // The loader mirrors the root snippet: config carries no query string.
    const config = await page.evaluate(() =>
      ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? [])
        .map((entry) => Array.from(entry))
        .filter((entry) => entry[0] === "config"),
    );
    expect(config).toHaveLength(1);
    expect(config[0][1]).toBe("G-RP0TZ1MP7E");
    expect(JSON.stringify(config[0][2])).not.toMatch(/\?|session_id|cs_test/);
    // No personal data anywhere in what GA was handed.
    const everything = await page.evaluate(() =>
      JSON.stringify(
        ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? []).map((e) =>
          Array.from(e),
        ),
      ),
    );
    expect(everything).not.toMatch(/@|email|user_id|member/i);
  });

  test("a purchase seen on a private page is also sent once on the next full public page load", async ({
    page,
  }) => {
    const session = "cs_test_e2eDeferred123456";
    await page.goto(`/subscribe/success?session_id=${session}`);
    await expect(page.getByText("You're in.")).toBeVisible({ timeout: 60_000 });
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("lt.ga.pending.v1")))
      .toContain("purchase");

    await page.goto("/");
    await expect
      .poll(async () => (await gaEvents(page)).filter((e) => e[1] === "purchase"))
      .toEqual([
        [
          "event",
          "purchase",
          { transaction_id: session, currency: "USD", transport_type: "beacon" },
        ],
      ]);
    expect(await page.evaluate(() => sessionStorage.getItem("lt.ga.pending.v1"))).toBeNull();

    // Reload: the purchase is not counted again.
    await page.reload();
    await page.waitForTimeout(1500);
    expect((await gaEvents(page)).filter((e) => e[1] === "purchase")).toEqual([]);
  });
});
