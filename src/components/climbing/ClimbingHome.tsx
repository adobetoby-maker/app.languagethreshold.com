import { TRAVEL_PHRASES, KNOT_STEPS } from "@/data/climbing-practice.ts";
import { useState } from "react";
import { useApp } from "@/state/app-state";
import { ModuleStudyGuide } from "@/components/modules/ModuleStudyGuide";
import { GearPhotoMatch } from "./GearPhotoMatch";
import { CommandCards } from "./CommandCards";
import { ClimbingMedical } from "./ClimbingMedical";

type SubTab = "guide" | "gear" | "commands" | "medical" | "travel";

const SUB_TABS: { id: SubTab; label: string; emoji: string }[] = [
  { id: "guide", label: "Study Guide", emoji: "📋" },
  { id: "gear", label: "Gear Match", emoji: "🔗" },
  { id: "commands", label: "Commands", emoji: "📣" },
  { id: "medical", label: "Medical", emoji: "🩺" },
  { id: "travel", label: "At the Crag", emoji: "🗺️" },
];

export function ClimbingHome() {
  const { state } = useApp();
  const lang = state.selectedLanguage;
  const [sub, setSub] = useState<SubTab>("guide");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/60 bg-card/30 px-6 py-4 backdrop-blur shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🧗</span>
          <div>
            <h2 className="text-sm font-bold text-white">Rock Climbing</h2>
            <p className="text-xs text-white/40">
              Gear · Commands · Knots · Movement · Medical · Travel
            </p>
          </div>
        </div>
        {/* Sub-tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                sub === t.id
                  ? "bg-[#E8A020]/15 text-[#E8A020] border border-[#E8A020]/30"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
              }`}
            >
              <span>{t.emoji}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {sub === "guide" && <ModuleStudyGuide />}

        {sub === "gear" && (
          <div className="max-w-lg mx-auto">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-1">Gear Photo Match</h3>
              <p className="text-white/40 text-sm">Identify the gear in the photo — in {lang}.</p>
            </div>
            <GearPhotoMatch />
          </div>
        )}

        {sub === "commands" && (
          <div className="max-w-2xl mx-auto">
            <CommandCards />
          </div>
        )}

        {sub === "medical" && (
          <div className="max-w-2xl mx-auto">
            <ClimbingMedical />
          </div>
        )}

        {sub === "travel" && (
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Knot instructions */}
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Tying the Figure-Eight</h3>
              <p className="text-white/40 text-sm mb-5">
                Step-by-step knot instructions in {lang} — for teaching or learning at the crag.
              </p>
              <div className="space-y-3">
                {KNOT_STEPS.map((s) => (
                  <div
                    key={s.step}
                    className="flex gap-4 bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-full bg-[#E8A020]/20 border border-[#E8A020]/40 flex items-center justify-center text-[#E8A020] text-sm font-bold">
                      {s.step}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{s.en}</p>
                      <p className="text-white/60 text-sm mt-0.5">
                        {s.translations[lang] ?? s.translations["Spanish"]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Crag phrases */}
            <div>
              <h3 className="text-lg font-bold text-white mb-1">At the Crag</h3>
              <p className="text-white/40 text-sm mb-5">
                Practical phrases for arrival, logistics, and communicating with locals.
              </p>
              <div className="space-y-2">
                {TRAVEL_PHRASES.map((p, i) => (
                  <div
                    key={i}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3"
                  >
                    <p className="text-white text-sm font-medium">{p.en}</p>
                    <p className="text-white/60 text-sm mt-0.5">
                      {p.translations[lang] ?? p.translations["Spanish"]}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Destination guides */}
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-white/30 mb-3">Plan your trip</p>
              {[
                {
                  label: "Climbing in Brazil",
                  color: "#E8A020",
                  href: "https://climbbrasil.com/learn",
                  site: "climbbrasil.com",
                },
                {
                  label: "Climbing in Kalymnos",
                  color: "#1B74C8",
                  href: "https://climb-kalymnos.vercel.app/learn",
                  site: "climb-kalymnos",
                },
                {
                  label: "Climbing in Spain",
                  color: "#C41E3A",
                  href: "https://climb-spain.vercel.app/learn",
                  site: "climb-spain",
                },
                {
                  label: "Climbing in Utah",
                  color: "#D4721F",
                  href: "https://climb-utah.vercel.app/learn",
                  site: "climb-utah",
                },
              ].map(({ label, color, href, site }) => (
                <a
                  key={site}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">
                      {label}
                    </span>
                  </div>
                  <span className="text-xs text-white/30 group-hover:text-white/50 transition-colors shrink-0">
                    phrase guide →
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
