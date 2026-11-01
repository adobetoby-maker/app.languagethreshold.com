import { expect, test, type Page } from "@playwright/test";

// Public, authored content and practice only: no provider calls or real learner account.
test.use({ storageState: { cookies: [], origins: [] } });
async function openCourse(page: Page, moduleId: string, signedIn = false) {
  const id = "00000000-0000-4000-8000-00000000a060";
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const user = {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: "military-e2e@example.test",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const session = {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: id, aud: "authenticated", role: "authenticated", exp })}.fixture`,
    refresh_token: "fixture-refresh",
    token_type: "bearer",
    expires_in: 86400,
    expires_at: exp,
    user,
  };
  await page.addInitScript(
    ({ moduleId, signedIn, id, session }) => {
      const actor = signedIn ? id : null;
      if (signedIn)
        localStorage.setItem("sb-pollhlkgltdkdskdzsgd-auth-token", JSON.stringify(session));
      const key = actor ? `lt.profile-device.v1.user.${actor}` : "lt.profile-device.v1.guest";
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            schema: 1,
            userId: actor,
            data: {
              onboardingComplete: true,
              selectedLanguage: "English",
              nativeLanguage: "Spanish",
              activeModuleId: moduleId,
              currentTab: "core30",
              purchasedModules: ["military", "foundation-military", "master-military"],
            },
          }),
        );
    },
    { moduleId, signedIn, id, session },
  );
  await page.goto(`/?module=${moduleId}&target=English&native=Spanish&tab=core30`);
}

test("Military Core has the 10/30/20 path, English cards, Spanish reading, and six working modes", async ({
  page,
}) => {
  await openCourse(page, "military");
  await expect(page.getByTestId("core60-path")).toBeVisible();
  await expect(page.getByTestId("core60-eyebrow")).toHaveText(
    "Core 60 · Military English · Step 2 of 3",
  );
  await expect(page.getByTestId("core60-path").locator("li")).toHaveCount(3);
  await page
    .getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/, exact: true })
    .click();
  await expect(page.getByTestId("lesson-section-nav").getByRole("button")).toHaveCount(6);
  const reading = page.getByTestId("lesson-section-see");
  await expect(reading).toContainText("A squad leader describes");
  await expect(reading).toContainText("Un jefe de escuadra");
  await expect(reading.getByRole("button", { name: /full reader/i })).toBeVisible();
  await page.getByTestId("lesson-nav-recall").click();
  await expect(page.getByTestId("lesson-practice-section")).toContainText("responsibility");
  await expect(page.getByTestId("lesson-practice-section")).toContainText("responsabilidad");
  await page.getByTestId("lesson-nav-hear").click();
  await expect(page.getByTestId("lesson-section-kit")).toBeVisible();
  await page.getByTestId("lesson-nav-type").click();
  await expect(page.getByRole("region", { name: "Typed lesson response" })).toBeVisible();
  await page.getByTestId("lesson-nav-write").click();
  await page.getByRole("combobox", { name: "Writing activity" }).selectOption("response");
  await expect(page.getByRole("region", { name: "Handwritten lesson response" })).toBeVisible();
  await page.getByRole("button", { name: "Back to lesson", exact: true }).click();
  await page.getByTestId("lesson-nav-say").click();
  const practice = page.getByTestId("lesson-speaking-practice");
  await expect(practice).toContainText("A squad leader describes");
  await practice.locator("summary").click();
  await expect(practice.locator("dt").first()).toHaveText("responsibility");
  await page.screenshot({
    path: `test-results/military-core-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByTestId("lesson-nav-see").click();
  await reading.getByRole("button", { name: /full reader/i }).click();
  await expect(page.getByTestId("reader-options")).toBeVisible();
  await expect(page.locator("body")).toContainText("A squad leader describes");
});

test("Military Foundation keeps beginner translation support and account access", async ({
  page,
}) => {
  await openCourse(page, "foundation-military", true);
  await expect(page.getByTestId("core60-eyebrow")).toContainText("Step 1 of 3");
  await page
    .getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/, exact: true })
    .click();
  await expect(page.getByTestId("lesson-section-see")).toContainText("El sargento Rivera");
  await page.getByTestId("lesson-nav-say").click();
  await expect(page.getByTestId("lesson-speaking-practice").locator("details")).toHaveAttribute(
    "open",
    "",
  );
});

test("Military Master uses its grammar contrast and independent response settings", async ({
  page,
}) => {
  await openCourse(page, "master-military");
  await expect(page.getByTestId("core60-eyebrow")).toContainText("Step 3 of 3");
  await page
    .getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/, exact: true })
    .click();
  await expect(page.getByTestId("lesson-grammar-focus")).toBeVisible();
  await page.getByTestId("lesson-nav-say").click();
  await expect(page.getByTestId("lesson-speaking-practice")).toContainText(
    "Need the lesson word bank?",
  );
});
