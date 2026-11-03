import { chromium, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const base = "http://localhost:3456";
const USER = "00000000-0000-4000-8000-000000000101";
try {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/*", async (route) => {
      const u = new URL(route.request().url());
      if (u.origin !== base && ["http:", "https:"].includes(u.protocol))
        return route.fulfill({ status: 200, json: {} });
      return route.continue();
    });
    await page.goto(base + "/staff");
    await expect(
      page.getByRole("heading", { name: "Two free months for cleaning staff" }),
    ).toBeVisible();
    await expect(page.getByText("CLEANING2MONTHS", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Claim my two free months" })).toHaveCount(0);
    const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const exp = Math.floor(Date.now() / 1000) + 3600;
    await context.addInitScript(
      ({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
      {
        key: "sb-pollhlkgltdkdskdzsgd-auth-token",
        session: {
          access_token:
            b64({ alg: "HS256" }) +
            "." +
            b64({ sub: USER, aud: "authenticated", role: "authenticated", exp }) +
            ".fixture",
          refresh_token: "fixture-refresh",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: exp,
          user: {
            id: USER,
            email: "reviewer@example.invalid",
            aud: "authenticated",
            role: "authenticated",
            app_metadata: { provider: "email" },
            user_metadata: {},
            created_at: "2026-01-01T00:00:00Z",
          },
        },
      },
    );
    let offer = null;
    await page.route("**/api/**", async (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
      if (path === "/api/staff-offer") {
        if (request.method() === "POST") {
          const data = request.postDataJSON();
          if (data.code !== "CLEANING2MONTHS" || data.email) throw Error("Wrong claim identity");
          offer = {
            email: "reviewer@example.invalid",
            claimed_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 60 * 86400000).toISOString(),
            budget_reserved_microusd: 0,
          };
          return route.fulfill({ json: { notice: "Two free months recorded." } });
        }
        return route.fulfill({ json: { offer } });
      }
      return route.fulfill({ json: {} });
    });
    await page.reload();
    await page.getByLabel("Coupon code").fill("CLEANING2MONTHS");
    await page.getByRole("button", { name: "Claim my two free months" }).click();
    await expect(page.getByText(/Your access ends/)).toBeVisible();
    await expect(page.getByText(/allowance remaining: \$10.00/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Your access ends/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Claim my two free months" })).toHaveCount(0);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
      throw Error("Horizontal overflow");
    mkdirSync("/tmp/staff-coupon-evidence", { recursive: true });
    await page.screenshot({
      path: `/tmp/staff-coupon-evidence/staff-${width}.png`,
      fullPage: true,
    });
    if (errors.length) throw Error(errors.join("\n"));
    console.log(`PASS ${width}px: guest entry, confirmed account claim, allowance, saved expiry`);
    await context.close();
  }
} finally {
  await browser.close();
}
