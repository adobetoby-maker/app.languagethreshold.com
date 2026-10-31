import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};
export type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onstart?: (() => void) | null;
  onrestart?: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
type NativeEvent = {
  requestId: string;
  text?: string;
  final?: boolean;
  error?: string;
  ended?: boolean;
};
interface PhoneDictationPlugin {
  start(options: { requestId: string; locale: string }): Promise<void>;
  stop(options: { requestId: string }): Promise<void>;
  cancel(options: { requestId: string }): Promise<void>;
  addListener(
    name: "dictation",
    listener: (event: NativeEvent) => void,
  ): Promise<PluginListenerHandle>;
}
const PhoneDictation = registerPlugin<PhoneDictationPlugin>("PhoneDictation");

let nativeRelease: Promise<void> = Promise.resolve();
function releaseNative(requestId: string) {
  // Cancel is asynchronous across the Capacitor bridge. A new tap must wait for it.
  // The deadline also prevents a broken bridge from poisoning every later session.
  nativeRelease = nativeRelease.then(async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        PhoneDictation.cancel({ requestId }).catch(() => {}),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, 2000);
        }),
      ]);
    } catch {
      // Cleanup failure must not permanently block later user-initiated attempts.
    } finally {
      clearTimeout(timer);
    }
  });
}

/** One native session per tap. Late results and cleanup can only affect that tap. */
export class NativePhoneRecognition implements SpeechRecognitionLike {
  private static active: NativePhoneRecognition | null = null;
  lang = "";
  continuous = false;
  interimResults = true;
  onstart: SpeechRecognitionLike["onstart"] = null;
  onresult: SpeechRecognitionLike["onresult"] = null;
  onerror: SpeechRecognitionLike["onerror"] = null;
  onend: SpeechRecognitionLike["onend"] = null;
  private requestId = crypto.randomUUID();
  private listener: PluginListenerHandle | null = null;
  private ended = false;
  private started = false;
  private stopping = false;
  start() {
    if (this.started || this.ended) throw new Error("This recording has already started.");
    NativePhoneRecognition.active?.abort();
    NativePhoneRecognition.active = this;
    this.started = true;
    void this.connect();
  }
  private async connect() {
    try {
      await nativeRelease;
      if (this.ended) return;
      const listener = await PhoneDictation.addListener("dictation", (event) => {
        if (this.ended || event.requestId !== this.requestId) return;
        if (event.error) {
          this.fail(event.error);
          return;
        }
        if (event.text)
          this.onresult?.({
            resultIndex: 0,
            results: [{ 0: { transcript: event.text }, isFinal: event.final === true }],
          });
        if (event.ended && !this.ended) {
          this.ended = true;
          if (NativePhoneRecognition.active === this) NativePhoneRecognition.active = null;
          this.removeListener();
          this.onend?.();
        }
      });
      if (this.ended) {
        await listener.remove();
        return;
      }
      this.listener = listener;
      await nativeRelease;
      if (this.ended) return;
      await PhoneDictation.start({ requestId: this.requestId, locale: this.lang });
      if (this.ended) return;
      if (this.stopping) await PhoneDictation.stop({ requestId: this.requestId });
      else this.onstart?.();
    } catch (error) {
      if (!this.ended) this.fail((error as { code?: string })?.code ?? "audio-capture");
    }
  }
  private removeListener() {
    const listener = this.listener;
    this.listener = null;
    if (listener) void listener.remove().catch(() => {});
  }
  private fail(error: string) {
    if (this.ended) return;
    this.ended = true;
    this.removeListener();
    if (NativePhoneRecognition.active === this) NativePhoneRecognition.active = null;
    releaseNative(this.requestId);
    this.onerror?.({
      error: error === "aborted" || error === "no-speech" ? error : `native-${error}`,
    });
  }
  stop() {
    if (this.ended || this.stopping) return;
    this.stopping = true;
    if (this.listener)
      void PhoneDictation.stop({ requestId: this.requestId }).catch(() =>
        this.fail("audio-capture"),
      );
  }
  abort() {
    if (this.ended) return;
    this.ended = true;
    this.removeListener();
    if (NativePhoneRecognition.active === this) NativePhoneRecognition.active = null;
    releaseNative(this.requestId);
  }
}

// One browser service is reused after a normal end, as V3 reuses its recognizer.
// A cancelled/failed service is discarded, and a replacement waits for its end event.
let browserService: SpeechRecognitionLike | null = null;
let browserServiceConstructor: (new () => SpeechRecognitionLike) | null = null;
let browserShutdown: Promise<void> | null = null;
const BROWSER_RELEASE_WAIT_MS = 1200;
export const BROWSER_NO_WORDS_RETRY_MS = 8000;

