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
  await page.route("**/api/mission-tts**", (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON().voiceName).toContain("-Chirp3-HD-");
      return route.fulfill({ contentType: "audio/mpeg", body: Buffer.from("synthetic HD audio") });
    }
    return route.fulfill({
      json: {
        ready: true,
        voices: [
          {
            name: "es-US-Chirp3-HD-Aoede",
            languageCodes: ["es-US"],
            ssmlGender: "FEMALE",
            tier: "Chirp 3 HD",
          },
        ],
        supportedLanguages: ["Spanish"],
        speakingRates: [1],
      },
    });
  });
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
                speakingAudioSource: recordedAudio ? "device" : "text",
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
      let playbackStarts = 0;
      HTMLMediaElement.prototype.play = function () {
        playbackStarts++;
        queueMicrotask(() => this.onended?.call(this, new Event("ended")));
        return Promise.resolve();
      };
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
          playbackStarts() {
            return playbackStarts;
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
      // Plain fixture voices need a fixture utterance too; the native setter rejects plain objects.
      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        configurable: true,
        value: class {
          text: string;
          constructor(text: string) {
            this.text = text;
          }
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
        synth.speak = (utterance) => {
          playbackStarts++;
          queueMicrotask(() => utterance.onend?.(new Event("end") as SpeechSynthesisEvent));
        };
      }
    },
    { id, session, mission, theme, recordedAudio },
  );
  const requests: Array<{ mode: string; messages?: Array<{ role: string; content: string }> }> = [];
  await page.route("**/api/speak", (route) => {
    const body = route.request().postDataJSON();
    if (body.mode === "tip") return route.fulfill({ json: { tip: "Buena respuesta de prueba." } });
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
