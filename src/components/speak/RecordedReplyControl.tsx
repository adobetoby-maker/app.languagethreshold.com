import { useSpeakingAuth } from "@/hooks/use-speaking-auth";
import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { speakingRequestHeaders } from "@/lib/speaking-client";
import { captureReplyAudio } from "@/lib/reply-audio-capture";
import { REPLY_AUDIO_CONSENT } from "@/lib/reply-audio";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Phase = "idle" | "permission" | "recording" | "finishing" | "uploading" | "ready" | "error";
export function RecordedReplyControl({
  scope,
  locale,
  disabled,
  onBegin,
  onTranscript,
  onBusyChange,
}: {
  scope: string;
  locale: string;
  disabled: boolean;
  onBegin(): void;
  onTranscript(text: string): void;
  onBusyChange(busy: boolean): void;
}) {
  const { actor, capture, cancel } = usePracticeLifecycle(scope, useSpeakingAuth());
  const [phase, setPhase] = useState<Phase>("idle");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const consented = useRef(false);
  const [level, setLevel] = useState<number | null>(0),
    [heard, setHeard] = useState(false);
  const [error, setError] = useState<string | null>(null),
    [clipUrl, setClipUrl] = useState<string | null>(null);
  const [bytes, setBytes] = useState(0),
    [playing, setPlaying] = useState(false);
  const take = useRef<Blob | null>(null),
    url = useRef<string | null>(null);
  const recording = useRef<ReturnType<typeof captureReplyAudio> | null>(null);
  const upload = useRef<AbortController | null>(null),
    audio = useRef<HTMLAudioElement | null>(null);
  const busy = ["permission", "recording", "finishing", "uploading"].includes(phase);
  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);
  useEffect(() => {
    const lease = capture(),
      controller = new AbortController();
    const release = lease.own(() => controller.abort());
    const deadline = window.setTimeout(() => {
      controller.abort();
      if (lease.isCurrent()) {
        setAvailable(false);
        setError("Audio transcription could not connect. Reload, or use keyboard dictation.");
      }
    }, 10000);
    void fetch("/api/speaking-transcribe", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = response.ok ? await response.json() : null;
        if (lease.isCurrent() && !controller.signal.aborted) {
          setAvailable(data?.available === true);
          if (!data?.available)
            setError("Audio transcription is unavailable. Use keyboard or browser dictation.");
        }
      })
      .catch(() => {
        if (lease.isCurrent() && !controller.signal.aborted) {
          setAvailable(false);
          setError("Audio transcription could not connect. Reload, or use keyboard dictation.");
        }
      })
      .finally(() => {
        window.clearTimeout(deadline);
        release();
      });
    return () => {
      window.clearTimeout(deadline);
      controller.abort();
      release();
    };
  }, [capture]);
  useEffect(() => {
    const player = audio.current;
    return () => {
      recording.current?.cancel();
      upload.current?.abort();
      player?.pause();
      if (url.current) URL.revokeObjectURL(url.current);
      take.current = null;
      onBusyChange(false);
    };
  }, [onBusyChange]);
  const pause = () => {
    audio.current?.pause();
    setPlaying(false);
  };
  const discard = () => {
    pause();
    take.current = null;
    setBytes(0);
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setClipUrl(null);
  };
  const transcribe = async (blob: Blob) => {
    if (disabled || !consented.current || !actor || !capture().isCurrent()) return;
    const lease = capture(),
      controller = new AbortController();
    upload.current?.abort();
    upload.current = controller;
    const release = lease.own(() => controller.abort());
    let expired = false;
    const timer = window.setTimeout(() => {
      expired = true;
      controller.abort();
    }, 50000);
    let rejectAbort: (() => void) | undefined;
    const current = () =>
      lease.isCurrent() && !controller.signal.aborted && upload.current === controller;
    onBusyChange(true);
    setPhase("uploading");
    setError(null);
    try {
      const run = async () => {
        const data = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        for (let offset = 0; offset < data.length; offset += 16384)
          binary += String.fromCharCode(...data.subarray(offset, offset + 16384));
        const headers = await speakingRequestHeaders(
          { userId: actor, isCurrent: lease.isCurrent },
          controller.signal,
        );
        if (!current()) throw new DOMException("Cancelled", "AbortError");
        const response = await fetch("/api/speaking-transcribe", {
          method: "POST",
          headers,
          signal: controller.signal,
          cache: "no-store",
          body: JSON.stringify({
            audio: btoa(binary),
            language: locale.split(/[-_]/)[0].toLowerCase(),
            audioConsent: REPLY_AUDIO_CONSENT,
          }),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            typeof result?.error === "string"
              ? result.error
              : "Transcription failed. Your recording is available to retry.",
          );
        if (typeof result.text !== "string" || !result.text.trim())
          throw new Error(
            "No words were returned. Play your recording, then retry or record again.",
          );
        return result.text;
      };
      const text = await Promise.race([
        run(),
        new Promise<never>((_, reject) => {
          rejectAbort = () => reject(new DOMException("Cancelled", "AbortError"));
          controller.signal.addEventListener("abort", rejectAbort, { once: true });
          if (controller.signal.aborted) rejectAbort();
        }),
      ]);
      if (!current()) return;
      onTranscript(text);
      setPhase("ready");
    } catch (cause) {
      if (!lease.isCurrent()) return;
      if (controller.signal.aborted && !expired) return;
      setError(
        expired
          ? "Transcription timed out. Your recording is available to retry."
          : cause instanceof Error
            ? cause.message
            : "Transcription failed. Your recording is available to retry.",
      );
      setPhase("error");
    } finally {
      window.clearTimeout(timer);
      if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
      release();
      if (upload.current === controller) upload.current = null;
    }
  };
  const begin = () => {
    if (disabled || !available || !actor) return;
    if (!consented.current) {
      setConsentOpen(true);
      return;
    }
    cancel();
    recording.current?.cancel();
    upload.current?.abort();
    discard();
    onBegin();
    const lease = capture();
    onBusyChange(true);
    setError(null);
    setLevel(0);
    setHeard(false);
    setPhase("permission");
    let release = () => {};
    const control = captureReplyAudio({
      onStarted: () => {
        if (lease.isCurrent()) setPhase("recording");
      },
      onFinishing: () => {
        if (lease.isCurrent()) setPhase("finishing");
      },
      onLevel: (value) => {
        if (lease.isCurrent()) {
          setLevel(value);
          if (value !== null && value > 0.03) setHeard(true);
        }
      },
      onCaptured: (blob) => {
        release();
        if (!lease.isCurrent()) return;
        take.current = blob;
        setBytes(blob.size);
        url.current = URL.createObjectURL(blob);
        setClipUrl(url.current);
        void transcribe(blob);
      },
      onError: (message) => {
        release();
        if (lease.isCurrent()) {
          setError(message);
          setPhase("error");
        }
      },
    });
    release = lease.own(control.cancel);
    recording.current = control;
  };
  const stop = () => {
    if (phase === "recording") {
      recording.current?.stop();
      return;
    }
    cancel();
    recording.current?.cancel();
    upload.current?.abort();
    setPhase(take.current ? "ready" : "idle");
  };
  return (
    <div className="flex w-full min-w-0 items-center justify-center gap-3">
      <button
        type="button"
        aria-label={
          phase === "recording" ? "Stop recording" : busy ? "Cancel recording" : "Record reply"
        }
        onClick={busy ? stop : begin}
        disabled={disabled || available !== true}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
      >
        {busy ? <Square className="h-6 w-6" fill="currentColor" /> : <Mic className="h-7 w-7" />}
      </button>
      <div className="min-w-0 text-left text-sm">
        <p role="status">
          {phase === "recording"
            ? heard
              ? "Sound detected · tap Stop when finished"
              : "Recording · waiting for sound…"
            : phase === "permission"
              ? "Opening microphone…"
              : phase === "finishing"
                ? "Preparing your recording…"
                : phase === "uploading"
                  ? "Audio captured · transcribing…"
                  : bytes
                    ? `Recorded ${Math.round(bytes / 1024)} KB · review, then Send`
                    : available === null
                      ? "Checking audio transcription…"
                      : "Tap Record to speak"}
        </p>
        {phase === "recording" && level !== null && (
          <div
            role="meter"
            aria-label="Microphone sound level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(level * 100)}
            className="mt-1 h-2 overflow-hidden rounded bg-muted"
          >
            <div style={{ width: `${Math.round(level * 100)}%` }} className="h-full bg-primary" />
          </div>
        )}
        {phase === "recording" && level === null && (
          <p>Sound meter unavailable; Stop to check the recorded clip.</p>
        )}
        {clipUrl && !busy && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                if (playing) pause();
                else {
                  onBegin();
                  void audio.current
                    ?.play()
                    .catch(() => setError("Recording playback could not start. Try again."));
                }
              }}
              className="min-h-11 underline"
            >
              {playing ? "Stop playback" : "Play recording"}
            </button>
            {phase === "error" && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (take.current) void transcribe(take.current);
                }}
                className="min-h-11 underline"
              >
                Retry transcription
              </button>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="mt-1 text-sm text-foreground">
            {error}
          </p>
        )}
      </div>
      <audio
        ref={audio}
        src={clipUrl ?? undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turn your recording into text</DialogTitle>
            <DialogDescription>
              Your recording is sent to ElevenLabs for transcription. This app keeps the clip only
              on this screen, and you review the words before sending them to your partner.
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            className="min-h-11 rounded-xl bg-primary px-4 text-primary-foreground"
            onClick={() => {
              consented.current = true;
              setConsentOpen(false);
              begin();
            }}
          >
            Allow audio transcription
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
