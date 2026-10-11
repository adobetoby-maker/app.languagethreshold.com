import { BOAT_COMMANDS, SPECIES, TRAVEL_PHRASES } from "@/data/fishing-practice.ts";
import { useState } from "react";
import { useApp } from "@/state/app-state";
import { ModuleStudyGuide } from "@/components/modules/ModuleStudyGuide";

type SubTab = "guide" | "boat" | "species" | "culture" | "travel";

const SUB_TABS: { id: SubTab; label: string; emoji: string }[] = [
  { id: "guide", label: "Study Guide", emoji: "📋" },
  { id: "boat", label: "On the Boat", emoji: "⛵" },
  { id: "species", label: "Species", emoji: "🐟" },
  { id: "culture", label: "Culture", emoji: "🌊" },
  { id: "travel", label: "At the Dock", emoji: "🗺️" },
];

// ─── Boat Commands ──────────────────────────────────────────────────────────

// ─── Species Names ──────────────────────────────────────────────────────────

// ─── Cultural Notes ─────────────────────────────────────────────────────────

const CULTURE_NOTES = [
  {
    heading: "¡Ahí va! — The Universal Strike Call",
    body: "In Mexico, '¡Ahí va!' (literally 'there it goes') is the exclamation that fires the moment a fish strikes. You'll hear it before you feel the hit. React immediately — in Baja, the captain calls it and the mate expects you to already be reaching for the rod.",
    langs: ["Spanish"],
  },
  {
    heading: "The Panga and Its Crew",
    body: "La panga is the fiberglass skiff that works the inshore and nearshore waters of Mexico. Every crew is typically a captain (el capitán) and a mate (el marinero). Addressing them by name and greeting them properly — 'Buenos días, ¿cómo están?' — sets the tone for the whole day.",
    langs: ["Spanish"],
  },
  {
    heading: "La propina — The Tip as Livelihood",
    body: "In Mexican fishing culture, the base charter fee goes to the boat operation. The tip (la propina) is what the captain and mate take home. '$50–100 USD for a full day' is not a guideline — it is a meaningful contribution to their family's income. This is the single most important cultural gesture of a fishing trip in Baja.",
    langs: ["Spanish"],
  },
  {
    heading: "Suéltalo — The Release Ethic",
    body: "'¡Suéltalo!' means 'let it go / release it.' Catch-and-release for billfish is the standard on the East Cape — marlin and sailfish are almost never kept. When the captain calls 'suéltalo' it is not a request. It is the right call and the culture of responsible fishing here.",
    langs: ["Spanish"],
  },
  {
    heading: "Los pájaros — The Bird Signal",
    body: "When your captain says '¿Ves los pájaros?' — 'do you see the birds?' — he is watching for frigatebirds and blue-footed boobies diving. Birds diving means baitfish being driven to the surface, which means larger predators below. This is how captains find fish before you see them on the surface.",
    langs: ["Spanish"],
  },
  {
    heading: "Agua azul vs. agua verde",
    body: "'Agua azul' (blue water) is offshore pelagic water — warm, deep, clear, where marlin, wahoo, and tuna live. 'Agua verde' (green water) is productive inshore water — cooler, nutrient-rich, where roosterfish and snapper concentrate. Your captain reads color breaks constantly; these are his landmarks.",
    langs: ["Spanish"],
  },
];

// ─── Dock Travel Phrases ────────────────────────────────────────────────────

// ─── Component ──────────────────────────────────────────────────────────────

export function FishingHome() {
  const { state } = useApp();
  const lang = state.selectedLanguage;
  const [sub, setSub] = useState<SubTab>("guide");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/60 bg-card/30 px-6 py-4 backdrop-blur shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🎣</span>
          <div>
            <h2 className="text-sm font-bold text-white">Sport Fishing</h2>
            <p className="text-xs text-white/40">
              Boat Commands · Species · Culture · Dock Phrases · Study Guide
            </p>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                sub === t.id
                  ? "bg-[#0a9e78]/15 text-[#0fd99c] border border-[#0fd99c]/30"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
              }`}
            >
              <span>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {sub === "guide" && <ModuleStudyGuide />}

        {sub === "boat" && (
          <div className="p-6 space-y-3 max-w-3xl">
            <p className="text-xs text-white/40 mb-4 leading-relaxed">
              Commands used by captains and mates in {lang}. React to these the moment you hear
              them.
            </p>
            {BOAT_COMMANDS.map((cmd) => (
              <div
                key={cmd.en}
                className="bg-card/40 border border-border/60 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-2"
              >
                <div className="text-white/50 text-xs leading-snug">{cmd.en}</div>
                <div className="text-[#0fd99c] font-semibold text-sm">
                  {cmd.translations[lang] ?? cmd.translations["Spanish"] ?? cmd.en}
                </div>
              </div>
            ))}
          </div>
        )}

        {sub === "species" && (
          <div className="p-6 space-y-3 max-w-3xl">
            <p className="text-xs text-white/40 mb-4 leading-relaxed">
              Target species names in {lang}. Learning to name the fish earns instant respect from
              your crew.
            </p>
            {SPECIES.map((sp) => (
              <div key={sp.en} className="bg-card/40 border border-border/60 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div className="text-white font-semibold text-sm">{sp.en}</div>
                  <div className="text-[#0fd99c] font-bold text-sm shrink-0">
                    {sp.translations[lang] ?? sp.translations["Spanish"] ?? sp.en}
                  </div>
                </div>
                <p className="text-white/35 text-xs leading-relaxed">{sp.note}</p>
              </div>
            ))}
          </div>
        )}

        {sub === "culture" && (
          <div className="p-6 space-y-4 max-w-3xl">
            <p className="text-xs text-white/40 mb-4 leading-relaxed">
              Cultural context makes the difference between a tourist and an angler the crew
              respects.
            </p>
            {CULTURE_NOTES.map((note) => (
              <div key={note.heading} className="bg-card/40 border border-border/60 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0fd99c] shrink-0" />
                  <h3 className="text-white font-semibold text-sm">{note.heading}</h3>
                </div>
                <p className="text-white/55 text-xs leading-relaxed">{note.body}</p>
              </div>
            ))}
          </div>
        )}

        {sub === "travel" && (
          <div className="p-6 space-y-3 max-w-3xl">
            <p className="text-xs text-white/40 mb-4 leading-relaxed">
              Phrases for arrival, departure, and connecting with your fishing crew in {lang}.
            </p>
            {TRAVEL_PHRASES.map((phrase) => (
              <div
                key={phrase.en}
                className="bg-card/40 border border-border/60 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-2"
              >
                <div className="text-white/50 text-xs leading-snug">{phrase.en}</div>
                <div className="text-[#0fd99c] font-semibold text-sm">
                  {phrase.translations[lang] ?? phrase.translations["Spanish"] ?? phrase.en}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
