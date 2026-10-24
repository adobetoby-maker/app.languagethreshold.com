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
export function MicrophoneTestDialog({ disabled = false }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState(
    "Tap Test microphone and allow access when your browser asks.",
  );
  const [running, setRunning] = useState(false);
  const [pending, setPending] = useState(false);
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState(false);
  const [recognitionAvailable, setRecognitionAvailable] = useState(false);
  const epoch = useRef(0);
  const resources = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    epoch.current += 1;
    resources.current?.();
    resources.current = null;
    setPending(false);
    setRunning(false);
    setLevel(0);
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
      const inputs = navigator.mediaDevices.enumerateDevices
        ? (await navigator.mediaDevices.enumerateDevices()).filter(
            (device) => device.kind === "audioinput",
          )
        : [];
      if (!current()) return;
      setDevices(inputs);
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

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        stop();
        setOpen(value);
        setHeard(false);
        setStatus("Tap Test microphone and allow access when your browser asks.");
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="mt-3 min-h-11 rounded-full border border-gold/40 px-4 py-2 text-sm text-gold disabled:opacity-40"
        >
          Test microphone
        </button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] rounded-2xl">
        <DialogTitle>Test your microphone</DialogTitle>
        <DialogDescription>
          Speak normally to check your audio input. This test stays on your device; it does not
          record, save, or send audio.
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
        <p className="text-xs text-muted-foreground">
          Only inputs exposed by your browser can appear here. This choice applies to the test.
          Speaking practice uses the browser’s speech recognition input; change its default
          microphone in your browser or device settings.
        </p>
        <p className="text-sm">
          {recognitionAvailable
            ? "Browser speech recognition is available. If sound is detected but no transcript returns, check your connection and speech recognition permission, then retry. You can also use keyboard dictation or type your answer."
            : "Browser speech recognition is unavailable here. Use keyboard dictation or type your answer, or try opening the website directly in Safari or Chrome."}
        </p>
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
      </DialogContent>
    </Dialog>
  );
}
