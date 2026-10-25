import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
// @dev-only: all account, document and definition data is synthetic; no model calls.
const userId = "00000000-0000-4000-8000-0000000000aa";
const docId = "00000000-0000-4000-8000-0000000000bb";
test("private document words open, close, retry and reopen after reload", async ({ page }) => {
  test.setTimeout(45000);
  test.skip(!!process.env.E2E_BASE_URL?.includes("languagethreshold.com"));
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const session = {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: userId, aud: "authenticated", role: "authenticated", exp })}.fixture`,
    refresh_token: "fixture",
    token_type: "bearer",
    expires_at: exp,
    expires_in: 86400,
    user: {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email: "reader@example.test",
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: "2026-01-01T00:00:00Z",
    },
  };
  await page.addInitScript((s) => {
    localStorage.setItem("sb-pollhlkgltdkdskdzsgd-auth-token", JSON.stringify(s));
  }, session);
  await page.route("**/auth/v1/**", (route) => route.fulfill({ json: session.user }));
  await page.route("**/rest/v1/**", (route) => route.fulfill({ json: [] }));
  let calls = 0;
  let failNext = false;
  await page.route("**/api/documents", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({
        json: {
          documents: [
            {
              id: docId,
              title: "Practice safety sheet",
              source_language: "English",
              target_language: "Spanish",
              sentences: [
                {
                  en: "Do not use damaged equipment.",
                  target: "No use equipo dañado.",
                  definitions: [
                    {
                      side: "target",
                      word: "dañado",
                      card: {
                        headword: "dañado",
                        meaning: "Damaged; not in good condition.",
                        grammar: "",
                        context: "",
                      },
                    },
                  ],
                },
              ],
              created_at: "2026-10-25T00:00:00Z",
            },
          ],
          limit: 10,
          monthlyRemaining: 49863,
          purchasedRemaining: 0,
          hasBilling: false,
          storageSubscription: false,
          storagePaidUntil: null,
        },
      });
    calls++;
    const data = route.request().postDataJSON();
    expect(data).toMatchObject({
      action: "lookup",
      id: docId,
      passage: 0,
      side: "target",
      word: "equipo",
    });
    if (failNext) {
      failNext = false;
      return route.fulfill({ status: 503, json: { error: "Please retry this definition." } });
    }
    return route.fulfill({
      json: {
        card: {
          headword: "equipo",
          meaning: "Equipment: tools used for a task.",
          grammar: "A masculine singular noun.",
          context: "Here it refers to equipment used on the job.",
        },
        cached: calls > 1,
      },
    });
  });
  await page.goto("/documents", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Practice safety sheet/ }).click();
  await page.getByRole("button", { name: "Define dañado", exact: true }).click();
  await expect(page.getByText("Damaged; not in good condition.")).toBeVisible();
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "Close definition" }).click();
  await page.getByRole("button", { name: "Define equipo", exact: true }).click();
  await expect(page.getByText("Equipment: tools used for a task.")).toBeVisible();
  await page.getByRole("button", { name: "Close definition" }).click();
  await expect(page.getByText("Equipment: tools used for a task.")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: /Practice safety sheet/ }).click();
  await page.getByRole("button", { name: "Define dañado", exact: true }).click();
  await expect(page.getByText("Damaged; not in good condition.")).toBeVisible();
  expect(calls).toBe(1);
  await page.getByRole("button", { name: "Close definition" }).click();
  await page.getByRole("button", { name: "Define equipo", exact: true }).click();
  await expect(page.getByText("Equipment: tools used for a task.")).toBeVisible();
  await expect(page.getByText("49,863", { exact: false })).toBeVisible();
  const width = await page.evaluate(() => ({
    viewport: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(width.content).toBeLessThanOrEqual(width.viewport);
  mkdirSync("output/document-reader-review", { recursive: true });
  await page.screenshot({
    path: `output/document-reader-review/word-definition-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Close definition" }).click();
  failNext = true;
  await page.getByRole("button", { name: "Define equipo", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Please retry");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("Equipment: tools used for a task.")).toBeVisible();
});
