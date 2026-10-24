import type {} from "./watch-talk-fixture.types";
import { expect, test, type Page } from "@playwright/test";
async function open(page: Page) {
  page.on("pageerror", (error) => console.log("Fixture error:", error.message));

  await page.addInitScript(() => {
    Object.assign(window, { CapacitorCustomPlatform: { name: "ios" } });
  });
  await page.route("**/__watch-talk-fixture", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true; await import('/e2e/watch-talk-fixture.tsx');</script></html>`,
    }),
  );
  await page.goto("/__watch-talk-fixture");
  await page.getByRole("button", { name: "Enable Watch microphone" }).click({ timeout: 15000 });
  await expect(page.getByText("Ready for your Watch turn.", { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.watchHarness.status().context?.contextId))
    .toBeTruthy();
}
test("native bridge accepts a fresh Watch transcript once, waits for the partner and ignores stale or duplicate turns", async ({
  page,
}) => {
  await open(page);
  const output = page.getByTestId("received-turns");
  for (const override of [
    { contextId: "old-account-mission" },
    { createdAt: Date.now() - 61000 },
    { text: "x".repeat(2001) },
  ])
    await page.evaluate((value) => window.watchHarness.emit(value), override);
  await expect(output).toHaveText("[]");
  await page.evaluate(() => window.watchHarness.emit());
  await expect(output).toHaveText('["Hola desde mi reloj"]');
  await expect(page.getByText("Wait for your partner, or finish the current turn.")).toBeVisible();
  await page.evaluate(() =>
    window.watchHarness.emit({ requestId: "00000000-0000-4000-8000-000000000001" }),
  );
  await expect(output).toHaveText('["Hola desde mi reloj"]');
  await page.getByRole("button", { name: "Toggle partner speaking" }).click();
  await page.evaluate(() => window.watchHarness.emit());
  await expect(output).toHaveText('["Hola desde mi reloj"]');
  await page.getByRole("button", { name: "Turn off Watch microphone" }).click();
  await expect.poll(() => page.evaluate(() => window.watchHarness.status().context)).toBeNull();
});
test("mission changes revoke the old bridge; timeout errors stay actionable and controls fit", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => window.watchHarness.failure());
  await expect(
    page.getByRole("region", { name: "Apple Watch push to talk" }).getByRole("status"),
  ).toContainText("timed out");
  const old = await page.evaluate(() => window.watchHarness.status().context.contextId);
  await page.getByRole("button", { name: "Change mission" }).click();
  await expect(page.getByRole("button", { name: "Enable Watch microphone" })).toBeVisible();
  await page.getByRole("button", { name: "Enable Watch microphone" }).click();
  await expect
    .poll(() => page.evaluate(() => window.watchHarness.status().context?.contextId))
    .not.toBe(old);
  await page.evaluate((id) => window.watchHarness.emit({ contextId: id }), old);
  await expect(page.getByTestId("received-turns")).toHaveText("[]");
  const rect = await page.getByRole("button", { name: "Turn off Watch microphone" }).boundingBox();
  expect(rect!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("Watch controls fit phone, tablet and desktop sizes", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "One four-viewport capture set is sufficient.");
  await open(page);
  const { mkdirSync } = await import("node:fs");
  mkdirSync("/Users/drive/git-backups/watch-talk-review", { recursive: true });
  for (const width of [390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `/Users/drive/git-backups/watch-talk-review/controls-${width}.png`,
    });
  }
});
