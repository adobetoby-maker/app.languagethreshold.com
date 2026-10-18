import { useEffect, useState } from "react";
import { useLearnerDeviceStore } from "./use-learner-device-store";
import {
  addReadingHints,
  readReadingHints,
  validReadingHints,
  type ReadingHintFormat,
  type ReadingHintSegment,
} from "@/lib/reading-hint-cache";
const scripts = { furigana: /[\u4E00-\u9FFF]/, pinyin: /[一-鿿]/, romaja: /[\uAC00-\uD7AF]/ };
export function useReadingHints(
  format: ReadingHintFormat,
  text: string,
  fetchReadings: (input: {
    data: { text: string };
  }) => Promise<{ data: { segments: ReadingHintSegment[] } | null }>,
  enabled = true,
): ReadingHintSegment[] | null {
  const store = useLearnerDeviceStore(`readingHints:${format}`);
  const [result, setResult] = useState<{
    store: typeof store;
    text: string;
    segments: ReadingHintSegment[];
  } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const cached = readReadingHints(store.read(), format, text);
    if (cached || !scripts[format].test(text)) {
      setResult({ store, text, segments: cached ?? [{ base: text }] });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetchReadings({ data: { text } });
        if (cancelled) return;
        const segments = response.data?.segments;
        if (validReadingHints(segments, format, text)) {
          const next = addReadingHints(store.read(), format, text, segments);
          store.write(next);
          setResult({ store, text, segments });
        } else setResult({ store, text, segments: [{ base: text }] });
      } catch {
        if (!cancelled) setResult({ store, text, segments: [{ base: text }] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [format, text, fetchReadings, enabled, store]);
  // Never render the previous sentence/account while the next effect is still pending.
  return enabled && result?.store === store && result.text === text ? result.segments : null;
}
