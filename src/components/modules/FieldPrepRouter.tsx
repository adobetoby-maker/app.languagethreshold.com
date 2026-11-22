import { useApp } from "@/state/app-state";
import { FieldPrepMode } from "@/components/missionary/FieldPrepMode";
import { ModuleFieldPrep } from "./ModuleFieldPrep";
import { catalogLessonPack } from "@/data/language-packs/catalog-lessons";

const MEDICAL_IDS = new Set([
  "orthopedics",
  "nursing",
  "emergency-medicine",
  "family-medicine",
  "fmg",
  "ob-gyn",
  "cardiology",
  "general-surgery",
  "physical-therapy",
  "pain-management",
  "medical-receptionist",
  "or-evs",
]);

const TRADES_IDS = new Set([
  "construction-foreman",
  "plumber",
  "drywall",
  "electrician",
  "landscaper",
  "framer",
  "construction-safety",
]);

const SPORTS_IDS = new Set(["soccer", "baseball", "hockey", "tennis"]);

export function FieldPrepRouter() {
  const { state } = useApp();
  const id = state.activeModuleId;
  // The Field Prep scenarios are written for Spanish (partners, opening lines, questions), so a
  // French or Italian learner sees the not-available state instead.
  const catalogPack = catalogLessonPack(state.selectedLanguage);
  if (catalogPack)
    return (
      <div
        className="mx-auto max-w-xl py-16 text-center space-y-4"
        data-testid="field-prep-unavailable"
      >
        <p className="text-4xl">🎙️</p>
        <h2 className="font-display text-xl text-foreground">Field Prep</h2>
        <p className="text-sm text-muted-foreground">
          Field Prep practice conversations are not available in {catalogPack.name} yet. Your
          lessons, Speak and the Reader are ready to use.
        </p>
      </div>
    );

  if (id === "lds-missionary") return <FieldPrepMode />;
  if (id && MEDICAL_IDS.has(id)) return <ModuleFieldPrep moduleGroup="medical" />;
  if (id && TRADES_IDS.has(id)) return <ModuleFieldPrep moduleGroup="trades" />;
  if (id && SPORTS_IDS.has(id)) return <ModuleFieldPrep moduleGroup="sports" />;

  // Fallback: show a prompt to pick a module
  return (
    <div className="mx-auto max-w-xl py-16 text-center space-y-4">
      <p className="text-4xl">🎙️</p>
      <h2 className="font-display text-xl text-foreground">Field Prep</h2>
      <p className="text-sm text-muted-foreground">
        Select a specialty module (medical, trades, sports, or missionary) to unlock module-specific
        practice conversations with voice mode.
      </p>
    </div>
  );
}
