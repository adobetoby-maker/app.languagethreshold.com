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
  await page.getByRole("menu").evaluate((menu) => { menu.scrollTop = menu.scrollHeight; });
  await expect(closeVoice).toBeInViewport();
  await closeVoice.click();
  await expect(page.getByRole("menu")).not.toBeVisible();
  await expect(topVoice).toBeFocused();
  await expect(topLabel).toHaveText(/juan/i, { useInnerText: true });
});
