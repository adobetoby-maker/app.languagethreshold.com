import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function openCatalog(page: Page) {
  await page.route("**/*.supabase.co/**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.addInitScript(() => {
    localStorage.setItem("lt.languageChosen", "1");
    if (!localStorage.getItem("lt.profile-device.v1.guest"))
      localStorage.setItem(
        "lt.profile-device.v1.guest",
        JSON.stringify({
          schema: 1,
          userId: null,
          data: {
            onboardingComplete: true,
            selectedLanguage: "Spanish",
            nativeLanguage: "English",
            activeModuleId: "roofing",
            currentTab: "core30",
            purchasedModules: ["roofing", "accounting"],
          },
        }),
      );
  });
  await page.goto("/?module=roofing&target=Spanish&native=English&tab=core30");
  await page.getByRole("button", { name: /^Choose course,/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Finance", exact: true }).click();
  await expect(dialog.locator('[data-stage-module-id="accounting"]')).toBeVisible();
  return dialog;
}
test("cold Finance selection opens its path and loads only that exact-pair course", async ({
  page,
}) => {
  const packs: string[] = [];
  page.on("request", (r) => {
    if (
      /\/finance-courses\/(accounting|personal-money|travel-money)(-english)?\.(json|js)/.test(
        r.url(),
      )
    )
      packs.push(r.url());
  });
  const dialog = await openCatalog(page);
  await dialog.locator('[data-stage-module-id="accounting"]').click();
  await expect(
    page.getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Choose course, Accounting/ })).toBeVisible();
  expect(packs.length).toBeGreaterThan(0);
  expect(packs.every((url) => /\/accounting\.(json|js)/.test(url))).toBeTruthy();
});
test("a failed course import offers a real retry and a way back to courses", async ({ page }) => {
  let fail = true;
  await page.route(/\/finance-courses\/accounting\.json/, (r) =>
    fail ? r.fulfill({ status: 503, body: "offline" }) : r.continue(),
  );
  const dialog = await openCatalog(page);
  await dialog.locator('[data-stage-module-id="accounting"]').click();
  await expect(page.getByRole("status")).toContainText("This course could not load");
  await expect(page.getByRole("button", { name: "Back to courses", exact: true })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry course", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Start (?:Foundation |Master )?Lesson 1$/ }),
  ).toBeVisible();
});
