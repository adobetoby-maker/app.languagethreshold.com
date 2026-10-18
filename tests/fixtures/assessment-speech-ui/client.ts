export class ExamRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export const fixture = {
  enabled: true,
  denyMicrophone: false,
  failStart: false,
  failNext: true,
  failureMode: "network",
  revision: 0,
  evidenceId: "",
  withdrawn: false,
  acknowledged: false,
  requests: [] as string[],
  tracksStopped: 0,
};
let clip: Blob;
export async function installSpeechFixture() {
  clip = await (await fetch("/silence.webm")).blob();
  class FakeRecorder {
    static isTypeSupported(mime: string) {
      return mime.startsWith("audio/webm");
    }
    state = "inactive";
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: (() => void) | null = null;
    start() {
      if (fixture.failStart) throw new Error("Simulated recorder start failure");
      this.state = "recording";
    }
    stop() {
      if (this.state === "inactive") return;
      this.state = "inactive";
      setTimeout(() => {
        this.ondataavailable?.({ data: clip });
        this.onstop?.();
      }, 0);
    }
  }
  Object.defineProperty(window, "MediaRecorder", { value: FakeRecorder, configurable: true });
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: async () => {
        if (fixture.denyMicrophone) throw new Error("Simulated microphone permission denial");
        return {
          getTracks: () => [
            {
              stop: () => {
                fixture.tracksStopped++;
              },
            },
          ],
        };
      },
    },
    configurable: true,
  });
}
export async function examRequest<T>(value: string | Record<string, unknown>): Promise<T> {
  if (typeof value === "string")
    return {
      enabled: fixture.enabled,
      version: fixture.enabled ? "local-synthetic-policy" : null,
      notice:
        "LOCAL QA NOTICE: simulated consent only. This fixture never enables hosted collection.",
      retentionDays: 30,
    } as T;
  if (value.action === "speech_reviewed") fixture.acknowledged = true;
  if (value.action === "speech_withdraw") fixture.withdrawn = true;
  return { acknowledged: true, withdrawn: true } as T;
}
export async function uploadExamSpeech(metadata: { requestId: string }, blob: Blob) {
  if (!blob.size) throw new Error("Fixture needs synthetic bytes");
  fixture.requests.push(metadata.requestId);
  if (fixture.failNext) {
    fixture.failNext = false;
    if (fixture.failureMode === "expired") throw new ExamRequestError("Speech upload expired", 409);
    if (fixture.failureMode === "accepted") {
      fixture.revision++;
      fixture.evidenceId = "30000000-0000-4000-8000-000000000001";
      throw new ExamRequestError("Simulated lost response after the upload was accepted.", 503);
    }
    throw new ExamRequestError("Simulated connection loss. Keep this page open to retry.", 503);
  }
  fixture.revision++;
  fixture.evidenceId = "30000000-0000-4000-8000-000000000001";
  fixture.withdrawn = false;
  return { attached: true as const, evidenceId: fixture.evidenceId };
}
export async function examAudioRequest() {
  if (fixture.withdrawn) throw new ExamRequestError("Fixture recording withdrawn", 404);
  return { mode: "private_clip" as const, blob: clip };
}
