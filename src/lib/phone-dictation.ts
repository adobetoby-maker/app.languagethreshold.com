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

export function recognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  if (Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("PhoneDictation"))
    return NativePhoneRecognition;
  const speech = window as typeof window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return speech.SpeechRecognition ?? speech.webkitSpeechRecognition ?? null;
}