function releaseBrowserService(
  recording: SpeechRecognitionLike,
  alreadyEnded: boolean,
  discard: boolean,
) {
  recording.onstart = null;
  recording.onresult = null;
  recording.onerror = null;
  recording.onend = null;
  if (discard && browserService === recording) browserService = null;
  if (alreadyEnded) return Promise.resolve();
  let finish!: () => void;
  const shutdown = new Promise<void>((resolve) => {
    finish = resolve;
  });
  browserShutdown = shutdown;
  let settled = false;
  const done = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    recording.onend = null;
    if (browserShutdown === shutdown) browserShutdown = null;
    finish();
  };
  const timer = window.setTimeout(() => {
    if (browserService === recording) browserService = null;
    done();
  }, BROWSER_RELEASE_WAIT_MS);
  recording.onend = done;
  try {
    recording.abort();
  } catch {
    done();
  }
  return shutdown;
}

export class BrowserPhoneRecognition implements SpeechRecognitionLike {
  private static active: BrowserPhoneRecognition | null = null;
  lang = "";
  continuous = false;
  interimResults = true;
  onstart: SpeechRecognitionLike["onstart"] = null;
  onrestart: SpeechRecognitionLike["onrestart"] = null;
  onresult: SpeechRecognitionLike["onresult"] = null;
  onerror: SpeechRecognitionLike["onerror"] = null;
  onend: SpeechRecognitionLike["onend"] = null;
  private recording: SpeechRecognitionLike | null = null;
  private ended = false;
  private started = false;
  private stopRequested = false;
  private hasWords = false;
  private retries = 0;
  private noWordsTimer: number | undefined;

  start() {
    if (this.started || this.ended) throw new Error("This recording has already started.");
    BrowserPhoneRecognition.active?.abort();
    BrowserPhoneRecognition.active = this;
    this.started = true;
    if (browserShutdown) void browserShutdown.then(() => this.begin());
    else this.begin();
  }
  private begin() {
    if (this.ended || BrowserPhoneRecognition.active !== this) return;
    try {
      const Constructor = browserRecognitionConstructor();
      if (!Constructor) throw new Error("Speech recognition is unavailable.");
      if (!browserService || browserServiceConstructor !== Constructor) {
        browserService = new Constructor();
        browserServiceConstructor = Constructor;
      }
      const recording = browserService;
      this.recording = recording;
      recording.lang = this.lang;
      recording.continuous = this.continuous;
      recording.interimResults = this.interimResults;
      const current = () => !this.ended && this.recording === recording;
      recording.onstart = () => {
        if (!current()) return;
        this.onstart?.();
        window.clearTimeout(this.noWordsTimer);
        if (!this.hasWords && !this.stopRequested) {
          this.noWordsTimer = window.setTimeout(
            () => {
              if (!current() || this.hasWords || this.stopRequested) return;
              if (this.retries === 0) this.retry(false);
              else {
                this.onerror?.({ error: "speech-timeout" });
                this.abort();
              }
            },
            this.retries === 0 ? BROWSER_NO_WORDS_RETRY_MS : 15000,
          );
        }
      };
      recording.onresult = (event) => {
        if (!current()) return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i][0].transcript.trim()) this.hasWords = true;
        }
        if (this.hasWords) window.clearTimeout(this.noWordsTimer);
        this.onresult?.(event);
      };
      recording.onerror = (event) => {
        if (!current()) return;
        if (
          event.error === "no-speech" &&
          !this.hasWords &&
          !this.stopRequested &&
          this.retries === 0
        ) {
          this.retry(false);
          return;
        }
        this.onerror?.(event);
      };
      recording.onend = () => {
        if (!current()) return;
        if (!this.hasWords && !this.stopRequested && this.retries === 0) {
          this.retry(true);
          return;
        }
        this.ended = true;
        window.clearTimeout(this.noWordsTimer);
        this.recording = null;
        if (BrowserPhoneRecognition.active === this) BrowserPhoneRecognition.active = null;
        void releaseBrowserService(recording, true, false);
        this.onend?.();
      };
      recording.start();
    } catch {
      this.onerror?.({ error: "audio-capture" });
      this.abort();
    }
  }
  private retry(alreadyEnded: boolean) {
    const recording = this.recording;
    if (this.ended || !recording || this.hasWords || this.stopRequested || this.retries !== 0)
      return;
    this.retries++;
    window.clearTimeout(this.noWordsTimer);
    this.recording = null;
    const released = releaseBrowserService(recording, alreadyEnded, true);
    this.onrestart?.();
    void released.then(() => this.begin());
  }
  stop() {
    if (this.ended) return;
    this.stopRequested = true;
    window.clearTimeout(this.noWordsTimer);
    this.recording?.stop();
  }
  abort() {
    if (this.ended) return;
    this.ended = true;
    window.clearTimeout(this.noWordsTimer);
    if (BrowserPhoneRecognition.active === this) BrowserPhoneRecognition.active = null;
    const recording = this.recording;
    this.recording = null;
    if (recording) void releaseBrowserService(recording, false, true);
  }
}
function browserRecognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const speech = window as typeof window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return speech.SpeechRecognition ?? speech.webkitSpeechRecognition ?? null;
}
export function recognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  if (Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("PhoneDictation"))
    return NativePhoneRecognition;
  return browserRecognitionConstructor() ? BrowserPhoneRecognition : null;
}
