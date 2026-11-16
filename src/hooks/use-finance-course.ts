import { useEffect, useState } from "react";
import { financeTrack } from "@/data/finance-courses.ts";
import { readFinanceCourse, loadFinanceCourse } from "@/data/finance-course-loader.ts";
/** Load one exact-pair course; never put all six courses' readings on the startup path. */
export function useFinanceCourse(moduleId: string | null, tab = "core30") {
  const track = financeTrack(moduleId ?? "");
  const id = track?.id ?? null;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ id: string; error: boolean } | null>(null);
  const ready = id ? !!readFinanceCourse(id) : true;
  useEffect(() => {
    if (!id || readFinanceCourse(id)) return;
    let current = true;
    setResult(null);
    void loadFinanceCourse(id)
      .then(() => {
        if (current) setResult({ id, error: false });
      })
      .catch(() => {
        if (current) setResult({ id, error: true });
      });
    return () => {
      current = false;
    };
  }, [id, attempt]);
  return {
    status: !id || ready ? "ready" : result?.id === id && result.error ? "error" : "loading",
    retry: () => {
      if (typeof window !== "undefined" && result?.error && moduleId && track?.authoredPair) {
        const url = new URL(window.location.href);
        if (url.searchParams.get("module") !== moduleId) {
          url.searchParams.delete("lesson");
          url.searchParams.delete("way");
        }
        url.searchParams.set("module", moduleId);
        url.searchParams.set("target", track.authoredPair.target);
        url.searchParams.set("native", track.authoredPair.native);
        url.searchParams.set("tab", tab);
        window.history.replaceState(window.history.state, "", url);
        window.location.reload();
      } else setAttempt((n) => n + 1);
    },
  } as const;
}
