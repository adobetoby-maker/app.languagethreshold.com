import { expect, test, type Page } from "@playwright/test";

// iPhone home-screen app checks: that it is installable, that its icons and
// service worker work, and that the main flows are usable by touch at phone size.

async function openApp(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("button", { name: "Start reading" })).toHaveCount(0);
  await expect(page.getByText("What are you learning?")).toHaveCount(0);
}

test.describe("install readiness", () => {
  test("head has the Apple home-screen tags", async ({ page }) => {
    await page.goto("/");
    const meta = (name: string) =>
      page.locator(`meta[name="${name}"]`).first().getAttribute("content");
    expect(await meta("apple-mobile-web-app-capable")).toBe("yes");
    expect(await meta("apple-mobile-web-app-title")).toBeTruthy();
    expect(await meta("apple-mobile-web-app-status-bar-style")).toBeTruthy();
    expect(await meta("theme-color")).toBeTruthy();
    expect(await meta("viewport")).toContain("viewport-fit=cover");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest/);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /\.png/);
  });

  test("manifest is standalone and every icon loads", async ({ page, request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons as { src: string }[]) {
      expect((await request.get(icon.src)).status(), icon.src).toBe(200);
    }
    const touchIcon = await page
      .goto("/")
      .then(() => page.locator('link[rel="apple-touch-icon"]').getAttribute("href"));
    expect((await request.get(touchIcon!)).status(), "apple-touch-icon").toBe(200);
  });

  test("service worker registers and takes control", async ({ page }) => {
    await openApp(page);
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    expect(scope).toContain("/");
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
  });
});

test.describe("phone layout", () => {
  test("reader fits the screen with no sideways scrolling", async ({ page }) => {
    await openApp(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("bottom navigation is visible and reachable by tap", async ({ page }) => {
    await openApp(page);
    const nav = ["Cards", "Grammar", "Games", "Speak", "Core 60", "Tutor"];
    for (const label of nav) {
      await expect(
        page.getByText(label, { exact: true }).filter({ visible: true }).last(),
      ).toBeVisible();
    }
    await page.getByText("Games", { exact: true }).filter({ visible: true }).last().tap();
    await expect(
      page.getByText("Reader", { exact: true }).filter({ visible: true }).last(),
    ).toBeVisible();
  });
});

test.describe("touch flows", () => {
  test("tapping a word opens its AI card", async ({ page }) => {
    await openApp(page);
    const lookup = page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().includes("/_serverFn/"),
      { timeout: 90_000 },
    );
    await page.getByRole("button", { name: "billete", exact: true }).first().tap();
    const res = await lookup;
    expect(res.status()).toBe(200);
    await expect(page.getByText(/in this sentence/i).first()).toBeVisible();
    const card = page.getByText(/ticket/i).first();
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  });

  test("tutor sheet opens and answers on a phone", async ({ page }) => {
    await openApp(page);
    await page.getByText("Tutor", { exact: true }).filter({ visible: true }).last().tap();
    const input = page.getByRole("textbox").last();
    await expect(input).toBeVisible();
    await input.fill("¿Cuál es la diferencia entre por y para? Responde en una frase.");
    const reply = page.waitForResponse((res) => res.url().includes("/api/tutor"), {
      timeout: 90_000,
    });
    await input.press("Enter");
    const res = await reply;
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(/"content":"[^"]+/);
  });

  test("reader still opens from cache when the network drops", async ({ page, context }) => {
    // The dev server has no cacheable build, so run this against a deployed URL:
    // E2E_BASE_URL=https://app.languagethreshold.com npx playwright test --project=iphone-pwa
    test.skip(!process.env.E2E_BASE_URL, "offline caching needs a production build");
    await openApp(page);
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator("body")).not.toBeEmpty();
    await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
