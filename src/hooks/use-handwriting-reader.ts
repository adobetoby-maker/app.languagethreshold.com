import { useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { readHandwriting } from "@/fns/handwriting-read.functions";
import { isHandwritingReadLanguage } from "@/lib/handwriting-check";
export type WriteOutcome =
  { kind: "read"; text: string } | { kind: "manual"; message: string | null };
const READ_TIMEOUT_MS = 12_000;

export function useHandwritingReader(language: string) {
  const read = useServerFn(readHandwriting);
  return useCallback(
    async (imageBase64: string, expected?: string): Promise<WriteOutcome> => {
      if (!isHandwritingReadLanguage(language)) {
        return {
          kind: "manual",
          message: `Handwriting check is not available for ${language} yet. Check it yourself.`,
        };
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return { kind: "manual", message: "You are offline, so check your writing yourself." };
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          read({ data: { imageBase64, language, ...(expected ? { expected } : {}) } }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("timeout")), READ_TIMEOUT_MS);
          }),
        ]);
        if (result.error) {
          return {
            kind: "manual",
            message:
              "Could not check your writing right now. Your writing is kept. Try Check again, or check it yourself.",
          };
        }
        if (!result.text) {
          return {
            kind: "manual",
            message:
              "Could not read that writing. Your writing is kept. Try Check again, or check it yourself.",
          };
        }
        return { kind: "read", text: result.text };
      } catch (error) {
        const slow = error instanceof Error && error.message === "timeout";
        return {
          kind: "manual",
          message: slow
            ? "The check is taking too long. Your writing is kept. Try Check again, or check it yourself."
            : "Could not check your writing right now. Your writing is kept. Try Check again, or check it yourself.",
        };
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
    [read, language],
  );
}
