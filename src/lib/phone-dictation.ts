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

/** One native session per tap. Late results and cleanup can only affect that tap. */
export class NativePhoneRecognition implements SpeechRecognitionLike {
  lang = "";
  continuous = false;
  interimResults = true;
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
    this.started = true;
    void this.connect();
  }
  private async connect() {
    try {
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
          this.removeListener();
          this.onend?.();
        }
      });
      if (this.ended) {
        await listener.remove();
        return;
      }
      this.listener = listener;
      await PhoneDictation.start({ requestId: this.requestId, locale: this.lang });
      if (this.ended) return;
      if (this.stopping) await PhoneDictation.stop({ requestId: this.requestId });
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
    void PhoneDictation.cancel({ requestId: this.requestId }).catch(() => {});
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
    void PhoneDictation.cancel({ requestId: this.requestId }).catch(() => {});
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
