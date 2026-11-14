import { useEffect, useState } from "react";
import { useApp } from "@/state/app-state";
import { LanguageFirstStep, hasChosenLanguage } from "./LanguageFirstStep";
import { directLearningEntry } from "@/lib/direct-learning-entry";

/** Choose language once, then enter the same speaking-first app as returning learners. */
export function FirstRunEntry() {
  const { state, dispatch } = useApp();
  const [languageChosen, setLanguageChosen] = useState(() => hasChosenLanguage());
  const directEntry =
    typeof window !== "undefined"
      ? directLearningEntry(window.location.search, state.nativeLanguage)
      : null;
  useEffect(() => {
    if (state.hydrated && !state.onboardingComplete && (languageChosen || directEntry)) {
      dispatch({ type: "COMPLETE_ONBOARDING" });
    }
  }, [state.hydrated, state.onboardingComplete, languageChosen, directEntry, dispatch]);
  if (!state.hydrated || state.onboardingComplete || directEntry || languageChosen) return null;
  return (
    <LanguageFirstStep
      onChosen={() => setLanguageChosen(true)}
      onDismiss={() => {
        dispatch({ type: "COMPLETE_ONBOARDING" });
        dispatch({ type: "SET_TAB", payload: "speak" });
      }}
    />
  );
}
