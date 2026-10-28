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
  const ready = page.getByRole("button", { name: "billete", exact: true }).first();
  for (let attempt = 0; attempt < 3; attempt++) {
    await seedAppState(page, {
      selectedLanguage: "Spanish",
      currentTab: "reader",
      onboardingComplete: true,
    });
    await page.evaluate(() => localStorage.setItem("lt.languageChosen", "1"));
    await page.goto(appUrl({ tab: "reader" }));
    await ready.waitFor({ timeout: attempt < 2 ? 15_000 : 60_000 }).catch(() => undefined);
    if (await ready.isVisible()) break;
  }
  await expect(ready).toBeVisible({ timeout: 60_000 });
}

test("voice changes live only in Settings and listening/speaking choices persist independently", async ({
  page,
  isMobile,
}) => {
  await stubVoices(page);
  await openReader(page);
  await expect(page.getByTestId("site-voice-button")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Reader voice", exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: isMobile ? "App settings" : "Learning settings", exact: true })
    .click();
  const settings = page.getByRole("region", { name: "Voice settings", exact: true });
  const listening = settings.getByRole("group", { name: "Listening voice", exact: true });
  const speaking = settings.getByRole("group", { name: "Speaking partner voice", exact: true });
  await expect(listening.getByRole("button", { name: "Female", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await listening.getByRole("button", { name: "Male", exact: true }).click();
  await expect(speaking.getByRole("button", { name: "Female", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(settings.getByRole("status")).toContainText("Sign in");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("lt.learner-device.v1.speech.guest") || "null")?.data
            ?.standardVoicesByLang?.Spanish?.listeningGender,
      ),
    )
    .toBe("man");
  await page.reload();
  await page
    .getByRole("button", { name: isMobile ? "App settings" : "Learning settings", exact: true })
    .click();
  await expect(listening.getByRole("button", { name: "Male", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(speaking.getByRole("button", { name: "Female", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("Back dismisses voice settings without leaving the reader and X cleans up its history", async ({
  page,
  isMobile,
}) => {
  await stubVoices(page);
  await openReader(page);
  const url = page.url();
  const trigger = page.getByRole("button", {
    name: isMobile ? "App settings" : "Learning settings",
    exact: true,
  });
  await trigger.click();
  const panel = page.getByRole("dialog").filter({ visible: true }).last();
  await expect(page.getByTestId("voice-settings")).toBeVisible();
  await page.goBack();
  await expect(panel).not.toBeVisible();
  await expect(page).toHaveURL(url);
  await trigger.click();
  await panel
    .getByRole("button", { name: /^Close( settings)?$/, exact: true })
    .first()
    .click();
  await expect(panel).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.history.state?.["lt.openOverlays"] ?? []))
    .toEqual([]);
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
  const header = await notes.locator("[data-overlay-close]").boundingBox();
  const body = await notes.locator("[data-overlay-scroll-body]").boundingBox();
  expect(body!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1);
  expect(body!.y + body!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
  await page.goBack();
  await expect(notes).not.toBeVisible();
  await expect(page).toHaveURL(url);
});

test("signed-in Google previews use the curated pair and keep listening separate from speaking", async ({
  page,
  isMobile,
}) => {
  const id = "00000000-0000-4000-8000-00000000a055";
  const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const user = {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: "voice-e2e@example.test",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const session = {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: id, aud: "authenticated", role: "authenticated", exp })}.e2e`,
    refresh_token: "voice-fixture",
    token_type: "bearer",
    expires_at: exp,
    expires_in: 86400,
    user,
  };
  await page.addInitScript(
    ({ session, id }) => {
      localStorage.setItem("sb-pollhlkgltdkdskdzsgd-auth-token", JSON.stringify(session));
      localStorage.setItem("lt.languageChosen", "1");
      localStorage.setItem(
        `lt.profile-device.v1.user.${id}`,
        JSON.stringify({
          schema: 1,
          userId: id,
          data: {
            selectedLanguage: "Spanish",
            nativeLanguage: "English",
            currentTab: "reader",
            onboardingComplete: true,
            activeModuleId: null,
          },
        }),
      );
    },
    { session, id },
  );
  await page.route("**/auth/v1/user", (route) => route.fulfill({ json: user }));
  const requests: { voiceName: string }[] = [];
  await page.route("**/api/mission-tts**", async (route) => {
    if (route.request().method() === "POST") {
      requests.push(route.request().postDataJSON() as { voiceName: string });
      await route.fulfill({
        status: 503,
        json: { error: "Synthetic audio; no provider call in browser tests" },
      });
      return;
    }
    await route.fulfill({
      json: {
        provider: "google-cloud-tts",
        ready: true,
        supportedLanguages: ["Spanish"],
        speakingRates: [1],
        voices: [
          {
            name: "es-US-Chirp3-HD-Aoede",
            languageCodes: ["es-US"],
            ssmlGender: "FEMALE",
            naturalSampleRateHertz: 24000,
            label: "Female",
            tier: "Chirp 3 HD",
          },
          {
            name: "es-US-Chirp3-HD-Charon",
            languageCodes: ["es-US"],
            ssmlGender: "MALE",
            naturalSampleRateHertz: 24000,
            label: "Male",
            tier: "Chirp 3 HD",
          },
        ],
      },
    });
  });
  await page.goto(appUrl({ tab: "reader" }));
  await page
    .getByRole("button", { name: isMobile ? "App settings" : "Learning settings", exact: true })
    .click();
  const settings = page.getByRole("region", { name: "Voice settings", exact: true });
  await expect(settings.getByRole("status")).toContainText("Google voices are ready");
  const savedListeningVoice = () =>
    page.evaluate(
      (id) =>
        JSON.parse(localStorage.getItem(`lt.learner-device.v1.speech.user.${id}`) || "null")?.data
          ?.voiceByLang?.Spanish ?? "",
      id,
    );
  await expect.poll(savedListeningVoice).toContain("Aoede");
  await settings.getByRole("button", { name: "Test listening voice", exact: true }).click();
  await expect.poll(() => requests.at(-1)?.voiceName).toBe("es-US-Chirp3-HD-Aoede");
  await settings
    .getByRole("group", { name: "Listening voice", exact: true })
    .getByRole("button", { name: "Male", exact: true })
    .click();
  await settings.getByRole("button", { name: "Test listening voice", exact: true }).click();
  await expect.poll(() => requests.at(-1)?.voiceName).toBe("es-US-Chirp3-HD-Charon");
  await expect.poll(savedListeningVoice).toContain("Charon");
  await settings.getByRole("button", { name: "Test speaking voice", exact: true }).click();
  await expect.poll(() => requests.at(-1)?.voiceName).toBe("es-US-Chirp3-HD-Aoede");
  await expect.poll(savedListeningVoice).toContain("Charon");
  await page.goto(appUrl({ tab: "speak" }));
  await expect(page.getByRole("heading", { name: "Your next speaking practice" })).toBeVisible();
  await expect.poll(savedListeningVoice).toContain("Charon");
});

test("Settings scrolls below its close row without covering controls", async ({
  page,
  isMobile,
}) => {
  await stubVoices(page);
  await openReader(page);
  await page
    .getByRole("button", { name: isMobile ? "App settings" : "Learning settings", exact: true })
    .click();
  const panel = page.getByRole("dialog").filter({ visible: true }).last();
  const body = panel.locator("[data-overlay-scroll-body]");
  const close = panel.locator("[data-overlay-close]");
  await expect(body).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (mode) => document.documentElement.classList.toggle("dark", mode === "dark"),
      theme,
    );
    for (const position of [0, 0.5, 1]) {
      await body.evaluate((el, fraction) => {
        el.scrollTop = (el.scrollHeight - el.clientHeight) * fraction;
      }, position);
      const headerBox = await close.boundingBox();
      const bodyBox = await body.boundingBox();
      expect(bodyBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
      expect(bodyBox!.y + bodyBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
      await expect(close.getByRole("button")).toBeInViewport();
    }
  }
  await close.getByRole("button").click();
  await expect(panel).toHaveCount(0);
});

test("word definitions scroll within the card below the X", async ({ page }) => {
  await stubVoices(page);
  await openReader(page);
  await page.getByRole("button", { name: "tren", exact: true }).first().click();
  const card = page.locator(".word-card-pop");
  await expect(card.getByRole("region", { name: "Practice this word" })).toBeVisible();
  const close = card.getByRole("button", { name: "Close", exact: true });
  const body = card.locator("[data-word-card-scroll-body]");
  // Force a long definition so this checks scrolling even on a tall desktop.
  await body.evaluate((el) => {
    const extra = document.createElement("p");
    extra.textContent = "A long study note. ".repeat(300);
    el.append(extra);
    el.scrollTop = el.scrollHeight;
  });
  const closeBox = await close.boundingBox();
  const bodyBox = await body.boundingBox();
  expect(bodyBox!.y).toBeGreaterThanOrEqual(closeBox!.y + closeBox!.height - 1);
  expect(bodyBox!.y + bodyBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
  await expect(close).toBeInViewport();
  await close.click();
  await expect(card).toHaveCount(0);
});
