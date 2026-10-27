// Built by TAC — 2026-10-22
import { expect, test, type Page } from "@playwright/test";
import { appUrl, seedAppState } from "./app-state.ts";

// Headless Chrome ships no speech voices and the dev server has no Google key,
// so give the page a fixed device catalog: two Mexican and two Spain voices.
async function stubVoices(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const voice = (name: string, lang: string) => ({
      name,
      lang,
      voiceURI: `test:${name}`,
      localService: true,
      default: false,
    });
    const voices = [
      voice("Paulina", "es-MX"),
      voice("Juan", "es-MX"),
      voice("Mónica", "es-ES"),
      voice("Jorge", "es-ES"),
    ];
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices = () => voices as unknown as SpeechSynthesisVoice[];
      window.speechSynthesis.speak = () => undefined;
    }
  });
  await page.route("**/api/mission-tts?*", (route) =>
    route.fulfill({
      json: {
        provider: "google-cloud-tts",
        ready: false,
        supportedLanguages: [],
        voices: [],
        speakingRates: [1],
      },
    }),
  );
}

async function openReader(page: Page): Promise<void> {
  await page.goto("/");
  const woman = page
    .getByRole("group", { name: "Reader voice", exact: true })
    .getByTestId("voice-switch-woman");
  for (let attempt = 0; attempt < 3; attempt++) {
    await seedAppState(page, {
      selectedLanguage: "Spanish",
      currentTab: "reader",
      onboardingComplete: true,
    });
    await page.evaluate(() => localStorage.setItem("lt.languageChosen", "1"));
    await page.goto(appUrl({ tab: "reader" }));
    await woman.waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 }).catch(() => undefined);
    if (await woman.isVisible()) break;
  }
  await expect(woman).toBeVisible({ timeout: 60_000 });
}

test("Reader woman/man switch changes the top-bar voice and persists across reload", async ({
  page,
  isMobile,
}) => {
  await stubVoices(page);
  await openReader(page);

  const woman = page
    .getByRole("group", { name: "Reader voice", exact: true })
    .getByTestId("voice-switch-woman");
  const man = page
    .getByRole("group", { name: "Reader voice", exact: true })
    .getByTestId("voice-switch-man");
  const topVoice = page.getByTestId("site-voice-button").filter({ visible: true });
  const topLabel = topVoice.getByTestId("site-voice-label");

  await woman.click();
  await expect(woman).toHaveAttribute("aria-pressed", "true");
  await expect(woman).toHaveAttribute("aria-label", "Woman's voice — Paulina, Mexico");
  await expect(man).toHaveAttribute("aria-label", "Man's voice — Juan, Mexico");
  await expect(topLabel).toHaveText(/paulina/i, { useInnerText: true });
  if (!isMobile) {
    await expect(topLabel).toHaveText(/paulina · mexico/i, { useInnerText: true });
    expect((await topLabel.boundingBox())!.width).toBeGreaterThan(50);
  }
  await expect(topVoice).toHaveAttribute(
    "aria-label",
    /^Voice: Paulina, Mexican Spanish, woman\. Change voice(?:\. iPhone device voice quality may vary)?$/,
  );

  if (!isMobile) {
    const headerSwitch = page.locator("header").getByRole("group", { name: "Site voice" });
    await expect(headerSwitch).toBeVisible();
    await headerSwitch.getByTestId("voice-switch-man").click();
  } else {
    await expect(page.locator("header")).not.toBeVisible();
    await man.click();
  }
  await expect(man).toHaveAttribute("aria-pressed", "true");
  await expect(woman).toHaveAttribute("aria-pressed", "false");
  await expect(topLabel).toHaveText(/juan/i, { useInnerText: true });
  await expect(topVoice).toHaveAttribute(
    "aria-label",
    /^Voice: Juan, Mexican Spanish, man\. Change voice(?:\. iPhone device voice quality may vary)?$/,
  );

  await page.reload();
  await expect(man).toHaveAttribute("aria-pressed", "true", { timeout: 60_000 });
  await expect(topLabel).toHaveText(/juan/i, { useInnerText: true });
  await topVoice.click();
  const closeVoice = page.getByRole("menuitem", { name: "Close voice selection", exact: true });
  await expect(closeVoice).toBeVisible();
  await page.getByRole("menu").evaluate((menu) => {
    menu.scrollTop = menu.scrollHeight;
  });
  await expect(closeVoice).toBeInViewport();
  await closeVoice.click();
  await expect(page.getByRole("menu")).not.toBeVisible();
  await expect(topVoice).toBeFocused();
  await expect(topLabel).toHaveText(/juan/i, { useInnerText: true });
});

