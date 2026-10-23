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

  test("a purchase seen on a private page is deferred, then sent once on the next public page", async ({
    page,
  }) => {
    const session = "cs_test_e2eDeferred123456";
    await page.goto(`/subscribe/success?session_id=${session}`);
    await expect(page.getByText("You're in.")).toBeVisible({ timeout: 60_000 });
    // GA never loads on a private page, so the event waits in sessionStorage.
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("lt.ga.pending.v1")))
      .toContain("purchase");
    expect(await page.evaluate(() => typeof (window as unknown as { gtag?: unknown }).gtag)).toBe(
      "undefined",
    );
    const queued = await page.evaluate(() => sessionStorage.getItem("lt.ga.pending.v1"));
    expect(queued).not.toMatch(/@|email/i);

    // A full load of a public page is where GA starts, and the queue flushes there.
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
