import { encodeReplyWav } from "./reply-audio";

export function supportsReplyRecording() {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

/** Each tap owns fresh physical input. No audio is persisted or uploaded here. */
export function captureReplyAudio(events: {
  onStarted(): void;
  onFinishing(): void;
  onLevel(level: number | null): void;
  onCaptured(blob: Blob): void;
  onError(message: string): void;
}) {
  let disposed = false,
    stopping = false;
  let stream: MediaStream | null = null,
    recorder: MediaRecorder | null = null;
  let context: AudioContext | null = null;
  let frame = 0,
    stopTimer = 0,
    limit = 0,
    decodeTimer = 0;
  const chunks: Blob[] = [];
  let size = 0;
  const closeInput = () => {
    cancelAnimationFrame(frame);
    window.clearTimeout(limit);
    stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    stream = null;
  };
  const cancel = () => {
    if (disposed) return;
    disposed = true;
    window.clearTimeout(startTimer);
    window.clearTimeout(stopTimer);
    window.clearTimeout(decodeTimer);
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      recorder.onstart = null;
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          /* already stopped */
        }
      }
    }
    closeInput();
    if (context && context.state !== "closed") void context.close().catch(() => {});
    chunks.length = 0;
  };
  const fail = (message: string) => {
    if (!disposed) {
      cancel();
      events.onError(message);
    }
  };
  const startTimer = window.setTimeout(
    () => fail("The microphone did not open. Check its permission and try again."),
    12000,
  );
  const stop = () => {
    if (disposed || stopping || !recorder) return;
    stopping = true;
    events.onFinishing();
    stopTimer = window.setTimeout(
      () => fail("The phone did not finish the recording. Tap Record to try again."),
      5000,
    );
    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch {
      fail("The recording could not finish. Tap Record to try again.");
    }
    closeInput();
  };
  try {
    const Audio =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio || !supportsReplyRecording()) throw new Error("unsupported");
    context = new Audio();
    void context.resume().catch(() => {});
    const decoder = context;
    void navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
      .then((input) => {
        if (disposed) {
          input.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = input;
        const mime = [
          "audio/mp4",
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
        ].find((value) => MediaRecorder.isTypeSupported(value));
        recorder = new MediaRecorder(input, {
          ...(mime ? { mimeType: mime } : {}),
          audioBitsPerSecond: 64000,
        });
        input.getAudioTracks().forEach((track) => {
          track.onended = () => fail("The microphone disconnected. Tap Record to reconnect it.");
        });
        recorder.ondataavailable = (event) => {
          if (disposed || !event.data.size) return;
          size += event.data.size;
          if (size > 2 * 1024 * 1024) {
            fail("The recording was too large. Try a shorter reply.");
            return;
          }
          chunks.push(event.data);
        };
        recorder.onerror = () =>
          fail("The phone could not record audio. Check microphone permission and retry.");
        recorder.onstart = () => {
          if (disposed) return;
          window.clearTimeout(startTimer);
          events.onStarted();
          limit = window.setTimeout(stop, 40000);
          if (decoder.state === "running") {
            const analyser = decoder.createAnalyser();
            analyser.fftSize = 512;
            decoder.createMediaStreamSource(input).connect(analyser);
            const samples = new Uint8Array(analyser.fftSize);
            let last = 0;
            const meter = (time: number) => {
              if (disposed || stopping) return;
              if (time - last >= 100) {
                last = time;
                analyser.getByteTimeDomainData(samples);
                const rms = Math.sqrt(
                  samples.reduce((sum, n) => sum + ((n - 128) / 128) ** 2, 0) / samples.length,
                );
                events.onLevel(Math.min(1, rms * 6));
              }
              frame = requestAnimationFrame(meter);
            };
            frame = requestAnimationFrame(meter);
          } else events.onLevel(null);
        };
        recorder.onstop = () => {
          if (disposed) return;
          if (!stopping) events.onFinishing();
          stopping = true;
          closeInput();
          window.clearTimeout(stopTimer);
          window.clearTimeout(startTimer);
          const blob = new Blob(chunks, { type: recorder?.mimeType || chunks[0]?.type });
          chunks.length = 0;
          if (!blob.size) {
            fail("No audio was captured. Tap Record and try again.");
            return;
          }
          decodeTimer = window.setTimeout(
            () => fail("The recording could not be prepared. Try a shorter reply."),
            10000,
          );
          void blob
            .arrayBuffer()
            .then((data) => decoder.decodeAudioData(data))
            .then((audio) => {
              if (disposed) return;
              const wav = new Blob([encodeReplyWav(audio)], { type: "audio/wav" });
              cancel();
              events.onCaptured(wav);
            })
            .catch(() => fail("The phone could not read this recording. Tap Record to try again."));
        };
        recorder.start(1000);
      })
      .catch(() =>
        fail(
          "Microphone access failed. Allow microphone access for this site and tap Record again.",
        ),
      );
  } catch {
    fail("Audio recording is unavailable here. Use keyboard dictation or browser dictation.");
  }
  return { stop, cancel };
}
