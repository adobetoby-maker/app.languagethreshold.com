import { OFFLINE_LESSON_TRACKS, type OfflineLessonPackId } from "@/lib/offline-lesson-tracks";
import { useEffect, useRef, useState } from "react";
import {
  offlineLessonDownload,
  type LessonDownloadCommand,
  type LessonDownloadStatus,
} from "@/lib/offline-lesson-download";

export function OfflineLessonDownload({ packId }: { packId: OfflineLessonPackId }) {
  const label = OFFLINE_LESSON_TRACKS[packId].label;
  const generation = useRef({ value: 0 });
  const [saved, setSaved] = useState<LessonDownloadStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Checking saved lesson files…");
  useEffect(() => {
    setSaved(null);
    setBusy(false);
    setMessage("Checking saved lesson files…");
    const tracker = generation.current;
    const request = ++tracker.value;
    let sequence = 0;
    const check = () => {
      const currentCheck = ++sequence;
      return offlineLessonDownload("LESSON_PACK_STATUS", packId)
        .then((status) => {
          if (request === tracker.value && currentCheck === sequence) {
            setSaved(status);
            setMessage("");
          }
        })
        .catch(() => {
          if (request === tracker.value && currentCheck === sequence)
            setMessage(
              "Connect and reload once before downloading. Saved files can be checked below.",
            );
        });
    };
    check();
    navigator.serviceWorker?.addEventListener("controllerchange", check);
    return () => {
      tracker.value++;
      navigator.serviceWorker?.removeEventListener("controllerchange", check);
    };
  }, [packId]);
  async function run(command: LessonDownloadCommand) {
    const tracker = generation.current;
    const request = ++tracker.value;
    setBusy(true);
    setMessage(
      command === "LESSON_PACK_INSTALL"
        ? "Downloading and checking every lesson file. Keep this page open…"
        : "Checking saved files…",
    );
    try {
      const status = await offlineLessonDownload(command, packId);
      if (request !== tracker.value) return;
      setSaved(status);
      setMessage(
        status.ready
          ? "All required lesson and app files are saved on this browser."
          : "No complete download was found on this browser.",
      );
    } catch (error) {
      if (request !== tracker.value) return;
      setSaved(null);
      setMessage(
        error instanceof Error ? error.message : "Download could not finish. Check saved status.",
      );
    } finally {
      if (request === tracker.value) setBusy(false);
    }
  }
  return (
    <details
      className="mt-5 rounded-xl border border-border/60 bg-card/30 p-4"
      data-testid="offline-lesson-download"
    >
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">
        {label} lessons for offline practice
      </summary>
      <p className="mt-2 text-sm">
        {saved?.ready
          ? "30 lesson texts and the app files are saved on this browser."
          : "Download all 30 Spanish lessons with English instructions before going offline."}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
        <li>
          Reading, cards, matching, answer comparison and handwriting copy-and-compare use local
          content. Tapped words can show exact matches from this lesson’s word list.
        </li>
        <li>
          Listening needs a Spanish voice installed on your device. Audio recordings are not
          included.
        </li>
        <li>
          Speaking prompts can be rehearsed aloud. AI conversation, expanded dictionary details and
          handwriting recognition require a connection.
        </li>
        <li>
          Official exams and cloud sync require a connection. Downloading does not complete lessons
          or award a score.
        </li>
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        This is draft lesson content. Browser storage can be cleared or evicted; check the saved
        files before travel. Keep this same app address and browser. App updates may require a fresh
        download.
      </p>
      {saved?.ready && (
        <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">
          Saved version {saved.version?.slice(0, 12)} · {(saved.bytes / 1024 / 1024).toFixed(1)} MB
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void run("LESSON_PACK_INSTALL")}
          className="min-h-11 rounded-lg border border-gold/40 px-3 text-sm text-gold disabled:opacity-50"
        >
          {saved?.ready ? "Check for a newer download" : `Download ${label} lessons`}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run("LESSON_PACK_STATUS")}
          className="min-h-11 rounded-lg border border-border px-3 text-sm disabled:opacity-50"
        >
          Check saved files
        </button>
        {saved?.ready && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run("LESSON_PACK_REMOVE")}
            className="min-h-11 rounded-lg border border-border px-3 text-sm disabled:opacity-50"
          >
            Remove lesson download
          </button>
        )}
      </div>
      <p role="status" aria-live="polite" className="mt-2 text-xs leading-relaxed">
        {message}
      </p>
    </details>
  );
}
