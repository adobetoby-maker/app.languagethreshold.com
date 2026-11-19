import { expect, test } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
const modules = [
  "foundation-dance-team",
  "dance-team",
  "master-dance-team",
  "foundation-cosmetology",
  "cosmetology",
  "master-cosmetology",
];
for (const moduleId of modules)
  test(`${moduleId}: six study modes and full Reader`, async ({ page }, info) => {
    const id = "00000000-0000-4000-8000-00000000d060";
    const exp = Math.floor(Date.now() / 1000) + 86400;
    const user = {
      id,
      aud: "authenticated",
      role: "authenticated",
      email: "interests-e2e@example.test",
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
    await page.route("https://pollhlkgltdkdskdzsgd.supabase.co/**", async (route) => {
      const url = new URL(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(url.pathname.endsWith("/user") ? user : []),
      });
    });
    await page.addInitScript(
      ({ moduleId, modules, id, session }) => {
        localStorage.setItem("sb-pollhlkgltdkdskdzsgd-auth-token", JSON.stringify(session));
        localStorage.setItem(
          `lt.profile-device.v1.user.${id}`,
          JSON.stringify({
            schema: 1,
            userId: id,
            data: {
              onboardingComplete: true,
              selectedLanguage: "Spanish",
              nativeLanguage: "English",
              activeModuleId: moduleId,
              currentTab: "core30",
              purchasedModules: modules,
            },
          }),
        );
      },
      { moduleId, modules, id, session },
    );
    const content = JSON.parse(readFileSync(`public/lesson-content/es/${moduleId}.json`, "utf8"));
    await page.goto(`/?module=${moduleId}&target=Spanish&native=English&tab=core30`);
    await expect(page.getByTestId("core60-path")).toBeVisible();
    await expect(page.getByTestId("core60-path").locator("li")).toHaveCount(3);
    await page
      .getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/, exact: true })
      .click();
    await expect(
      page.getByRole("navigation", { name: "Lesson practice modes" }).getByRole("button"),
    ).toHaveCount(6);
    const reading = page.getByTestId("lesson-section-see");
    await expect(reading).toContainText(content.lessons["1"].passage.target[0]);
    for (const mode of ["recall", "hear", "type", "write", "say"]) {
      await page
        .getByRole("navigation", { name: "Lesson practice modes" })
        .getByRole("button", {
          name: (
            {
              recall: "Recall it",
              hear: "Hear it",
              type: "Type it",
              write: "Write it",
              say: "Say it",
            } as Record<string, string>
          )[mode],
          exact: true,
        })
        .click();
      if (mode === "say") await expect(page.getByTestId("lesson-speaking-practice")).toBeVisible();
      else if (mode === "type")
        await expect(page.getByRole("region", { name: "Typed lesson response" })).toBeVisible();
      else if (mode === "write") {
        await expect(page.getByRole("combobox", { name: "Writing activity" })).toBeVisible();
        await page.getByRole("combobox", { name: "Writing activity" }).selectOption("response");
        await expect(
          page.getByRole("region", { name: "Handwritten lesson response" }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Back to lesson", exact: true }).click();
      } else await expect(page.getByTestId("lesson-section-kit")).toBeVisible();
    }
    await page
      .getByRole("navigation", { name: "Lesson practice modes" })
      .getByRole("button", { name: "See it", exact: true })
      .click();
    await expect(page.getByTestId("lesson-section-see")).toContainText(
      content.lessons["1"].passage.target[0],
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
    ).toBeTruthy();
    mkdirSync("test-results/interests-previews", { recursive: true });
    await page.screenshot({
      path: `test-results/interests-previews/${moduleId}-${info.project.name}.png`,
      fullPage: true,
    });
    await reading.getByText("More reading options", { exact: true }).click();
    await reading.getByTestId("lesson-open-full-reader").click();
    await expect(page.getByTestId("reader-options")).toBeVisible();
    await expect(page.locator("body")).toContainText(content.lessons["1"].passage.target[0]);
  });
