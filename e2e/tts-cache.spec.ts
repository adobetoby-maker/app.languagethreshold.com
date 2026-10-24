// Built by TAC — 2026-10-23
import { expect, test, type Page, type Route } from "@playwright/test";

// Proves the Google voice cache and sticky retry in a real browser without Google credentials:
// /api/mission-tts is mocked with a 0.4 s silent MP3, and a fake Supabase session in localStorage
// lets the voice path believe a learner is signed in. Runs as a guest app otherwise.
const SILENT_MP3_BASE64 =
  "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYyLjEyLjEwMAAAAAAAAAAAAAAA//NwwAAAAAAAAAAAAEluZm8AAAAPAAAAEgAABGMANTU1NTVBQUFBQUFNTU1NTVlZWVlZWWRkZGRkcXFxcXFxfHx8fHyIiIiIiIiUlJSUlKCgoKCgoKysrKysrLi4uLi4xMTExMTE0NDQ0NDc3Nzc3Nzo6Ojo6PPz8/Pz8///////AAAAAExhdmM2Mi4yOAAAAAAAAAAAAAAAACQDzAAAAAAAAARj7EbZ+QAAAAAAAAAAAAAAAAD/8yDEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVV//MixCcAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVX/8yDETwAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVV//MgxHYAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVf/zIMSdAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVX/8yLExAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVf/zIMTYAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVX/8yDE2AAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVV//MgxNgAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVf/zIsTXAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVV//MgxNgAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVf/zIMTYAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVX/8yDE2AAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MixNcAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/8yDE2AAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//MgxNgAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zIMTYAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/8yLE1wAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";

type Counters = { posts: number; bodies: string[]; speechCalls: number };

async function prepare(page: Page, respond: (n: number, route: Route) => Promise<void>) {
  const counters: Counters = { posts: 0, bodies: [], speechCalls: 0 };
  await page.route("**/api/mission-tts", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    counters.posts += 1;
    counters.bodies.push(route.request().postData() ?? "");
    await respond(counters.posts, route);
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle").catch(() => undefined);
  // Audio playback needs a user gesture in Chromium; one click grants sticky activation.
  await page.mouse.click(5, 5);
  await page.evaluate(async () => {
    const { supabase } = await import("/src/integrations/supabase/client.ts");
    const key = (supabase.auth as unknown as { storageKey: string }).storageKey;
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem(
      key,
      JSON.stringify({
        access_token: "e2e-fake-token",
        refresh_token: "e2e-fake-refresh",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: expiresAt,
        user: { id: "e2e-user", aud: "authenticated", app_metadata: {}, user_metadata: {} },
      }),
    );
    const w = window as unknown as { __speechCalls: number };
    w.__speechCalls = 0;
    if (window.speechSynthesis) {
      window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
        w.__speechCalls += 1;
        // A real utterance would never end in headless Chrome; end it so the promise settles.
        queueMicrotask(() => utterance.onend?.(new Event("end") as SpeechSynthesisEvent));
      };
    }
  });
  return counters;
}

/** Plays through the app's real router; resolves with how it ended and the device-speech count. */
function speak(page: Page, text: string) {
  return page.evaluate(async (phrase) => {
    const tts = await import("/src/lib/tts.ts");
    const mission = await import("/src/data/mission-tts.ts");
    const voiceURI = mission.encodeGoogleVoicePreference({
      name: "es-US-Neural2-A",
      languageCodes: ["es-US"],
    });
    const outcome = await new Promise<"ended" | "errored">((resolve) => {
      void tts.speakRemote(phrase, "es-US", {
        voiceURI,
        usage: "learning",
        owner: { userId: "e2e-user", isCurrent: () => true },
        onend: () => resolve("ended"),
        onerror: () => resolve("errored"),
      });
    });
    return { outcome, speechCalls: (window as unknown as { __speechCalls: number }).__speechCalls };
  }, text);
}

