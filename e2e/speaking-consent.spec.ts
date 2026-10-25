import { expect, test } from "@playwright/test";
import { appUrl } from "./app-state";

test("startup privacy popup keeps one-click consent and skip visible on a short phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 667 });
  let privateCalls = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/speak")) privateCalls++;
  });
  await page.route("**/__speaking-consent-fixture", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="en" class="dark"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;await import('/e2e/speaking-consent-fixture.tsx');</script></html>`,
    }),
  );
  await page.goto("/__speaking-consent-fixture");
  const dialog = page.getByRole("dialog", { name: "Before you speak" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Anthropic");
  await expect(dialog).toContainText("does not upload raw audio");
  await expect(dialog.getByRole("checkbox")).toHaveCount(0);
  const agree = dialog.getByRole("button", { name: "Agree & continue", exact: true });
  const skip = dialog.getByRole("button", { name: "Not now", exact: true });
  for (const button of [agree, skip]) {
    const box = await button.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThan(667);
  }
  await expect(dialog.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
    "href",
    "/privacy",
  );
  await page.screenshot({ path: `test-results/speaking-consent-${test.info().project.name}.png` });
  await skip.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("0 confirmations");
  await page.getByRole("button", { name: "Show startup notice" }).click();
  await agree.click();
  await expect(page.getByRole("status")).toHaveText("1 confirmations");
  expect(privateCalls).toBe(0);
});

test("construction and medical plans start without date selection while Travel keeps an optional trip date", async ({
  page,
}) => {
  for (const module of ["roofing", "orthopedics"]) {
    await page.goto(appUrl({ tab: "core30", module }));
    const plan = page.getByTestId("core30-plan-card");
    await expect(plan).toBeVisible();
    await expect(plan.locator('input[type="date"]')).toHaveCount(0);
    await expect(plan.getByRole("button", { name: /Start my.*day plan/ })).toBeVisible();
  }
  await page.goto(appUrl({ tab: "speak", module: "international-travel" }));
  await page.getByText("Choose another mission or change settings", { exact: true }).click();
  await expect(page.locator('input[type="date"]')).toHaveCount(1);
});
