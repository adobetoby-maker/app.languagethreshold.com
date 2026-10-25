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

test("existing curriculum word opens a card with lesson links and no dictionary API call", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/_serverFn/**", async (route) => {
    const encoded = route
      .request()
      .url()
      .match(/\/_serverFn\/([^?/]+)/)?.[1];
    let name = "";
    try {
      name = JSON.parse(Buffer.from(encoded ?? "", "base64url").toString()).export ?? "";
    } catch {
      /* other request */
    }
    if (name.includes("lookupWord")) {
      calls++;
      await route.fulfill({ status: 503, body: "Unexpected dictionary call" });
    } else await route.continue();
  });
  test.setTimeout(45000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const welcome = page.getByRole("dialog", { name: "Choose your learning language" });
  await welcome.waitFor({ timeout: 5000 }).catch(() => {});
  if (await welcome.isVisible()) {
    await welcome.getByRole("button", { name: /^\s*Spanish/ }).click();
    await page.getByRole("button", { name: "Start reading", exact: true }).click();
  }
  await page.getByRole("button", { name: "tren", exact: true }).first().click();
  const practice = page.getByRole("region", { name: "Practice this word" });
  await expect(practice).toBeVisible();
  await expect(practice.getByRole("link").first()).toHaveAttribute("href", /lesson=/);
  expect(calls).toBe(0);
});
