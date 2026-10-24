import { expect, test, type Page } from "@playwright/test";
type MicTestHarness = {
  calls: unknown[];
  stopped: number;
  closed: number;
  error: string;
  delay: boolean;
  resolve: null | (() => void);
};
declare global {
  interface Window {
    micTestHarness: MicTestHarness;
  }
}
async function open(page: Page) {
  await page.addInitScript(() => {
    const h = {
      calls: [] as unknown[],
      stopped: 0,
      closed: 0,
      error: "",
      delay: false,
      resolve: null as null | (() => void),
    };
    Object.assign(window, { micTestHarness: h });
    const media = new EventTarget();
    Object.assign(media, {
      enumerateDevices: async () => [
        { kind: "audioinput", deviceId: "built-in", label: "Built-in microphone" },
        { kind: "audioinput", deviceId: "headset", label: "Connected headset" },
        { kind: "audiooutput", deviceId: "speaker", label: "Speaker" },
      ],
      getUserMedia: async (constraints: MediaStreamConstraints) => {
        h.calls.push(constraints);
        if (h.error) throw new DOMException("Synthetic permission failure", h.error);
        if (h.delay)
          await new Promise<void>((resolve) => {
            h.resolve = resolve;
          });
        const audio = typeof constraints.audio === "object" ? constraints.audio : {};
        const device = typeof audio.deviceId === "object" ? audio.deviceId.exact : audio.deviceId;
        const track = {
          label: "Test input",
          onended: null,
          stop: () => {
            h.stopped++;
          },
          getSettings: () => ({
            deviceId: device ?? "built-in",
          }),
        };
        return { getTracks: () => [track], getAudioTracks: () => [track] };
      },
    });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: media });
    class Audio {
      state = "running";
      resume() {
        return Promise.resolve();
      }
      close() {
        this.state = "closed";
        h.closed++;
        return Promise.resolve();
      }
      createMediaStreamSource() {
        return { connect() {} };
      }
      createAnalyser() {
        return {
          fftSize: 256,
          getByteTimeDomainData(a: Uint8Array) {
            a.fill(144);
          },
        };
      }
    }
    Object.assign(window, { AudioContext: Audio, SpeechRecognition: class {} });
  });
  await page.route("**/__microphone-test-fixture", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true; await import('/e2e/microphone-test-fixture.tsx');</script></html>`,
    }),
  );
  await page.goto("/__microphone-test-fixture");
  await page.getByRole("button", { name: "Test microphone", exact: true }).click();
  return page.getByRole("dialog");
}
const state = (page: Page) =>
  page.evaluate(() => {
    const h = window.micTestHarness;
    return { calls: h.calls, stopped: h.stopped, closed: h.closed };
  });
test("mic test requests permission only on tap, lists only inputs, meters sound, switches and releases capture", async ({
  page,
}) => {
  const dialog = await open(page);
  expect((await state(page)).calls).toHaveLength(0);
  await dialog.getByRole("button", { name: "Test microphone", exact: true }).click();
  await expect(dialog.getByText(/Sound detected/)).toBeVisible();
  await page.screenshot({ path: `test-results/microphone-dialog-${test.info().project.name}.png` });
  const inputs = dialog.getByRole("combobox", { name: "Microphone to test" });
  expect(await inputs.locator("option").allTextContents()).toEqual([
    "Browser default",
    "Built-in microphone",
    "Connected headset",
  ]);
  await inputs.selectOption("headset");
  expect((await state(page)).stopped).toBe(1);
  await dialog.getByRole("button", { name: "Test microphone", exact: true }).click();
  await expect(dialog.getByText(/Sound detected/)).toBeVisible();
  expect((await state(page)).calls[1]).toEqual({
    audio: { deviceId: { exact: "headset" } },
    video: false,
  });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect((await state(page)).stopped).toBe(2);
  expect((await state(page)).closed).toBe(2);
});
test("denied permission gives actionable recovery and a fresh successful retry", async ({
  page,
}) => {
  const dialog = await open(page);
  await page.evaluate(() => {
    window.micTestHarness.error = "NotAllowedError";
  });
  await dialog.getByRole("button", { name: "Test microphone", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("browser settings");
  await page.evaluate(() => {
    window.micTestHarness.error = "";
  });
  await dialog.getByRole("button", { name: "Test microphone", exact: true }).click();
  await expect(dialog.getByText(/Sound detected/)).toBeVisible();
});
test("closing during permission request stops a late stream without updating a closed dialog", async ({
  page,
}) => {
  const dialog = await open(page);
  await page.evaluate(() => {
    window.micTestHarness.delay = true;
  });
  await dialog.getByRole("button", { name: "Test microphone", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("Waiting");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.evaluate(() => {
    window.micTestHarness.resolve();
  });
  await expect.poll(async () => (await state(page)).stopped).toBe(1);
  await expect(dialog).not.toBeVisible();
});
test("device changes release the old input and ask for a fresh test; dialog fits phone", async ({
  page,
}) => {
  const dialog = await open(page);
  await dialog.getByRole("button", { name: "Test microphone", exact: true }).click();
  await expect(dialog.getByText(/Sound detected/)).toBeVisible();
  await page.evaluate(() => navigator.mediaDevices.dispatchEvent(new Event("devicechange")));
  await expect(dialog.getByRole("status")).toContainText("Audio devices changed");
  expect((await state(page)).stopped).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const bounds = await dialog.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
});

test("test timeout and practice departure both release capture", async ({ page }) => {
  const dialog = await open(page);
  await page.clock.install();
  await dialog.getByRole("button", { name: "Test microphone", exact: true }).click();
  await expect(dialog.getByText(/Sound detected/)).toBeVisible();
  await page.clock.fastForward(20_100);
  await expect(dialog.getByRole("status")).toContainText("20-second test has finished");
  expect((await state(page)).stopped).toBe(1);
  await dialog.getByRole("button", { name: "Test microphone", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("Microphone connected");
  await page
    .locator("button")
    .filter({ hasText: "Change practice account" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(dialog).not.toBeVisible();
  expect((await state(page)).stopped).toBe(2);
});
test("backgrounding stops local capture", async ({ page }) => {
  const dialog = await open(page);
  await dialog.getByRole("button", { name: "Test microphone", exact: true }).click();
  await expect(dialog.getByText(/Sound detected/)).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(dialog.getByRole("status")).toContainText("background");
  expect((await state(page)).stopped).toBe(1);
});
