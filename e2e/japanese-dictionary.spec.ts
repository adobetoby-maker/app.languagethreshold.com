import { expect, test } from "@playwright/test";
import { appUrl, seedAppState } from "./app-state.ts";

test("Japanese 101 glossary searches exact authored words and opens the Japanese lesson", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  for (let attempt = 0; attempt < 3; attempt++) {
    await seedAppState(page, {
      activeModuleId: "foundation-japanese-basics",
      selectedLanguage: "Japanese",
      nativeLanguage: "English",
      currentTab: "dictionary",
    });
    await page.goto(appUrl({
      tab: "dictionary",
      module: "foundation-japanese-basics",
      target: "Japanese",
      native: "English",
    }));
    const search = page.getByPlaceholder("Search Japanese or English…");
    await search.waitFor({ timeout: attempt < 2 ? 10_000 : 40_000 }).catch(() => undefined);
    if (await search.isVisible()) break;
  }
  const search = page.getByPlaceholder("Search Japanese or English…");
  await expect(search).toBeVisible();
  await search.fill("こんにちは");
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "こんにちは" }) });
  await expect(card).toBeVisible();
  await expect(card.getByText("hello", { exact: true })).toBeVisible();
  await expect(card.getByRole("link", { name: "Open source lesson" })).toHaveAttribute(
    "href",
    /module=foundation-japanese-basics.*target=Japanese.*native=English.*lesson=1/,
  );
  await expect(page.getByText(/draft wording/i)).toBeVisible();
});
