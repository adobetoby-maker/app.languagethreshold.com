import { useApp } from "@/state/app-state";
import { ExamsArea } from "./ExamsArea";
export function ExamsTab() {
  const { state } = useApp();
  return (
    <ExamsArea
      moduleId={state.activeModuleId ?? "roofing"}
      targetLanguage={state.selectedLanguage}
      instructionLanguage={state.nativeLanguage}
    />
  );
}
