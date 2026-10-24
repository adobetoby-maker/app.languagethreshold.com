import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function captureError(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Microphone access is blocked. Allow microphone access for this website in your browser settings, then test again.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "That microphone is unavailable. Reconnect it or choose another input, then test again.";
  if (name === "NotReadableError")
    return "The microphone is busy or could not start. Close other recording apps and test again.";
  return "The microphone test could not start. Check your browser’s microphone settings and try again.";
}

/** Local audio meter only: no recording, transcription, upload, or saved device IDs. */
export function MicrophoneTestDialog({
  disabled = false,
  triggerLabel = "Test microphone",
}: {
  disabled?: boolean;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState(
    "Tap Test microphone and allow access when your browser asks.",
  );
  const [running, setRunning] = useState(false);
  const [pending, setPending] = useState(false);
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState(false);
  const [recognitionAvailable, setRecognitionAvailable] = useState(false);
  const [speakerStatus, setSpeakerStatus] = useState("");
  const [speakerTesting, setSpeakerTesting] = useState(false);
  const epoch = useRef(0);
  const resources = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    epoch.current += 1;
    resources.current?.();
    resources.current = null;
    setPending(false);
    setRunning(false);
    setLevel(0);
    setSpeakerTesting(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const speech = window as typeof window & {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    setRecognitionAvailable(Boolean(speech.SpeechRecognition ?? speech.webkitSpeechRecognition));
    const pause = () => {
      if (document.visibilityState === "hidden") {
        stop();
        setStatus(
          "Test stopped while the app was in the background. Tap Test microphone to resume.",
        );
      }
    };
    const changed = () => {
      stop();
      setDevices([]);
      setOutputs([]);
      setSelected("");
      setStatus("Audio devices changed. Test again to refresh the available inputs.");
    };
    document.addEventListener("visibilitychange", pause);
    navigator.mediaDevices?.addEventListener?.("devicechange", changed);
    return () => {
      epoch.current += 1;
      resources.current?.();
      resources.current = null;
      document.removeEventListener("visibilitychange", pause);
      navigator.mediaDevices?.removeEventListener?.("devicechange", changed);
    };
  }, [open, stop]);

  const test = async () => {
    stop();
    setHeard(false);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus(
        "Microphone testing requires a secure browser connection. Open this website directly over HTTPS in Safari or Chrome.",
      );
      return;
    }
    const request = epoch.current;
    const current = () => epoch.current === request;
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    let frame = 0;
    let timeout = 0;
    resources.current = () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      stream?.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      if (context && context.state !== "closed") void context.close().catch(() => {});
    };
    setPending(true);
    setStatus("Waiting for microphone permission…");
    try {
      const Audio =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Audio) {
        context = new Audio();
        // Invoke during the tap so iOS can unlock the local meter.
        void context.resume().catch(() => {});
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: selected ? { deviceId: { exact: selected } } : true,
        video: false,
      });
      if (!current()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const available = navigator.mediaDevices.enumerateDevices
        ? await navigator.mediaDevices.enumerateDevices()
        : [];
      const inputs = available.filter((device) => device.kind === "audioinput");
      if (!current()) return;
      setDevices(inputs);
      setOutputs(available.filter((device) => device.kind === "audiooutput"));
      const track = stream.getAudioTracks()[0];
      const deviceId = track?.getSettings?.().deviceId;
      setSelected(deviceId && inputs.some((input) => input.deviceId === deviceId) ? deviceId : "");
      track.onended = () => {
        if (!current()) return;
        stop();
        setStatus(
          "The microphone disconnected or permission was removed. Choose an input and test again.",
        );
      };
      setRunning(true);
      setPending(false);
      setStatus(
        `Microphone connected${track.label ? `: ${track.label}` : ""}. Speak and watch the sound meter.`,
      );
      if (context && context.state === "running") {
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        context.createMediaStreamSource(stream).connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);
        const update = () => {
          if (!current()) return;
          analyser.getByteTimeDomainData(samples);
          const rms = Math.sqrt(
            samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length,
          );
          setLevel(Math.min(100, Math.round(rms * 500)));
          if (rms > 0.015) setHeard(true);
          frame = window.requestAnimationFrame(update);
        };
        update();
      } else {
        setStatus(
          "Microphone connected, but this browser could not start the sound meter. This does not confirm that speech was heard.",
        );
      }
      timeout = window.setTimeout(() => {
        if (!current()) return;
        stop();
        setStatus("The 20-second test has finished. Close this window to retry speaking practice.");
      }, 20_000);
    } catch (error) {
      if (!current()) return;
      stop();
      setStatus(captureError(error));
    }
  };

  const testSpeaker = async () => {
    stop();
    setStatus("Microphone test stopped before playing a sound.");
    const request = epoch.current;
    const current = () => request === epoch.current;
    try {
      const Audio =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) {
        setSpeakerStatus(
          "This browser cannot run the speaker test. Try playing a lesson and check your device’s volume and audio output.",
        );
        return;
      }
      const context = new Audio();
      resources.current = () => {
        if (context.state !== "closed") void context.close().catch(() => {});
      };
      const tone = context.createOscillator();
      const volume = context.createGain();
      tone.frequency.value = 660;
      volume.gain.value = 0.05;
      tone.connect(volume);
      volume.connect(context.destination);
      let started = false;
      let timeout = 0;
      resources.current = () => {
        tone.onended = null;
        window.clearTimeout(timeout);
        if (started) {
          try {
            tone.stop();
          } catch {
            /* Already ended. */
          }
        }
        tone.disconnect();
        volume.disconnect();
        if (context.state !== "closed") void context.close().catch(() => {});
      };
      setSpeakerTesting(true);
      setSpeakerStatus("Playing a short test tone through your browser’s current output…");
      // Start the unlock within the tap. Closing/backgrounding still invalidates it.
      timeout = window.setTimeout(() => {
        if (!current()) return;
        stop();
        setSpeakerStatus(
          "The speaker test timed out. Check your volume and device audio output, then try again.",
        );
      }, 5000);
      await context.resume();
      if (!current()) return;
      tone.onended = () => {
        if (!current()) return;
        stop();
        setSpeakerStatus(
          "Test tone finished. Did you hear it? If not, check your volume and device audio output.",
        );
      };
      tone.start();
      started = true;
      tone.stop(context.currentTime + 0.5);
    } catch {
      if (!current()) return;
      stop();
      setSpeakerStatus(
        "The speaker test could not play. Check your device’s volume and audio output, then try again.",
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        stop();
        setOpen(value);
        setHeard(false);
        setSpeakerStatus("");
        setStatus("Tap Test microphone and allow access when your browser asks.");
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="mt-3 min-h-11 rounded-full border border-gold/40 px-4 py-2 text-sm text-gold disabled:opacity-40"
        >
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] rounded-2xl">
        <DialogTitle>Audio &amp; microphone</DialogTitle>
        <DialogDescription>
          Check your microphone and play a test sound. Audio stays on this device and is not
          recorded or uploaded.
        </DialogDescription>
        <p role="status" className="text-sm">
          {status}
        </p>
        <div
          role="meter"
          aria-label="Microphone sound level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={level}
          className="h-4 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full bg-gold" style={{ width: `${level}%` }} />
        </div>
        {heard && (
          <p className="text-sm text-gold">
            Sound detected. Audio capture works; this does not confirm transcription.
          </p>
        )}
        {devices.length > 0 && (
          <label className="grid gap-2 text-sm">
            Microphone to test
            <select
              aria-label="Microphone to test"
              value={selected}
              onChange={(event) => {
                stop();
                setSelected(event.target.value);
                setHeard(false);
                setStatus("Input selected. Tap Test microphone to check it.");
              }}
              className="min-h-11 w-full rounded-lg border bg-background p-2"
            >
              <option value="">Browser default</option>
              {devices
                .filter((device) => device.deviceId)
                .map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${index + 1}`}
                  </option>
                ))}
            </select>
          </label>
        )}
        <details className="space-y-2 text-xs text-muted-foreground">
          <summary className="min-h-11 cursor-pointer py-3">
            Microphone &amp; transcription help
          </summary>
          <p>
            Only inputs exposed by your browser can appear here. This choice applies to the test.
            Speaking practice uses the browser’s speech recognition input; change its default
            microphone in your browser or device settings.
          </p>
          <p>
            {recognitionAvailable
              ? "Browser speech recognition is available. If sound is detected but no transcript returns, check your connection and speech recognition permission, then retry. You can also use keyboard dictation or type your answer."
              : "Browser speech recognition is unavailable here. Use keyboard dictation or type your answer, or try opening the website directly in Safari or Chrome."}
          </p>
        </details>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void test()}
            disabled={pending}
            className="min-h-11 rounded-full bg-gold px-4 py-2 text-sm text-black disabled:opacity-40"
          >
            {pending ? "Waiting for permission…" : running ? "Restart test" : "Test microphone"}
          </button>
          {(running || pending) && (
            <button
              type="button"
              onClick={() => {
                stop();
                setStatus("Test stopped. Your microphone has been released.");
              }}
              className="min-h-11 rounded-full border px-4 py-2 text-sm"
            >
              Stop test
            </button>
          )}
        </div>
        <section className="space-y-2 border-t border-border pt-4" aria-label="Speaker routing">
          <h3 className="font-semibold">Where replies play</h3>
          <p className="text-sm">
            Output: browser/device default. The website cannot reliably identify which iPhone
            speaker or Bluetooth device is active.
          </p>
          {outputs.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Outputs reported by this browser:{" "}
              {outputs.map((device, index) => device.label || `Output ${index + 1}`).join(", ")}.
              These are available devices, not confirmation of the active route.
            </p>
          )}
          <button
            type="button"
            onClick={() => void testSpeaker()}
            disabled={speakerTesting}
            className="min-h-11 rounded-full border border-gold/40 px-4 py-2 text-sm text-gold disabled:opacity-40"
          >
            {speakerTesting ? "Playing test sound…" : "Play test sound"}
          </button>
          {speakerStatus && (
            <p role="status" className="text-sm">
              {speakerStatus}
            </p>
          )}
          <details className="text-xs text-muted-foreground">
            <summary className="min-h-11 cursor-pointer py-3">Change your audio route</summary>
            <p>
              On iPhone, open Control Center and use the audio output control to choose iPhone or
              your headphones. For the microphone, allow access in this website’s browser settings.
              On a computer, choose the microphone and speakers in your browser or system sound
              settings. Then return here and test again.
            </p>
          </details>
        </section>
      </DialogContent>
    </Dialog>
  );
}
