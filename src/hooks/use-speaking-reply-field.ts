import { useEffect, useRef } from "react";
/** Grow to fit a spoken reply; CSS caps its share of the conversation viewport. */
export function useSpeakingReplyField(value: string) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const field = ref.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.max(value.trim() ? 96 : 64, field.scrollHeight)}px`;
  }, [value]);
  return ref;
}