const mp3 = (route: Route) =>
  route.fulfill({
    status: 200,
    contentType: "audio/mpeg",
    headers: { "X-TTS-Rendered-Rate": "1", "Cache-Control": "no-store" },
    body: Buffer.from(SILENT_MP3_BASE64, "base64"),
  });

const limited = (route: Route, retryAfter: string) =>
  route.fulfill({
    status: 429,
    contentType: "application/json",
    headers: { "Retry-After": retryAfter, "Cache-Control": "no-store" },
    body: JSON.stringify({ error: "Too many voice requests. Please wait a minute and try again." }),
  });

test("replaying a word plays from the device cache with no request, even after a reload", async ({
  page,
}) => {
  const counters = await prepare(page, (_n, route) => mp3(route));
  const first = await speak(page, "la manzana roja");
  expect(first).toEqual({ outcome: "ended", speechCalls: 0 });
  expect(counters.posts).toBe(1);

  const second = await speak(page, "la manzana roja");
  expect(second).toEqual({ outcome: "ended", speechCalls: 0 });
  expect(counters.posts, "second play of the same word makes no network request").toBe(1);

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const names = (await caches.keys()).filter((name) => name.startsWith("tts-audio-v1-"));
        const counts = await Promise.all(
          names.map(async (name) => (await (await caches.open(name)).keys()).length),
        );
        return { stores: names.length, entries: counts[0] ?? 0 };
      }),
    )
    .toEqual({ stores: 1, entries: 2 }); // one per-user store: one clip plus its index

  await page.reload();
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.mouse.click(5, 5);
  const third = await page.evaluate(async () => {
    const tts = await import("/src/lib/tts.ts");
    const mission = await import("/src/data/mission-tts.ts");
    const voiceURI = mission.encodeGoogleVoicePreference({
      name: "es-US-Neural2-A",
      languageCodes: ["es-US"],
    });
    return new Promise<string>((resolve) => {
      void tts.speakRemote("la manzana roja", "es-US", {
        voiceURI,
        usage: "learning",
        owner: { userId: "e2e-user", isCurrent: () => true },
        onend: () => resolve("ended"),
        onerror: () => resolve("errored"),
      });
    });
  });
  expect(third).toBe("ended");
  expect(counters.posts, "a reload keeps the stored clip").toBe(1);

  const other = await speak(page, "la naranja dulce");
  expect(other.outcome).toBe("ended");
  expect(counters.posts, "a different word still asks the server").toBe(2);
});

test("a 429 then 200 keeps the Google voice and never touches device speech", async ({ page }) => {
  const counters = await prepare(page, (n, route) => (n === 1 ? limited(route, "1") : mp3(route)));
  const result = await speak(page, "el perro negro");
  expect(result).toEqual({ outcome: "ended", speechCalls: 0 });
  expect(counters.posts).toBe(2);
  expect(counters.bodies[1]).toBe(counters.bodies[0]);
});

test("a wait over 1.5 s shows Loading voice while the retry is pending", async ({ page }) => {
  const counters = await prepare(page, (n, route) => (n === 1 ? limited(route, "3") : mp3(route)));
  const playing = speak(page, "el gato blanco");
  await expect(page.getByText("Loading voice…")).toBeVisible({ timeout: 5000 });
  const result = await playing;
  expect(result).toEqual({ outcome: "ended", speechCalls: 0 });
  expect(counters.posts).toBe(2);
});

test("two 429s in a row fall back to the device voice exactly once", async ({ page }) => {
  const counters = await prepare(page, (_n, route) => limited(route, "0"));
  const result = await speak(page, "la casa grande");
  expect(result.outcome).toBe("ended");
  expect(result.speechCalls).toBe(1);
  expect(counters.posts, "one request plus one retry, no third").toBe(2);
});

test("a server error falls back to the device voice without waiting", async ({ page }) => {
  const counters = await prepare(page, (_n, route) =>
    route.fulfill({ status: 502, json: { error: "Google voice generation failed." } }),
  );
  const result = await speak(page, "la ventana abierta");
  expect(result.speechCalls).toBe(1);
  expect(counters.posts).toBe(1);
});
