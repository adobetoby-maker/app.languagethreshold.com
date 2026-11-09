import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const practice = JSON.parse(readFileSync("src/data/japanese-basics-practice.json", "utf8"));
const actorId = "00000000-0000-4000-8000-00000000a061";

test.use({ storageState: { cookies: [], origins: [] } });

async function openCourse(page: Page, moduleId: string, step: string) {
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const session = {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: actorId, aud: "authenticated", role: "authenticated", exp })}.fixture`,
    refresh_token: "fixture-refresh",
    token_type: "bearer",
    expires_in: 86400,
    expires_at: exp,
    user: {
      id: actorId,
      aud: "authenticated",
      role: "authenticated",
      email: "japanese-basics-e2e@example.test",
      app_metadata: {},
      user_metadata: {},
      created_at: "2026-01-01T00:00:00Z",
    },
  };
  await page.addInitScript(
    ({ moduleId, actorId, session }) => {
      localStorage.setItem("sb-pollhlkgltdkdskdzsgd-auth-token", JSON.stringify(session));
      const key = `lt.profile-device.v1.user.${actorId}`;
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            schema: 1,
            userId: actorId,
            data: {
              onboardingComplete: true,
              selectedLanguage: "Japanese",
              nativeLanguage: "English",
              activeModuleId: moduleId,
              currentTab: "core30",
              purchasedModules: [
                "foundation-japanese-basics",
                "japanese-basics",
                "master-japanese-basics",
              ],
            },
          }),
        );
    },
    { moduleId, actorId, session },
  );
  await page.route("**/api/team-activity", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sessions: {}, recorded: 0 }),
    }),
  );
  await page.goto(`/?module=${moduleId}&target=Japanese&native=English&tab=core30`);
  await expect(page.getByTestId("core60-eyebrow")).toContainText(step);
  await page
    .getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/, exact: true })
    .click();
}

for (const [moduleId, step, reading] of [
  ["foundation-japanese-basics", "Step 1 of 3", "こんにちは。"],
  ["japanese-basics", "Step 2 of 3", "まいにち にほんごを べんきょうします。"],
  [
    "master-japanese-basics",
    "Step 3 of 3",
    "こちらは あきさんです。グループの あたらしい メンバーです。",
  ],
] as const) {
  test(`${moduleId} opens authored lesson, six modes, and Reader`, async ({ page }) => {
    test.setTimeout(90_000);
    await openCourse(page, moduleId, step);
    await expect(page.getByTestId("lesson-grammar-focus")).toBeVisible();
    await expect(page.getByTestId("lesson-section-nav").getByRole("button")).toHaveCount(6);
    const see = page.getByTestId("lesson-section-see");
    await expect(see).toContainText(reading);
    await page.getByTestId("lesson-nav-recall").click();
    await expect(page.getByTestId("lesson-practice-section")).toBeVisible();
    await page.getByTestId("lesson-nav-hear").click();
    await expect(page.getByTestId("lesson-section-kit")).toBeVisible();
    await page.getByTestId("lesson-nav-type").click();
    await expect(page.getByRole("region", { name: "Typed lesson response" })).toBeVisible();
    await page.getByTestId("lesson-nav-write").click();
    await page.getByRole("combobox", { name: "Writing activity" }).selectOption("response");
    await expect(page.getByRole("region", { name: "Handwritten lesson response" })).toBeVisible();
    await page.getByRole("button", { name: "Back to lesson", exact: true }).click();
    await page.getByTestId("lesson-nav-say").click();
    await expect(page.getByTestId("lesson-speaking-practice")).toContainText(reading);
    await page.getByTestId("lesson-nav-see").click();
    await see.getByRole("button", { name: /full reader/i }).click();
    await expect(page.getByTestId("reader-options")).toBeVisible();
    await expect(page.locator("body")).toContainText(reading);
  });
}

for (const [moduleId, step, finalLesson, title, reading] of [
  [
    "foundation-japanese-basics",
    "Step 1 of 3",
    10,
    "Ask for help and review",
    "すみません、しつもんが あります。",
  ],
  [
    "japanese-basics",
    "Step 2 of 3",
    30,
    "Connect and review ideas",
    "きょうは ともだちと でかける よていでした。",
  ],
  [
    "master-japanese-basics",
    "Step 3 of 3",
    20,
    "A full everyday conversation",
    "あきさん、こんにちは。",
  ],
] as const) {
  test(`${moduleId} reaches its final authored lesson`, async ({ page }) => {
    test.setTimeout(90_000);
    await openCourse(page, moduleId, step);
    await page.goto(
      `/?module=${moduleId}&target=Japanese&native=English&tab=core30&lesson=${finalLesson}`,
    );
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByTestId("lesson-section-see")).toContainText(reading);
  });
}

test("Japanese Foundation checks retrieval before awarding mastery", async ({ page }) => {
  test.setTimeout(90_000);
  await openCourse(page, "foundation-japanese-basics", "Step 1 of 3");
  const mastery = page.getByTestId("core30-mastered-button");
  await expect(mastery).toBeDisabled();
  const check = page.getByRole("region", { name: "Grammar practice check" });
  await check.getByRole("button", { name: "Check grammar" }).click();
  await expect(mastery).toBeDisabled();
  for (const [index, question] of practice["foundation-japanese-basics"]["1"].checks.entries())
    await page.getByLabel(`Grammar answer ${index + 1}`, { exact: true }).fill(question.answer);
  await check.getByRole("button", { name: "Check grammar" }).click();
  await expect(check).toContainText("3 of 3 correct");
  await expect(mastery).toBeEnabled();
});
