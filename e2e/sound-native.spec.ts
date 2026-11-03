import { test, expect, type Page } from "@playwright/test";
test.use({ storageState: { cookies: [], origins: [] } });
async function openCourse(page: Page, id: string) {
  const signedIn = id.startsWith("foundation-") || id.startsWith("master-");
  const actor = "00000000-0000-4000-8000-00000000a061";
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const user = {
    id: actor,
    aud: "authenticated",
    role: "authenticated",
    email: "sound-e2e@example.test",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const session = {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: actor, aud: "authenticated", role: "authenticated", exp })}.fixture`,
    refresh_token: "fixture-refresh",
    token_type: "bearer",
    expires_in: 86400,
    expires_at: exp,
    user,
  };
  if (signedIn) await page.route("**/auth/v1/user", (route) => route.fulfill({ json: user }));
  await page.addInitScript(
    ({ id, signedIn, actor, session }) => {
      if (signedIn)
        localStorage.setItem("sb-pollhlkgltdkdskdzsgd-auth-token", JSON.stringify(session));
      const key = signedIn ? `lt.profile-device.v1.user.${actor}` : "lt.profile-device.v1.guest";
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            schema: 1,
            userId: signedIn ? actor : null,
            data: {
              onboardingComplete: true,
              selectedLanguage: "Spanish",
              nativeLanguage: "English",
              activeModuleId: id,
              currentTab: "core30",
              purchasedModules: [
                "foundation-sound-like-a-native",
                "sound-like-a-native",
                "master-sound-like-a-native",
              ],
            },
          }),
        );
    },
    { id, signedIn, actor, session },
  );
  await page.goto(`/?module=${id}&target=Spanish&native=English&tab=core30`);
  await expect(page.getByTestId("core60-path")).toBeVisible();
  await page
    .getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/, exact: true })
    .click();
  await expect(page.getByTestId("sound-practice")).toBeVisible();
}
test("sound course connects patter, saved clear-run timing, all six modes, and its exact full Reader", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openCourse(page, "sound-like-a-native");
  const lab = page.getByTestId("sound-practice");
  await lab.getByLabel("Sound family", { exact: true }).selectOption("k");
  await expect(page.getByTestId("sound-pattern-units")).toHaveText("caquicuqueco");
  await expect(lab).toContainText("Back of tongue meets the soft palate");
  await lab.getByLabel("Sound pattern", { exact: true }).selectOption("example");
  await expect(lab).toContainText("ka · ki · ki · ke · ko");
  await page.clock.install();
  await lab.getByRole("button", { name: "Start sound run", exact: true }).click();
  await expect(lab.getByLabel("Sound pace", { exact: true })).toBeDisabled();
  await page.clock.runFor(5200);
  await expect(page.getByTestId("sound-run-status")).toContainText("Cue run finished");
  await lab.getByRole("button", { name: "I said this run clearly", exact: true }).click();
  await expect(page.getByTestId("sound-run-record")).toContainText(
    "1 completed runs · 1 marked clear",
  );
  await lab.getByLabel("Sound game", { exact: true }).selectOption("timed");
  await lab.getByRole("button", { name: "Start sound run", exact: true }).click();
  await page.clock.runFor(8000);
  await lab.getByRole("button", { name: "Finish spoken run", exact: true }).click();
  await lab.getByRole("button", { name: "I said this run clearly", exact: true }).click();
  await expect(page.getByTestId("sound-run-status")).toContainText(
    "Speech was not automatically assessed",
  );
  await expect(page.getByTestId("sound-run-record")).toContainText(
    "2 completed runs · 2 marked clear",
  );
  await lab.getByRole("button", { name: "Start sound run", exact: true }).click();
  await page.getByTestId("lesson-nav-recall").click();
  await page.getByTestId("lesson-nav-see").click();
  await expect(lab.getByRole("button", { name: "Stop run", exact: true })).toBeDisabled();
  for (const mode of ["recall", "hear", "type", "say", "write"]) {
    await page.getByTestId(`lesson-nav-${mode}`).click();
    if (mode === "say") await expect(page.getByTestId("lesson-speaking-practice")).toBeVisible();
    if (mode === "write")
      await page.getByRole("button", { name: "Back to lesson", exact: true }).click();
  }
  await page.getByTestId("lesson-nav-see").click();
  await page
    .getByTestId("lesson-section-see")
    .getByRole("button", { name: /full reader/i })
    .click();
  await expect(page.getByTestId("reader-options")).toBeVisible();
  await expect(page.locator("body")).toContainText("Beatriz busca una bolsa verde");
  expect(errors).toEqual([]);
});
for (const [id, text] of [
  ["foundation-sound-like-a-native", "Mira el mapa que está en la mesa."],
  ["master-sound-like-a-native", "Hoy tengo tiempo para revisar el plan."],
]) {
  test(`${id} loads its authored physical lesson and stage-specific reading`, async ({ page }) => {
    await openCourse(page, id);
    await expect(page.getByTestId("lesson-section-nav").getByRole("button")).toHaveCount(6);
    await expect(page.getByTestId("lesson-section-see")).toContainText(text);
    await expect(page.getByTestId("sound-practice")).toContainText("ma");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/${id}-${test.info().project.name}.png`,
      fullPage: true,
    });
  });
}

for (const [id, n, title, reading] of [
  [
    "foundation-sound-like-a-native",
    10,
    "Foundation transfer check",
    "Mi amigo quiere ir al parque",
  ],
  ["sound-like-a-native", 30, "Core transfer check", "Hay un cambio de lugar"],
  ["master-sound-like-a-native", 20, "Final transfer portfolio", "Leo un texto nuevo"],
] as const) {
  test(`${id} final lesson has its own sound practice and reading`, async ({ page }) => {
    await openCourse(page, id);
    await page.goto(`/?module=${id}&target=Spanish&native=English&tab=core30&lesson=${n}&way=see`);
    await expect(page.getByTestId("sound-practice")).toContainText(title);
    await expect(page.getByTestId("lesson-section-see")).toContainText(reading);
    await expect(page.getByTestId("sound-run-record")).toContainText("0 completed runs");
    await expect(
      page.getByTestId("lesson-nav-top").getByRole("button", { name: /^Next lesson:/ }),
    ).toBeDisabled();
  });
}
