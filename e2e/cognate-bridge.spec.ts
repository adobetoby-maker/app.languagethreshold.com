import { expect, test, type Page } from "@playwright/test";
import { appUrl, seedAppState } from "./app-state.ts";

// The Cognate Bridge must follow the language being learned (it used to show
// only Italian) and offer working patterns for every language.

const LANGUAGES = [
  "Spanish",
  "English",
  "French",
  "Italian",
  "German",
  "Portuguese",
  "Japanese",
  "Chinese",
  "Korean",
  "Pashto",
] as const;

async function openCognates(page: Page, language: string, native = "English") {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "billete", exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  const heading = page.getByText(`Words you already know, in ${language}`);
  // On a cold dev server the app can finish loading after the seed is written and
  // drop it, so seed again (up to three times) until the screen shows.
  for (let attempt = 0; attempt < 3; attempt++) {
    await seedAppState(page, {
      selectedLanguage: language,
      nativeLanguage: native,
      currentTab: "cognates",
    });
    await page.goto(appUrl({ tab: "cognates", target: language, native }));
    if (await heading.isVisible({ timeout: 20_000 }).catch(() => false)) return;
  }
  await expect(heading).toBeVisible();
}

for (const language of LANGUAGES) {
  test(`cognate bridge shows patterns for ${language}`, async ({ page }) => {
    // English learners need a non-English native language to bridge from.
    await openCognates(page, language, language === "English" ? "Spanish" : "English");
    await expect(page.getByText(/\d+ sound-shift patterns/)).toBeVisible();
    await expect(page.getByText(/No cognate patterns for/)).toHaveCount(0);
    // Each rule card ends with an example line that starts with "e.g.".
    await expect(page.getByText(/^e\.g\./).first()).toBeVisible();
  });
}

test("Spanish bridge: English patterns first, other sources selectable", async ({ page }) => {
  await openCognates(page, "Spanish");
  await expect(page.getByText(/-tion/).first()).toBeVisible();
  await expect(page.getByText(/-ción/).first()).toBeVisible();
  for (const source of ["English", "French", "Portuguese", "Italian"]) {
    await expect(page.getByRole("button", { name: source, exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Portuguese", exact: true }).click();
  await expect(page.getByText(/-ção/).first()).toBeVisible();
  // Open a rule and check the example words.
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByText("Nouns of action / result").first().click();
  await expect(page.getByText("información").first()).toBeVisible();
});

test("the bridge starts from the learner's native language when available", async ({ page }) => {
  await openCognates(page, "Spanish", "French");
  await expect(page.getByRole("button", { name: "French", exact: true })).toHaveClass(
    /bg-gold\/15/,
  );
});
