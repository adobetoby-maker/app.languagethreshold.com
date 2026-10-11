import { PHRASES, type Phrase } from "@/data/climbing-practice.ts";
import { useApp } from "@/state/app-state";

const CAT_LABELS: Record<Phrase["category"], string> = {
  emergency: "Emergency",
  pain: "Locating Pain",
  describe: "Describing the Injury",
  hospital: "At the Clinic",
};

const CAT_COLORS: Record<Phrase["category"], string> = {
  emergency: "text-red-400 bg-red-400/10 border-red-400/20",
  pain: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  describe: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  hospital: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

export function ClimbingMedical() {
  const { state } = useApp();
  const lang = state.selectedLanguage;

  const categories = ["emergency", "pain", "describe", "hospital"] as const;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">Medical & Emergency Phrases</h3>
        <p className="text-white/40 text-sm">
          Calling for help, locating pain, describing injuries, and navigating a clinic abroad.
          Shared vocabulary with the Orthopedics module.
        </p>
      </div>

      {categories.map((cat) => {
        const catPhrases = PHRASES.filter((p) => p.category === cat);
        return (
          <div key={cat}>
            <div
              className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border mb-4 ${CAT_COLORS[cat]}`}
            >
              {cat === "emergency" && "🚨"}
              {cat === "pain" && "🤕"}
              {cat === "describe" && "📋"}
              {cat === "hospital" && "🏥"}
              {CAT_LABELS[cat]}
            </div>
            <div className="space-y-2">
              {catPhrases.map((phrase, i) => {
                const translation = phrase.translations[lang] ?? phrase.translations["Spanish"];
                return (
                  <div
                    key={i}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3"
                  >
                    <p className="text-white text-sm font-medium">{phrase.en}</p>
                    <p className="text-white/60 text-sm mt-1">{translation}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="bg-[#E8A020]/5 border border-[#E8A020]/20 rounded-xl p-4 text-sm text-white/60">
        <span className="text-[#E8A020] font-semibold">Tip: </span>
        Save a photo of the emergency phrases in the local language before you approach the crag.
        Cell service is often unavailable at the base.
      </div>
    </div>
  );
}