test("Back dismisses voice selection without leaving the reader; X removes its history step", async ({
  page,
}) => {
  await stubVoices(page);
  await openReader(page);
  const url = page.url();
  const trigger = page.getByTestId("site-voice-button").filter({ visible: true });
  await trigger.click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("menu")).not.toBeVisible();
  await expect(page).toHaveURL(url);
  await trigger.click();
  await page.getByRole("menuitem", { name: "Close voice selection" }).click();
  await expect(page.getByRole("menu")).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.history.state?.["lt.openOverlays"] ?? []))
    .toEqual([]);
  await expect(page).toHaveURL(url);
});

test("module search always has an X and Back returns to the same reading page", async ({
  page,
  isMobile,
}) => {
  await stubVoices(page);
  await openReader(page);
  const url = page.url();
  const trigger = isMobile
    ? page.getByTitle("Core (Free)", { exact: true })
    : page.getByTitle("Change module", { exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Select Module" });
  await dialog.getByPlaceholder("Search modules…").fill("roof");
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  await expect(close).toBeInViewport();
  await close.click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(url);
  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.goBack();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(url);
});

test("settings and nested native-language menu close one layer at a time", async ({
  page,
  isMobile,
}) => {
  await stubVoices(page);
  await openReader(page);
  const url = page.url();
  await page
    .getByRole("button", { name: isMobile ? "App settings" : "Learning settings", exact: true })
    .click();
  const panel = page.getByRole("dialog").filter({ visible: true }).last();
  await expect(panel).toBeVisible();
  if (!isMobile) {
    await page.getByTitle(/^Native language:/).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("menu")).not.toBeVisible();
    await expect(panel).toBeVisible();
  }
  await page.goBack();
  await expect(panel).not.toBeVisible();
  await expect(page).toHaveURL(url);
});

test("reader focus and unsaved vocabulary panels have X exits and support Back", async ({
  page,
}) => {
  await stubVoices(page);
  await openReader(page);
  const url = page.url();
  await page.getByTestId("reader-options").locator("summary").click();
  await page.getByTitle("Fullscreen target language only", { exact: true }).click();
  const closeReader = page.getByRole("button", { name: "Close fullscreen reader" });
  await expect(closeReader).toBeInViewport();
  await page.goBack();
  await expect(closeReader).not.toBeVisible();
  await page
    .getByRole("button", { name: "Add a word to My Vocab from this page", exact: true })
    .filter({ visible: true })
    .click();
  const vocab = page.getByRole("dialog", { name: "Add to My Vocab" });
  await expect(vocab.getByRole("button", { name: "Close", exact: true })).toBeVisible();
  await page.goBack();
  await expect(vocab).not.toBeVisible();
  await expect(page).toHaveURL(url);
});

test("margin notes have a visible X and Back dismisses the sheet", async ({ page }) => {
  await stubVoices(page);
  await openReader(page);
  const url = page.url();
  await page.getByRole("button", { name: "Open margin notes", exact: true }).click();
  const notes = page.getByRole("dialog", { name: "Margin Notes" });
  await expect(notes.getByRole("button", { name: "Close", exact: true })).toBeInViewport();
  await page.goBack();
  await expect(notes).not.toBeVisible();
  await expect(page).toHaveURL(url);
});
