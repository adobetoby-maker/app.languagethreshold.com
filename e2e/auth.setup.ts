import { expect, test } from "@playwright/test";

// Runs the first-run flow once (pick Spanish, start reading) and saves the
// browser state so every other test opens the app already past onboarding.
test("complete first-run onboarding", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("What are you learning?")).toBeVisible({ timeout: 60_000 });
  const overlay = page.locator("div.fixed.inset-0.z-\\[100\\]");
  await overlay.getByRole("button", { name: /^\s*Spanish/ }).click();
  await overlay.getByRole("button", { name: "Start reading" }).click();
  await expect(page.getByRole("button", { name: "Start reading" })).toHaveCount(0);
  await expect(page.getByText("What are you learning?")).toHaveCount(0);
  await page.context().storageState({ path: "e2e/.auth/state.json" });
});
