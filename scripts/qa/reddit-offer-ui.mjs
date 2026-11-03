import { chromium, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const base = "http://localhost:3467";
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
    await page.goto(base + "/reddit");
    await expect(
      page.getByRole("heading", { name: "A free month for Reddit learners" }),
    ).toBeVisible();
    await expect(page.getByText("REDDITMONTH", { exact: true })).toBeVisible();
    await expect(page.getByText(/Claim by December 1, 2026/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Claim my free month" })).toHaveCount(0);
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
    let redemption = null;
    const posts = [];
    await page.route("**/api/**", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.pathname === "/api/reddit-offer") {
        if (request.method() === "POST") {
          const body = request.postDataJSON();
          posts.push(body);
          if (body.code)
            redemption = {
              expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
              feedback_email_consent: body.feedbackEmailConsent,
            };
          else redemption.feedback_email_consent = body.feedbackEmailConsent;
          return route.fulfill({ json: { notice: "Saved feedback preference and offer" } });
        }
        return route.fulfill({ json: { redemption } });
      }
      if (url.pathname === "/api/product-feedback") {
        posts.push(request.postDataJSON());
        return route.fulfill({ json: { notice: "Thank you — your feedback has been saved." } });
      }
      return route.fulfill({ json: {} });
    });
    await page.reload();
    const consent = page.getByRole("checkbox");
    await expect(consent).not.toBeChecked();
    await consent.check();
    await page.getByRole("button", { name: "Claim my free month" }).click();
    await expect(page.getByText(/Your free access ends/)).toBeVisible();
    if (posts[0].code !== "REDDITMONTH" || posts[0].feedbackEmailConsent !== true)
      throw Error("Wrong claim payload");
    await consent.uncheck();
    await page.getByRole("button", { name: "Save feedback email preference" }).click();
    await expect.poll(() => redemption.feedback_email_consent).toBe(false);
    await page.getByRole("link", { name: "Share feedback" }).click();
    await expect(page.getByRole("heading", { name: "Help us improve" })).toBeVisible();
    await page
      .getByLabel("Your feedback")
      .fill("The speaking practice is helpful, but I would like clearer replay controls.");
    await page.getByRole("button", { name: "Send feedback" }).click();
    await expect(page.getByRole("status")).toContainText("feedback has been saved");
    if (!posts.at(-1).id || posts.at(-1).user_id) throw Error("Wrong feedback payload");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    if (overflow) throw Error("Horizontal overflow at " + width);
    mkdirSync("/tmp/reddit-offer-evidence", { recursive: true });
    await page.screenshot({
      path: `/tmp/reddit-offer-evidence/feedback-${width}.png`,
      fullPage: true,
    });
    if (errors.length) throw Error(errors.join("\n"));
    console.log(
      `PASS ${width}px: guest entry, confirmed-account claim, explicit consent, withdrawal and feedback submission`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
