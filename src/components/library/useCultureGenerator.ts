import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateCultureEssay } from "@/fns/library.functions";
import { useLibrary, flagFor, type LibraryEntry } from "@/state/library-state";
import { useApp, type Language } from "@/state/app-state";

export const COUNTRIES_BY_LANGUAGE: Record<Language, string[]> = {
  Spanish: ["Spain", "Mexico", "Argentina"],
  French: ["France", "Morocco", "Québec"],
  German: ["Germany", "Austria", "Switzerland"],
  Italian: ["Italy"],
  Japanese: ["Japan"],
  Chinese: ["China", "Taiwan", "Singapore"],
  Korean: ["South Korea"],
  Portuguese: ["Brazil", "Portugal"],
  Pashto: ["Afghanistan", "Pakistan"],
  English: ["United Kingdom", "United States", "Australia"],
};

const subtitleFor = (country: string, native: string, target: string) =>
  `AI culture reading · ${country} · ${native} → ${target}`;

/** Only an explicit Library action generates text. Saved copies use the owned Reader queue. */
export function useCultureGenerator() {
  const { state } = useApp();
  const { state: library, dispatch, addCustomEntry, readyToSelect } = useLibrary();
  const generate = useServerFn(generateCultureEssay);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSave, setNeedsSave] = useState(false);
  const prepared = useRef<{ country: string; entry: LibraryEntry } | null>(null);
  const inFlight = useRef(false);
  const alive = useRef(false);
  const scope = `${state.selectedLanguage}/${state.nativeLanguage}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const generateCountry = async (country: string): Promise<boolean> => {
    if (inFlight.current || !readyToSelect || !alive.current) return false;
    const target = state.selectedLanguage;
    const native = state.nativeLanguage;
    if (!COUNTRIES_BY_LANGUAGE[target].includes(country)) return false;
    const current = () => alive.current && currentScope.current === scope;
    const subtitle = subtitleFor(country, native, target);
    const saved = library.entries.find(
      (entry) =>
        entry.section === "custom" &&
        entry.available &&
        entry.language === target &&
        entry.subtitle === subtitle,
    );
    if (saved) {
      dispatch({ type: "SELECT", payload: saved.id });
      return true;
    }
    setError(null);
    if (!prepared.current && typeof navigator !== "undefined" && !navigator.onLine) {
      setError("Connect to create a new reading. Saved texts are available in My Texts.");
      return false;
    }
    inFlight.current = true;
    setPending(true);
    try {
      if (!prepared.current || prepared.current.country !== country) {
        const result = await generate({
          data: { country, targetLanguage: target, nativeLanguage: native },
        });
        if (!current()) return false;
        if (result.error || !result.data)
          throw Error(result.error || "Could not create this reading. Try again.");
        const { targetLanguageText, englishText } = result.data;
        // Reject incomplete alignment rather than silently truncating either language.
        if (
          !Array.isArray(targetLanguageText) ||
          !Array.isArray(englishText) ||
          targetLanguageText.length < 1 ||
          targetLanguageText.length > 80 ||
          targetLanguageText.length !== englishText.length ||
          [...targetLanguageText, ...englishText].some(
            (text) => typeof text !== "string" || !text.trim() || text.length > 8000,
          )
        ) {
          throw Error("This reading was incomplete. Try again; no text was saved.");
        }
        prepared.current = {
          country,
          entry: {
            id: "",
            title: `Culture: ${country}`,
            subtitle,
            language: target,
            targetLabel: target,
            sentences: targetLanguageText.map((text, index) => ({
              target: text.trim(),
              en: englishText[index].trim(),
            })),
            section: "custom",
            flag: flagFor(target),
            available: true,
            createdAt: Date.now(),
          },
        };
        setNeedsSave(true);
      }
      if (!current()) return false;
      await addCustomEntry(prepared.current.entry);
      if (!current()) return false;
      prepared.current = null;
      setNeedsSave(false);
      return true;
    } catch (failure) {
      if (current())
        setError(
          failure instanceof Error ? failure.message : "Could not save this reading. Try again.",
        );
      return false;
    } finally {
      inFlight.current = false;
      if (current()) setPending(false);
    }
  };

  return {
    countries: COUNTRIES_BY_LANGUAGE[state.selectedLanguage],
    generateCountry,
    pending,
    error,
    needsSave,
    ready: readyToSelect,
  };
}
