import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { readAppState } from "./app-state";
const practice = JSON.parse(readFileSync("src/data/spanish-basics-practice.json", "utf8"));
test.use({ storageState: { cookies: [], origins: [] } });
async function openCourse(page: Page, moduleId: string, signedIn = false) {
  const id = "00000000-0000-4000-8000-00000000a060";
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const user = {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: "spanish-basics-e2e@example.test",
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
              selectedLanguage: "Spanish",
              nativeLanguage: "English",
              activeModuleId: moduleId,
              currentTab: "core30",
              purchasedModules: [
                "spanish-basics",
                "foundation-spanish-basics",
                "master-spanish-basics",
              ],
            },
          }),
        );
    },
    { moduleId, signedIn, id, session },
  );
  await page.route("**/api/team-activity", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sessions: {}, recorded: 0 }),
    }),
  );
  await page.goto(`/?module=${moduleId}&target=Spanish&native=English&tab=core30`);
}

test("default Core 60 offers a general Spanish starter without a specialty", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "lt.profile-device.v1.guest",
      JSON.stringify({
        schema: 1,
        userId: null,
        data: {
          onboardingComplete: true,
          selectedLanguage: "Spanish",
          nativeLanguage: "English",
          activeModuleId: null,
          currentTab: "core30",
        },
      }),
    ),
  );
  await page.goto("/?tab=core30&module=core&target=Spanish&native=English");
  await expect(
    page.getByRole("link", { name: "Start Spanish 101 · Foundation", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Start Spanish 101 · Foundation", exact: true }).click();
  await expect(page.getByTestId("foundation-signin-prompt")).toBeVisible();
});

test("starter teaches grammar and requires correct retrieval before learner mastery", async ({
  page,
}, info) => {
  await openCourse(page, "foundation-spanish-basics", true);
  await expect(page.getByTestId("core60-eyebrow")).toContainText("Step 1 of 3");
  await page
    .getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/, exact: true })
    .click();
  await expect(page.getByTestId("lesson-grammar-focus")).toContainText("Spanish vowel");
  await expect(page.getByTestId("lesson-section-nav").getByRole("button")).toHaveCount(6);
  const mastery = page.getByTestId("core30-mastered-button");
  await expect(mastery).toBeDisabled();
  const check = page.getByRole("region", { name: "Grammar practice check" });
  await check.getByRole("button", { name: "Check grammar" }).click();
  await expect(check).toContainText("Review:");
  await expect(mastery).toBeDisabled();
  const accentAnswer = page.getByLabel("Grammar answer 3", { exact: true });
  await accentAnswer.fill("Cmo");
  await accentAnswer.evaluate((input: HTMLInputElement) => input.setSelectionRange(1, 1));
  await check.getByRole("button", { name: "Insert ó", exact: true }).click();
  await expect(accentAnswer).toHaveValue("Cómo");
  for (const [i, q] of practice["foundation-spanish-basics"]["1"].checks.entries())
    await page.getByLabel(`Grammar answer ${i + 1}`, { exact: true }).fill(q.answer);
  await check.getByRole("button", { name: "Check grammar" }).click();
  await expect(check).toContainText("3 of 3 correct");
  await expect(mastery).toBeEnabled();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (mode) => document.documentElement.classList.toggle("dark", mode === "dark"),
      theme,
    );
    await page.getByTestId("lesson-grammar-focus").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/spanish-basics-${info.project.name}-${theme}.png` });
  }
  await mastery.click();
  await expect
    .poll(async () =>
      JSON.stringify((await readAppState(page, "00000000-0000-4000-8000-00000000a060")).core30Log),
    )
    .toContain("masteredAt");
  await page.reload();
  await expect(page.getByTestId("core60-eyebrow")).toContainText("Step 1 of 3");
});

test("Core has all six modes, exact Spanish reading and a working Reader handoff", async ({
  page,
}) => {
  await openCourse(page, "spanish-basics");
  await expect(page.getByTestId("core60-eyebrow")).toContainText("Step 2 of 3");
  await page
    .getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/, exact: true })
    .click();
  const reading = page.getByTestId("lesson-section-see");
  await expect(reading).toContainText("Estudio español por la mañana.");
  await expect(page.getByTestId("lesson-grammar-focus")).toContainText("Remove -ar");
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
  await expect(page.getByTestId("lesson-speaking-practice")).toContainText(
    "Estudio español por la mañana.",
  );
  await page.getByTestId("lesson-nav-see").click();
  await reading.getByRole("button", { name: /full reader/i }).click();
  await expect(page.getByTestId("reader-options")).toBeVisible();
  await expect(page.locator("body")).toContainText("Estudio español por la mañana.");
});

test("Master applies familiar beginner grammar with English support", async ({ page }) => {
  await openCourse(page, "master-spanish-basics");
  await expect(page.getByTestId("core60-eyebrow")).toContainText("Step 3 of 3");
  await page
    .getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/, exact: true })
    .click();
  await expect(page.getByTestId("lesson-grammar-focus")).toBeVisible();
  await expect(page.getByTestId("lesson-section-see")).toContainText("Soy de Perú");
  await expect(page.getByRole("region", { name: "Grammar practice check" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("lesson verb matches fit side by side on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCourse(page, "spanish-basics");
  await page
    .getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/, exact: true })
    .click();
  const see = page.getByTestId("lesson-section-see");
  await expect(see).toHaveCSS("border-left-width", "0px");
  const games = page.getByRole("region", { name: "Lesson verb games" });
  await games.getByRole("button", { name: "Match verb meanings" }).click();
  const columns = games.getByTestId("lesson-verb-game-round").locator(".grid.grid-cols-2 > div");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const game = await games.boundingBox();
    const left = await columns.nth(0).getByRole("button").all();
    const right = await columns.nth(1).getByRole("button").all();
    expect(game).not.toBeNull();
    for (const button of left) {
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x + box!.width).toBeLessThanOrEqual((await right[0].boundingBox())!.x - 8);
    }
    for (const button of right) {
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x + box!.width).toBeLessThanOrEqual(game!.x + game!.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test("Spanish 101 card lists retain independent word choices across reload", async ({
  page,
}) => {
  await openCourse(page, "foundation-spanish-basics", true);
  await page
    .getByRole("button", { name: "Practice Spanish 101 vocabulary · My card lists", exact: true })
    .click();
  await page.getByText("My card lists ·", { exact: false }).click();
  await page.getByLabel("New card list name").fill("Week 1");
  await page.getByRole("button", { name: "Create list", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Study list" })).not.toHaveValue("default");
  const first = page.getByRole("checkbox").first();
  await expect(first).toBeChecked();
  await first.uncheck();
  await page.reload();
  await page.getByText("My card lists ·", { exact: false }).click();
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();
  await page.getByRole("button", { name: "Exclude all shown decks", exact: true }).click();
  await expect(page.locator('input[type="checkbox"]:checked')).toHaveCount(0);
  await page.getByRole("combobox", { name: "Study list" }).selectOption("default");
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await page.getByLabel("Find a word").fill("yo hablo");
  await expect(page.getByText("yo hablo", { exact: true }).first()).toBeVisible();
});

test("Core Basics is second after All and searchable in the library and picker", async ({
  page,
}) => {
  await openCourse(page, "foundation-spanish-basics");
  await page.goto("/?tab=modules&target=Spanish&native=English");
  const filters = page.getByTestId("module-filters");
  await filters.locator("summary").click();
  await expect(filters.getByRole("button").nth(0)).toContainText("All");
  await expect(filters.getByRole("button").nth(1)).toContainText("Core Basics (7)");
  await filters.getByRole("button", { name: /Core Basics/ }).click();
  await expect(page.locator("[data-module-id]")).toHaveCount(7);
  await page.screenshot({ path: "/tmp/core-basics-category-phone.png" });
  await page.getByPlaceholder("Search modules, roles, or keywords…").fill("high use grammar");
  await expect(page.locator("[data-module-id]")).toHaveCount(1);
  await expect(page.locator('[data-module-id="spanish-common-patterns"]')).toBeVisible();
  await page
    .getByRole("navigation", { name: "Primary", exact: true })
    .getByRole("button", { name: /Spanish 101/ })
    .click();
  const picker = page.getByRole("dialog", { name: "Select Module" });
  await picker.getByRole("button", { name: "Core Basics", exact: true }).click();
  await expect(picker.locator("[data-module-id]")).toHaveCount(7);
  await picker.getByPlaceholder("Search modules…").fill("high frequency verbs");
  await expect(picker.locator('[data-module-id="spanish-frequent-verbs"]')).toBeVisible();
  await expect(picker.locator('[data-module-id="roofing"]')).toHaveCount(0);
});
