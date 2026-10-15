import { expect, test } from "@playwright/test";

// The Roofing chip in the Dictionary must list the roofing terms and crew
// phrases for Spanish even when the Roofing module is not the active module.
test("dictionary: Roofing chip lists entries without the Roofing module", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("lt.app.v2") || "{}");
    state.activeModuleId = null;
    state.selectedLanguage = "Spanish";
    state.currentTab = "dictionary";
    localStorage.setItem("lt.app.v2", JSON.stringify(state));
  });
  await page.reload();
  const chip = page.getByRole("button", { name: /^\s*roofing\s*$/i }).first();
  await expect(chip).toBeVisible({ timeout: 60_000 });
  await chip.click();
  await expect(page.getByText(/\b\d+ results?\b/i).first()).toBeVisible();
  await expect(page.getByText(/^0 results?$/i)).toHaveCount(0);
  await expect(page.getByText("Roofing crew language").first()).toBeVisible();
});
