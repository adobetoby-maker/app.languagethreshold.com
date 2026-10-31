import { expect, test, type Page } from "@playwright/test";
import { appUrl } from "./app-state";

// Synthetic account and provider responses only: no real microphone, AI or account writes.
export async function prepare(page: Page, mission: boolean, theme: string, recordedAudio = false) {
  const id = "00000000-0000-4000-8000-00000000c044";
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const user = {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: "speaking-fixture@example.test",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const session = {
    access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: id, aud: "authenticated", role: "authenticated", exp })}.fixture`,
    refresh_token: "speaking-fixture",
    token_type: "bearer",
    expires_at: exp,
    expires_in: 86400,
    user,
  };
  await page.route("https://*.supabase.co/**", (route) =>
    route.fulfill({ json: route.request().url().includes("/auth/v1/user") ? user : [] }),
  );
  await page.route("**/api/speaking-consent", (route) =>
    route.fulfill({ json: { attested: true } }),
  );
  await page.route("**/api/mission-tts**", (route) =>
    route.fulfill({
      json: { ready: false, voices: [], supportedLanguages: [], speakingRates: [1] },
    }),
  );
  await page.route("**/api/tts**", (route) =>
    route.fulfill({ status: 503, json: { error: "No audio provider in fixture" } }),
  );
  await page.addInitScript(
    ({ id, session, mission, theme, recordedAudio }) => {
      if (!recordedAudio)
        Object.defineProperty(window, "MediaRecorder", { value: undefined, configurable: true });
      localStorage.setItem("sb-pollhlkgltdkdskdzsgd-auth-token", JSON.stringify(session));
      localStorage.setItem("lt.languageChosen", "1");
      localStorage.setItem(
        "lt.profile-device.v1.user." + id,
        JSON.stringify({
          schema: 1,
          userId: id,
          data: {
            selectedLanguage: "Spanish",
            nativeLanguage: "English",
            currentTab: "speak",
            activeModuleId: "roofing",
            onboardingComplete: true,
          },
        }),
      );
      localStorage.setItem(
        "lt.learner-device.v1.speech.user." + id,
        JSON.stringify({
          schema: 1,
          actor: id,
          kind: "speech",
          data: {
            standardVoicesByLang: {
              Spanish: {
                speakingAudioSource: "text",
                listeningGender: "woman",
                speakingGender: "woman",
              },
            },
          },
        }),
      );
      if (mission)
        sessionStorage.setItem(
          "lt.speaking.open-mission",
          "scenario_version_construction_safety_briefing_es_v1",
        );
      const recognitions: object[] = [];
      let behavior = "normal";
      class Recognition {
        onstart: (() => void) | null = null;
        onresult: ((e: unknown) => void) | null = null;
        onend: (() => void) | null = null;
        onerror: ((e: unknown) => void) | null = null;
        start() {
          recognitions.push(this);
          if (behavior === "sync-error") this.onerror?.({ error: "audio-capture" });
          else if (behavior === "normal") this.onstart?.();
        }
        stop() {}
        abort() {
          this.onend?.();
        }
      }
      Object.assign(window, {
        SpeechRecognition: Recognition,
        speakingFixture: {
          setBehavior(value: string) {
            behavior = value;
          },
          captureStarts() {
            return recognitions.length;
          },
          emit(text: string) {
            const rec = recognitions.at(-1) as Recognition;
            rec.onresult?.({
              resultIndex: 0,
              results: [{ isFinal: true, 0: { transcript: text } }],
            });
          },
        },
      });
      const synth = window.speechSynthesis;
      if (synth) {
        synth.getVoices = () =>
          [
            {
              name: "Fixture Spanish",
              lang: "es-ES",
              voiceURI: "fixture:spanish",
              localService: true,
              default: true,
            },
          ] as SpeechSynthesisVoice[];
        synth.speak = (utterance) =>
          queueMicrotask(() => utterance.onend?.(new Event("end") as SpeechSynthesisEvent));
      }
    },
    { id, session, mission, theme, recordedAudio },
  );
  const requests: Array<{ mode: string; messages?: Array<{ role: string; content: string }> }> = [];
  await page.route("**/api/speak", (route) => {
    const body = route.request().postDataJSON();
    if (body.mode === "tip") return route.fulfill({ json: { tip: null } });
    requests.push(body);
    const assistantText = `Respuesta ${requests.length}: Gracias por tu respuesta. ¿Qué harías después para ayudar al equipo? Podemos seguir hablando de tu día y del trabajo.`;
    if (body.mode === "mission")
      return route.fulfill({
        json: {
          assistantText,
          deferredFeedback: ["Una respuesta clara."],
          provisionalObjectiveIds: [],
          shouldEnd: false,
        },
      });
    return route.fulfill({
      contentType: "text/event-stream",
      body: `data: ${JSON.stringify({ choices: [{ delta: { content: assistantText } }] })}\n\ndata: [DONE]\n\n`,
    });
  });
  await page.goto(appUrl({ tab: "speak", module: "roofing" }));
  if (mission) {
    const steps = page.getByRole("tablist", { name: "Speaking practice steps" });
    await steps.getByRole("tab", { name: "Conversation", exact: true }).click();
    await page.getByRole("button", { name: "Start mission", exact: true }).click();
  } else await page.getByRole("tab", { name: "Free conversation", exact: true }).click();
  await page.evaluate(
    (theme) => document.documentElement.classList.toggle("dark", theme === "dark"),
    theme,
  );
  return requests;
}

for (const mission of [false, true])
  for (const theme of ["light", "dark"]) {
    test(`${mission ? "mission" : "free conversation"} ${theme}: twelve spoken exchanges, readable replies, and reset without refresh`, async ({
      page,
    }, info) => {
      const requests = await prepare(page, mission, theme);
      const celebration = page.getByRole("button", {
        name: "Close level celebration",
        exact: true,
      });
      await page.addLocatorHandler(celebration, () => celebration.click());
      const frame = mission
        ? page.getByTestId("focused-speaking-frame")
        : page.getByRole("region", { name: "Free conversation practice" });
      const transcript = frame.getByRole("region", {
        name: mission ? "Conversation" : "Conversation replies",
        exact: true,
      });
      const mic = frame.getByRole("button", { name: "Start listening", exact: true });
      await expect(mic).toBeEnabled();
      await expect(frame.getByLabel("Reply audio", { exact: true })).toHaveValue("manual");
      for (let round = 1; round <= 12; round++) {
        await mic.click();
        await expect(
          frame.getByText("Microphone started — waiting for words…", { exact: true }),
        ).toBeVisible();
        await page.evaluate(
          (text) =>
            (
              window as unknown as { speakingFixture: { emit(text: string): void } }
            ).speakingFixture.emit(text),
          `Hola, respuesta ${round}`,
        );
        await expect(
          frame.getByText("Words received — tap Stop to review", { exact: true }),
        ).toBeVisible();
        await frame.getByRole("button", { name: "Stop listening", exact: true }).click();
        await expect(frame.getByRole("textbox")).toHaveValue(`Hola, respuesta ${round}`);
        expect(requests.length).toBe(round - 1);
        await frame
          .getByRole("button", { name: mission ? "Send typed answer" : "Send answer", exact: true })
          .click();
        await expect(transcript.getByText(`Respuesta ${round}:`, { exact: false })).toBeVisible();
        await expect(mic).toBeEnabled();
        expect(requests.length).toBe(round);
      }
      const box = await transcript.boundingBox();
      expect(box!.height).toBeGreaterThan(info.project.name === "desktop" ? 300 : 180);
      const last = transcript.getByText("Respuesta 12:", { exact: false });
      await expect(last).toBeInViewport();
      const nav = page.locator(".lt-bottom-nav");
      if (await nav.isVisible()) {
        const n = await nav.boundingBox();
        const f = await frame.boundingBox();
        expect(f!.y + f!.height).toBeLessThanOrEqual(n!.y + 2);
      }
      await page.screenshot({
        path: `test-results/speaking-${mission ? "mission" : "free"}-${theme}-${info.project.name}.png`,
      });
      await page.getByRole("button", { name: "Reset", exact: true }).click();
      await expect(transcript.getByText("Respuesta 12:", { exact: false })).toHaveCount(0);
      await mic.click();
      await page.evaluate(() =>
        (
          window as unknown as { speakingFixture: { emit(text: string): void } }
        ).speakingFixture.emit("Nueva conversación"),
      );
      await frame.getByRole("button", { name: "Stop listening", exact: true }).click();
      await frame
        .getByRole("button", { name: mission ? "Send typed answer" : "Send answer", exact: true })
        .click();
      await expect(transcript.getByText("Respuesta 13:", { exact: false })).toBeVisible();
      expect(requests.at(-1)!.messages!.length).toBe(mission ? 2 : 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }

for (const mission of [false, true]) {
  test(`${mission ? "mission" : "free conversation"}: microphone failure, silent bridge and retry never show false Listening`, async ({
    page,
  }) => {
    await page.clock.install();
    const requests = await prepare(page, mission, "dark");
    const frame = mission
      ? page.getByTestId("focused-speaking-frame")
      : page.getByRole("region", { name: "Free conversation practice" });
    const setBehavior = (value: string) =>
      page.evaluate(
        (value) =>
          (
            window as unknown as { speakingFixture: { setBehavior(value: string): void } }
          ).speakingFixture.setBehavior(value),
        value,
      );
    const resume = async () => {
      if (mission) await frame.getByRole("button", { name: "Resume mission", exact: true }).click();
    };
    await setBehavior("sync-error");
    await frame.getByRole("button", { name: "Start listening", exact: true }).click();
    await expect(frame.getByRole("alert")).toContainText("could not access a microphone");
    await expect(frame.getByRole("button", { name: "Stop listening", exact: true })).toHaveCount(0);
    await expect(frame.getByRole("textbox")).toBeEnabled();
    await resume();
    await setBehavior("silent");
    await frame.getByRole("button", { name: "Start listening", exact: true }).click();
    await expect(
      frame.getByRole("button", { name: "Cancel microphone", exact: true }),
    ).toBeVisible();
    await expect(frame.getByRole("alert")).toHaveCount(0);
    await page.clock.fastForward(12001);
    await expect(frame.getByRole("alert")).toContainText("microphone did not start");
    await expect(frame.getByRole("button", { name: "Stop listening", exact: true })).toHaveCount(0);
    await resume();
    await setBehavior("normal");
    await frame.getByRole("button", { name: "Start listening", exact: true }).click();
    await page.evaluate(() =>
      (window as unknown as { speakingFixture: { emit(text: string): void } }).speakingFixture.emit(
        "Conservar estas palabras",
      ),
    );
    await page.clock.fastForward(15001);
    await expect(frame.getByRole("alert")).toContainText("No new speech came through");
    await expect(frame.getByRole("textbox")).toHaveValue("Conservar estas palabras");
    expect(requests).toHaveLength(0);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await frame.getByRole("button", { name: "Start listening", exact: true }).click();
    await page.evaluate(() =>
      (window as unknown as { speakingFixture: { emit(text: string): void } }).speakingFixture.emit(
        "Ahora sí funciona",
      ),
    );
    await frame.getByRole("button", { name: "Stop listening", exact: true }).click();
    await page.clock.fastForward(1300);
    await frame
      .getByRole("button", { name: mission ? "Send typed answer" : "Send answer", exact: true })
      .click();
    await expect(frame.getByText("Respuesta 1:", { exact: false })).toBeVisible();
    expect(requests).toHaveLength(1);
  });
}

test("a cancelled free-conversation microphone does not block the scenario microphone", async ({
  page,
}) => {
  const requests = await prepare(page, false, "dark");
  await page.evaluate(() =>
    (
      window as unknown as { speakingFixture: { setBehavior(value: string): void } }
    ).speakingFixture.setBehavior("silent"),
  );
  await page.getByRole("button", { name: "Start listening", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cancel microphone", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Scenario missions", exact: true }).click();
  await page.getByRole("button", { name: "Start practice", exact: true }).click();
  await page
    .getByRole("tablist", { name: "Speaking practice steps" })
    .getByRole("tab", { name: "Conversation", exact: true })
    .click();
  await page.getByRole("button", { name: "Start mission", exact: true }).click();
  await page.evaluate(() =>
    (
      window as unknown as { speakingFixture: { setBehavior(value: string): void } }
    ).speakingFixture.setBehavior("normal"),
  );
  await page.getByRole("button", { name: "Start listening", exact: true }).click();
  await page.evaluate(() =>
    (window as unknown as { speakingFixture: { emit(text: string): void } }).speakingFixture.emit(
      "Hola desde la misión",
    ),
  );
  await page.getByRole("button", { name: "Stop listening", exact: true }).click();
  await page.getByRole("button", { name: "Send typed answer", exact: true }).click();
  await expect(page.getByText("Respuesta 1:", { exact: false })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0].mode).toBe("mission");
});

for (const mission of [false, true]) {
  test(`${mission ? "mission" : "free conversation"}: silent sixth recording recovers once after five replies`, async ({
    page,
  }) => {
    await page.clock.install();
    const requests = await prepare(page, mission, "dark");
    const frame = mission
      ? page.getByTestId("focused-speaking-frame")
      : page.getByRole("region", { name: "Free conversation practice" });
    const mic = frame.getByRole("button", { name: "Start listening", exact: true });
    const capture = async (text: string) => {
      await page.evaluate(
        (text) =>
          (
            window as unknown as { speakingFixture: { emit(text: string): void } }
          ).speakingFixture.emit(text),
        text,
      );
      await frame.getByRole("button", { name: "Stop listening", exact: true }).click();
      await page.clock.fastForward(1300);
      await expect(frame.getByRole("textbox")).toHaveValue(text);
      await frame
        .getByRole("button", { name: mission ? "Send typed answer" : "Send answer", exact: true })
        .click();
    };
    for (let turn = 1; turn <= 5; turn++) {
      await mic.click();
      await capture(`Turno ${turn}`);
      await expect(frame.getByText(`Respuesta ${turn}:`, { exact: false })).toBeVisible();
    }
    await mic.click();
    await expect(
      frame.getByText("Microphone started — waiting for words…", { exact: true }),
    ).toBeVisible();
    await page.clock.fastForward(8001);
    await expect
      .poll(() =>
        page.evaluate(() =>
          (
            window as unknown as { speakingFixture: { captureStarts(): number } }
          ).speakingFixture.captureStarts(),
        ),
      )
      .toBe(7);
    expect(requests).toHaveLength(5);
    await capture("Ahora vuelve a escuchar");
    await expect(frame.getByText("Respuesta 6:", { exact: false })).toBeVisible();
    expect(requests).toHaveLength(6);
  });
}

for (const mission of [false, true]) {
  test(`recorded audio ${mission ? "mission" : "free"}: eight actual recorder cycles and reset`, async ({
    page,
  }) => {
    test.skip(
      process.env.E2E_RECORDED_AUDIO !== "1",
      "Use playwright.recording.config.ts for synthetic microphone input",
    );
    let uploads = 0;
    let failTranscription = false;
    await page.route("**/api/speaking-transcribe", async (route) => {
      if (route.request().method() === "GET")
        return route.fulfill({ json: { available: true, provider: "ElevenLabs", maxSeconds: 40 } });
      const body = route.request().postDataJSON();
      expect(body.audioConsent).toBe("recorded-reply-v1");
      const bytes = Buffer.from(body.audio, "base64");
      expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
      expect(bytes.length).toBeGreaterThan(3244);
      expect(bytes.subarray(44).some((value) => value !== 0)).toBe(true);
      uploads++;
      if (failTranscription)
        return route.fulfill({
          status: 502,
          json: { error: "Synthetic transcription failure. Retry your captured clip." },
        });
      return route.fulfill({ json: { text: `Hola, esta es mi respuesta grabada ${uploads}.` } });
    });
    const requests = await prepare(page, mission, "dark", true);
    const initial = requests.length;
    for (let turn = 1; turn <= 8; turn++) {
      await page.getByRole("button", { name: "Record reply", exact: true }).click();
      const allow = page.getByRole("button", { name: /Allow/ });
      if (await allow.isVisible()) await allow.click();
      await expect(page.getByRole("button", { name: "Stop recording", exact: true })).toBeVisible();
      await expect(
        page.getByText("Sound detected · tap Stop when finished", { exact: true }),
      ).toBeVisible();
      // Let the real MediaRecorder collect one timeslice from synthetic microphone input.
      await page.waitForTimeout(1100);
      await page.getByRole("button", { name: "Stop recording", exact: true }).click();
      const input = page.getByRole("textbox", { name: /Type (an|your) answer in Spanish/ });
      await expect(input).toHaveValue(`Hola, esta es mi respuesta grabada ${turn}.`);
      await expect(page.getByRole("button", { name: "Play recording", exact: true })).toBeVisible();
      console.log(
        `Recording cycle ${turn} captured actual WAV audio (${mission ? "mission" : "free"})`,
      );
      expect(requests.length).toBe(initial + turn - 1);
      await page.getByRole("button", { name: /^Send/ }).click();
      await expect.poll(() => requests.length).toBe(initial + turn);
      await expect(page.getByRole("button", { name: "Record reply", exact: true })).toBeEnabled();
    }
    console.log(`Eight recording turns completed (${mission ? "mission" : "free"})`);
    expect(uploads).toBe(8);
    failTranscription = true;
    await page.getByRole("button", { name: "Record reply", exact: true }).click();
    await expect(
      page.getByText("Sound detected · tap Stop when finished", { exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(1100);
    await page.getByRole("button", { name: "Stop recording", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Retry transcription", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Play recording", exact: true })).toBeVisible();
    failTranscription = false;
    await page.getByRole("button", { name: "Retry transcription", exact: true }).click();
    await expect(page.getByRole("textbox", { name: /Type (an|your) answer in Spanish/ })).toHaveValue(
      "Hola, esta es mi respuesta grabada 10.",
    );
    expect(requests.length).toBe(initial + 8);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByRole("button", { name: "Play recording", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Record reply", exact: true })).toBeEnabled();
  });
}
