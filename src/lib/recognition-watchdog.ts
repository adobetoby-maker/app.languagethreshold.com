import type { SpeechRecognitionLike } from "./phone-dictation";

export const MICROPHONE_START_WAIT_MS = 12_000;
export const MICROPHONE_SILENCE_WAIT_MS = 15_000;

/** Readiness is an event, not a successful call to start(). Silent bridges must release the UI. */
export function watchRecognition(
  recognition: SpeechRecognitionLike,
  current: () => boolean,
  onStarted: () => void,
  onRestarting?: () => void,
) {
  let started = false;
  let disposed = false;
  let timer: number;
  const wait = (milliseconds: number, error: string) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!disposed && current()) recognition.onerror?.({ error });
    }, milliseconds);
  };
  const progress = () => {
    if (disposed || !current()) return;
    if (!started) {
      started = true;
      onStarted();
    }
    wait(MICROPHONE_SILENCE_WAIT_MS, "speech-timeout");
  };
  recognition.onstart = progress;
  recognition.onrestart = () => {
    if (disposed || !current()) return;
    started = false;
    onRestarting?.();
    wait(MICROPHONE_START_WAIT_MS, "start-timeout");
  };
  wait(MICROPHONE_START_WAIT_MS, "start-timeout");
  return {
    progress,
    hasStarted: () => started,
    dispose() {
      disposed = true;
      window.clearTimeout(timer);
      recognition.onstart = null;
      recognition.onrestart = null;
    },
  };
}
