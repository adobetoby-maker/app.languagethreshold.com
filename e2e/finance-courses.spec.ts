import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
// Authored public material only. No real learner account, provider call or database write.
test.use({ storageState: { cookies: [], origins: [] } });
const fixtureId = "00000000-0000-4000-8000-00000000f060";
const exp = Math.floor(Date.now() / 1000) + 86400;
const user = {
  id: fixtureId,
  aud: "authenticated",
  role: "authenticated",
  email: "finance-e2e@example.test",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const session = {
  access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: fixtureId, aud: "authenticated", role: "authenticated", exp })}.fixture`,
  refresh_token: "fixture-refresh",
  token_type: "bearer",
  expires_in: 86400,
  expires_at: exp,
  user,
};
const bases = ["accounting", "personal-money", "travel-money"];
for (const base of bases)
  for (const [target, native, pair] of [
    ["Spanish", "English", "es-en"],
    ["English", "Spanish", "en-es"],
  ]) {
    const track = target === "Spanish" ? base : base + "-english";
    for (const [stage, count] of [
      ["foundation", 10],
      ["core", 30],
      ["master", 20],
    ] as const) {
      const moduleId = stage === "core" ? track : `${stage}-${track}`;
      for (const n of [1, count])
        test(`${moduleId} lesson ${n}: six modes and exact Reader handoff`, async ({ page }) => {
          await page.route("**/*.supabase.co/**", (r) =>
            r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
          );
          await page.route("**/api/mission-tts*", (r) =>
            r.fulfill({
              status: 503,
              contentType: "application/json",
              body: '{"error":"Test: no provider calls"}',
            }),
          );
          const source = JSON.parse(
            readFileSync(`content/finance/${base}/${pair}.json`, "utf8"),
          ).find(
            (r: { stage: string; lesson: { n: number } }) => r.stage === stage && r.lesson.n === n,
          );
          await page.addInitScript(
            ({ moduleId, target, native, tracks, fixtureId, session }) => {
              localStorage.setItem("sb-pollhlkgltdkdskdzsgd-auth-token", JSON.stringify(session));
              localStorage.setItem("lt.languageChosen", "1");
              localStorage.setItem(
                `lt.profile-device.v1.user.${fixtureId}`,
                JSON.stringify({
                  schema: 1,
                  userId: fixtureId,
                  data: {
                    onboardingComplete: true,
                    selectedLanguage: target,
                    nativeLanguage: native,
                    activeModuleId: moduleId,
                    currentTab: "core30",
                    purchasedModules: tracks,
                  },
                }),
              );
            },
            {
              fixtureId,
              session,
              moduleId,
              target,
              native,
              tracks: bases
                .flatMap((b) => [b, `${b}-english`])
                .flatMap((b) => [b, `foundation-${b}`, `master-${b}`]),
            },
          );
          await page.goto(
            `/?module=${moduleId}&target=${target}&native=${native}&tab=core30&lesson=${n}&way=see`,
          );
          const see = page.getByTestId("lesson-section-see");
          await expect(see).toBeVisible();
          await expect(see).toContainText(source.content.passage.target[0]);
          await expect(
            page.getByRole("navigation", { name: "Lesson practice modes" }).getByRole("button"),
          ).toHaveCount(6);
          await page.getByTestId("v6-nav-recall").click();
          await expect(page.getByTestId("lesson-practice-section")).toBeVisible();
          await page.getByTestId("v6-nav-hear").click();
          await expect(page.getByTestId("lesson-section-kit")).toBeVisible();
          await page.getByTestId("v6-nav-type").click();
          await expect(page.getByRole("region", { name: "Typed lesson response" })).toBeVisible();
          await page.getByTestId("v6-nav-write").click();
          await page.getByRole("combobox", { name: "Writing activity" }).selectOption("response");
          await expect(
            page.getByRole("region", { name: "Handwritten lesson response" }),
          ).toBeVisible();
          await page.getByRole("button", { name: "Back to lesson", exact: true }).click();
          await page.getByTestId("v6-nav-say").click();
          await expect(page.getByTestId("lesson-speaking-practice")).toBeVisible();
          await page.getByTestId("v6-nav-see").click();
          await see.getByText("More reading options", { exact: true }).click();
          await see.getByRole("button", { name: /full reader/i }).click();
          await expect(page.getByTestId("reader-options")).toBeVisible();
          await expect(page.locator("body")).toContainText(source.content.passage.target[0]);
          const envelope = await page.evaluate(() =>
            JSON.parse(
              localStorage.getItem(
                "lt.profile-device.v1.user.00000000-0000-4000-8000-00000000f060",
              ) ?? "{}",
            ),
          );
          expect(envelope.data.activeModuleId).toBe(moduleId);
          expect(envelope.data.selectedLanguage).toBe(target);
          expect(envelope.data.nativeLanguage).toBe(native);
        });
    }
  }
