import { expect, test } from "@playwright/test";
import { appUrl, seedAppState } from "./app-state.ts";

// The Roofing chip in the Dictionary must list the roofing terms and crew
// phrases for Spanish even when the Roofing module is not the active module.
test("dictionary: Roofing chip lists entries without the Roofing module", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  const chip = page.getByRole("button", { name: /^\s*roofing\s*$/i }).first();
  // A cold dev server can drop the seeded state on the first reload, so retry like core30.spec does.
  for (let attempt = 0; attempt < 3; attempt++) {
    await seedAppState(page, {
      activeModuleId: null,
      selectedLanguage: "Spanish",
      currentTab: "dictionary",
    });
    await page.goto(appUrl({ tab: "dictionary" }));
    await chip.waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 }).catch(() => undefined);
    if (await chip.isVisible()) break;
  }
  await expect(chip).toBeVisible({ timeout: 60_000 });
  await chip.click();
  await expect(page.getByText(/\b\d+ results?\b/i).first()).toBeVisible();
  await expect(page.getByText(/^0 results?$/i)).toHaveCount(0);
  await expect(page.getByText("Roofing crew language").first()).toBeVisible();
});
