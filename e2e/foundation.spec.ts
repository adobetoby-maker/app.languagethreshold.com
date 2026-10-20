import { expect, test, type Page } from "@playwright/test";

// The free Roofing Foundation (module foundation-roofing): ten beginner lessons in front of the
// Roofing Core 30. Free with an account: a guest sees a sign-in prompt (never the paid trial),
// a signed-in learner gets the 14-day plan and the lesson page, and the Core 60 path card
// (Foundation, Core 30, Master 20) links the stages together. Master-specific checks live in
// core60-path.spec.ts.
//
// The signed-in tests use a made-up Supabase session written into localStorage: the Supabase
// client reads it as a signed-in user without any request, so no real account or password is
// involved. Calls the app makes with it (profile restore) are rejected and tolerated.

const FOUNDATION = "foundation-roofing";
const SUPABASE_REF = "pollhlkgltdkdskdzsgd";
const FAKE_USER_ID = "00000000-0000-4000-8000-000000000f00";

const pad = (n: number) => String(n).padStart(2, "0");
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const scopeKey = (moduleId: string) =>
  JSON.stringify(["core30", 1, moduleId, "Spanish", "English", null]);

function fakeSession() {
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const id = FAKE_USER_ID;
  const user = {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: "foundation-e2e@example.test",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00.000Z",
  };
  return {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: id, aud: "authenticated", role: "authenticated", exp })}.e2e`,
    refresh_token: "e2e-refresh",
    token_type: "bearer",
    expires_in: 60 * 60 * 24,
    expires_at: exp,
    user,
  };
}

async function signIn(page: Page) {
  await page.addInitScript(
    ({ key, session }) => localStorage.setItem(key, JSON.stringify(session)),
    { key: `sb-${SUPABASE_REF}-auth-token`, session: fakeSession() },
  );
}

/**
 * Opens the Core 30 tab of a module with `core30Log` in the saved profile (the app reads its state
 * from lt.profile-device.v1.<guest|user.id>, not from the older lt.app.v2). The profile is
 * written after the first load and again (up to three times) until the app keeps it, because a
 * cold dev server can finish loading after the seed and save its own state over it.
 */
async function openCore30(
  page: Page,
  moduleId: string,
  core30Log: Record<string, unknown>,
  ready: string,
  userId: string | null = null,
) {
  await page.goto("/");
  if (userId) {
    // A made-up account has no onboarding yet, so the first screen is the landing page.
    await page.waitForLoadState("load");
    await page.waitForTimeout(4000);
  } else {
    await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
      timeout: 60_000,
    });
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.evaluate(
      ({ id, log, user }) => {
        const key = user
          ? `lt.profile-device.v1.user.${encodeURIComponent(user)}`
          : "lt.profile-device.v1.guest";
        const previous = JSON.parse(localStorage.getItem(key) || "null");
        const data = {
          ...(previous?.data ?? {}),
          onboardingComplete: true,
          activeModuleId: id,
          purchasedModules: [id],
          selectedLanguage: "Spanish",
          nativeLanguage: "English",
          currentTab: "core30",
          core30Log: log,
        };
        localStorage.setItem(key, JSON.stringify({ schema: 1, userId: user, data }));
      },
      { id: moduleId, log: core30Log, user: userId },
    );
    await page.goto(`/?tab=core30&module=${moduleId}&target=Spanish&native=English`);
    await page
      .getByTestId(ready)
      .waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 })
      .catch(() => undefined);
    if (await page.getByTestId(ready).isVisible()) return;
  }
  await expect(page.getByTestId(ready)).toBeVisible();
}

test.describe("Roofing Foundation: signed out", () => {
  test("shows the free-account prompt, not the paid trial", async ({ page }) => {
    await openCore30(page, FOUNDATION, {}, "foundation-signin-prompt");
    const prompt = page.getByTestId("foundation-signin-prompt");
    await expect(prompt).toContainText("Free with a free account");
    await expect(prompt).toContainText(
      "The Roofing Foundation is free. Create a free account or sign in to start Lesson 1.",
    );
    await expect(page.getByText("Start Free Trial")).toHaveCount(0);
    await expect(page.getByText("Start your free 7-day trial")).toHaveCount(0);
    await prompt.getByTestId("foundation-signin-open").click();
    await expect(page.getByRole("dialog").getByPlaceholder("Email")).toBeVisible();
  });
});

test.describe("Roofing Foundation: signed in", () => {
  test("14-day plan card, Day 1 of 14, and Lesson 1 opens", async ({ page }) => {
    await signIn(page);
    await openCore30(
      page,
      FOUNDATION,
      { [scopeKey(FOUNDATION)]: { startDate: today(), lessons: {} } },
      "core30-plan-card",
      FAKE_USER_ID,
    );
    await expect(page.getByTestId("foundation-signin-prompt")).toHaveCount(0);
    const card = page.getByTestId("core30-plan-card");
    await expect(card).toContainText("Day 1 of 14");
    await expect(card).not.toContainText("90");
    const path = page.getByTestId("core60-path");
    await expect(path).toBeVisible();
    await expect(page.getByTestId("core60-step-foundation")).toHaveAttribute("aria-current", "step");
    await expect(page.getByTestId("core60-step-foundation")).toContainText(
      "Foundation · 10 lessons · free",
    );
    await expect(page.getByTestId("core60-step-core")).toContainText("Core 30 · 30 lessons");
    await expect(page.getByTestId("core60-step-master")).toContainText("Master 20 · 20 lessons");
    // The path sits above the Next Up lesson card.
    const pathBox = await path.boundingBox();
    const nextUp = await page.getByText(/Next Up · Foundation Lesson 1/).boundingBox();
    expect(pathBox!.y).toBeLessThan(nextUp!.y);
    await page.getByRole("button", { name: /Today: Lesson 1|Start Lesson 1/ }).first().click();
    await expect(page.getByText("✕ Exit")).toBeVisible();
    await expect(page.getByTestId("lesson-section-nav")).toBeVisible();
    await expect(page.getByTestId("lesson-reader")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("lesson-reader")).toContainText("First Day on the Roof");
  });

  test("an unstarted plan offers the 14-day plan", async ({ page }) => {
    await signIn(page);
    await openCore30(page, FOUNDATION, {}, "core30-plan-card", FAKE_USER_ID);
    const card = page.getByTestId("core30-plan-card");
    await expect(card).toContainText("14-day plan");
    await expect(card).toContainText("Learn all 10 lessons in 14 days");
    await expect(card).toContainText("One new lesson every day.");
    await expect(page.getByTestId("core30-start-plan")).toHaveText("Start my 14-day plan");
  });

  test("the path goes from the Foundation to Roofing and back", async ({ page }) => {
    await signIn(page);
    await openCore30(page, FOUNDATION, {}, "core60-path", FAKE_USER_ID);
    await expect(page.getByTestId("core60-step-core")).toHaveJSProperty("tagName", "BUTTON");
    await page.getByTestId("core60-step-core").click();
    await expect(page.getByRole("heading", { name: "The Roofing Foreman Core 30" })).toBeVisible();
    await expect(page.getByTestId("core60-step-core")).toHaveAttribute("aria-current", "step");
    await expect(page.getByTestId("core60-step-foundation")).toContainText("New to Spanish? Start here.");
    await page.getByTestId("core60-step-foundation").click();
    await expect(page.getByRole("heading", { name: "The Roofing Foundation" })).toBeVisible();
    await expect(page.getByTestId("core60-step-foundation")).toHaveAttribute("aria-current", "step");
  });
});

test.describe("Roofing Core 30 links to the Foundation", () => {
  test("shows the path with the beginner nudge, and the Foundation step switches module", async ({
    page,
  }) => {
    await openCore30(page, "roofing", {}, "core60-path");
    await expect(page.getByTestId("core60-step-core")).toHaveAttribute("aria-current", "step");
    const step = page.getByTestId("core60-step-foundation");
    await expect(step).toContainText("Foundation · 10 lessons · free");
    await expect(step).toContainText("0 / 10 mastered");
    await expect(step).toContainText("New to Spanish? Start here.");
    // The path sits above the plan card.
    const pathBox = await page.getByTestId("core60-path").boundingBox();
    const planBox = await page.getByTestId("core30-plan-card").boundingBox();
    expect(pathBox!.y).toBeLessThan(planBox!.y);
    await step.click();
    // A guest lands on the sign-in prompt of the Foundation: the module did switch.
    await expect(page.getByTestId("foundation-signin-prompt")).toBeVisible();
    await expect(page).toHaveURL(/module=foundation-roofing/);
  });

  test("drops the nudge once all ten Foundation lessons are mastered", async ({ page }) => {
    const lessons: Record<string, unknown> = {};
    for (let n = 1; n <= 10; n++) {
      lessons[String(n)] = { visits: {}, masteredAt: "2026-03-02T12:00:00.000Z" };
    }
    await openCore30(
      page,
      "roofing",
      { [scopeKey(FOUNDATION)]: { startDate: today(), lessons } },
      "core30-plan-card",
    );
    await expect(page.getByTestId("core60-path")).toBeVisible();
    await expect(page.getByTestId("core60-step-foundation")).toContainText("10 / 10 mastered");
    await expect(page.getByText("New to Spanish? Start here.")).toHaveCount(0);
  });

  test("keeps the 90-day plan on the Roofing page", async ({ page }) => {
    await openCore30(page, "roofing", {}, "core30-plan-card");
    await expect(page.getByTestId("core30-plan-card")).toContainText("90-day plan");
    await expect(page.getByTestId("core30-start-plan")).toHaveText("Start my 90-day plan");
  });
});
