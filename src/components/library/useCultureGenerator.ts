import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateCultureEssay } from "@/fns/library.functions";
import { useLibrary, flagFor } from "@/state/library-state";
import { useApp, type Language } from "@/state/app-state";

const COUNTRIES_BY_LANGUAGE: Record<Language, string[]> = {
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

const FLAG_BY_COUNTRY: Record<string, string> = {
  Spain: "🇪🇸",
  Mexico: "🇲🇽",
  Argentina: "🇦🇷",
  France: "🇫🇷",
  Morocco: "🇲🇦",
  Québec: "🇨🇦",
  Germany: "🇩🇪",
  Austria: "🇦🇹",
  Switzerland: "🇨🇭",
  Italy: "🇮🇹",
  Japan: "🇯🇵",
  China: "🇨🇳",
  Taiwan: "🇹🇼",
  Singapore: "🇸🇬",
  "South Korea": "🇰🇷",
  Brazil: "🇧🇷",
  Portugal: "🇵🇹",
  "United Kingdom": "🇬🇧",
  "United States": "🇺🇸",
  Australia: "🇦🇺",
};

const cultureId = (lang: Language, country: string) =>
  `culture-${lang.toLowerCase()}-${country.toLowerCase().replace(/[^a-z]/g, "")}`;

export function useCultureGenerator() {
  const { state } = useApp();
  const { state: lib, dispatch } = useLibrary();
  const generate = useServerFn(generateCultureEssay);
  const inFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    const lang = state.selectedLanguage;
    const countries = COUNTRIES_BY_LANGUAGE[lang];
    const missing = countries.filter((c) => {
      const id = cultureId(lang, c);
      const existing = lib.entries.find((e) => e.id === id);
      return (!existing || !existing.available) && !inFlight.current.has(id);
    });

    if (missing.length === 0) return;

    let cancelled = false;
    dispatch({ type: "SET_GENERATING", payload: true });

    (async () => {
      // Insert stubs immediately so they appear under Culture Series
      for (const country of missing) {
        const id = cultureId(lang, country);
        inFlight.current.add(id);
        dispatch({
          type: "REPLACE_BY_ID",
          payload: {
            id,
            title: `Culture: ${country}`,
            subtitle: "Generating…",
            language: lang,
            targetLabel: lang,
            sentences: [],
            section: "culture",
            flag: FLAG_BY_COUNTRY[country] ?? flagFor(lang),
            available: false,
          },
        });
      }

      // Generate sequentially to be gentle on rate limits
      for (const country of missing) {
        if (cancelled) break;
        const id = cultureId(lang, country);
        try {
          const res = await generate({
            data: { country, targetLanguage: lang, nativeLanguage: state.nativeLanguage },
          });
          if (cancelled) break;
          if (res.data) {
            const len = Math.min(res.data.targetLanguageText.length, res.data.englishText.length);
            const sentences = Array.from({ length: len }, (_, i) => ({
              en: res.data!.englishText[i],
              target: res.data!.targetLanguageText[i],
            }));
            dispatch({
              type: "REPLACE_BY_ID",
              payload: {
                id,
                title: `Culture: ${res.data.countryName || country}`,
                subtitle: `An essay about ${country}`,
                language: lang,
                targetLabel: lang,
                sentences,
                section: "culture",
                flag: FLAG_BY_COUNTRY[country] ?? flagFor(lang),
                available: true,
              },
            });
          }
        } catch (e) {
          console.error("culture generation failed", country, e);
        } finally {
          inFlight.current.delete(id);
        }
      }
      if (!cancelled) dispatch({ type: "SET_GENERATING", payload: false });
    })();

    return () => {
      cancelled = true;
      dispatch({ type: "SET_GENERATING", payload: false });
    };
    // Re-run when target language OR native language changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedLanguage, state.nativeLanguage]);
}
