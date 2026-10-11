import { COMMANDS, type Command } from "@/data/climbing-practice.ts";
import { useState } from "react";
import { useApp } from "@/state/app-state";

const ROLE_COLORS = {
  climber: {
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    label: "Climber",
    dot: "bg-sky-400",
  },
  belayer: {
    bg: "bg-[#E8A020]/10",
    border: "border-[#E8A020]/20",
    label: "Belayer",
    dot: "bg-[#E8A020]",
  },
  both: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    label: "Either",
    dot: "bg-purple-400",
  },
};

export function CommandCards() {
  const { state } = useApp();
  const lang = state.selectedLanguage;
  const [reveal, setReveal] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "climber" | "belayer">("all");

  const visible = COMMANDS.filter(
    (c) => filter === "all" || c.callerRole === filter || c.callerRole === "both",
  );

  const toggle = (en: string) =>
    setReveal((prev) => {
      const next = new Set(prev);
      if (next.has(en)) next.delete(en);
      else next.add(en);
      return next;
    });

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">Partner Commands</h3>
        <p className="text-white/40 text-sm">
          The 12 commands every climber needs before leaving the gym.
        </p>
      </div>

      {/* Role filter */}
      <div className="flex gap-2">
        {(["all", "climber", "belayer"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${filter === f ? "bg-white/10 border-white/20 text-white" : "border-white/[0.06] text-white/40 hover:text-white/60"}`}
          >
            {f === "all" ? "All" : f === "climber" ? "Climber calls" : "Belayer calls"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.map((cmd) => {
          const colors = ROLE_COLORS[cmd.callerRole];
          const translation = cmd.translations[lang] ?? cmd.translations["Spanish"];
          const note = cmd.notes?.[lang] ?? cmd.notes?.["Spanish"];
          const isRevealed = reveal.has(cmd.en);

          return (
            <button
              key={cmd.en}
              onClick={() => toggle(cmd.en)}
              className={`w-full text-left rounded-xl border p-4 transition-all ${colors.bg} ${colors.border} hover:brightness-110`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                    <span className="text-[10px] uppercase tracking-wider text-white/30">
                      {colors.label}
                    </span>
                  </div>
                  <p className="text-white font-semibold text-base">{cmd.en}</p>
                  {isRevealed && <p className="text-white/80 text-sm mt-1">{translation}</p>}
                  {isRevealed && note && (
                    <p className="text-white/40 text-xs mt-1 italic">{note}</p>
                  )}
                </div>
                <span className="text-white/30 text-xs mt-1 shrink-0">
                  {isRevealed ? "▲" : "▼"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Simulate call-response drill prompt */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
        <p className="text-xs uppercase tracking-wider text-white/30 mb-2">Drill Tip</p>
        <p className="text-sm text-white/60">
          Practice these in order — climber calls first, belayer responds. Run the full sequence
          from <span className="text-white">&ldquo;On belay?&rdquo;</span> to{" "}
          <span className="text-white">&ldquo;Off belay.&rdquo;</span> before every climb until
          it&rsquo;s automatic.
        </p>
      </div>
    </div>
  );
}
