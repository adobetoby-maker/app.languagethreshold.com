import { useState } from "react";
import { Search, X, Check, Clock } from "lucide-react";
import { useApp } from "@/state/app-state";
import { MODULES, getModule, moduleSupportsLearningPair } from "@/data/modules";
import type { AppModule } from "@/data/modules";
import type { Language } from "@/state/app-state";

const COMING_SOON_LANGUAGES = new Set<Language>([]);
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: AppModule["category"][] = [
  "Faith",
  "Medical",
  "Trades",
  "Service",
  "Education",
  "Agriculture",
  "Sports",
  "Travel",
];

const FILTER_TABS = [
  { id: "ALL" as const, label: "All" },
  { id: "Faith" as const, label: "Faith" },
  { id: "Medical" as const, label: "Medical" },
  { id: "Trades" as const, label: "Trades" },
  { id: "Travel" as const, label: "Travel" },
  { id: "Sports" as const, label: "Sports" },
];
type FilterTab = (typeof FILTER_TABS)[number]["id"];

interface Props {
  open: boolean;
  onClose: () => void;
}
export function ModulePickerDialog({ open, onClose }: Props) {
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("ALL");

  const available = MODULES.filter((module) =>
    moduleSupportsLearningPair(module, state.selectedLanguage, state.nativeLanguage),
  );

  const afterSearch = query.trim()
    ? available.filter((m) =>
        [m.name, m.blurb, m.category, m.userRole]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : available;

  const filtered =
    filterTab === "ALL" ? afterSearch : afterSearch.filter((m) => m.category === filterTab);

  const byCategory: Record<string, AppModule[]> = {};
  for (const m of filtered) (byCategory[m.category] ??= []).push(m);

  function select(id: string | null) {
    dispatch({ type: "SET_ACTIVE_MODULE", payload: id });
    if (id) {
      const mod = getModule(id);
      if (mod) toast(`${mod.emoji} ${mod.name} active`);
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[82vh] w-full max-w-2xl overflow-hidden p-0 gap-0 border-border/60 bg-background [&>button]:hidden">
        <DialogTitle className="sr-only">Select Module</DialogTitle>

        {/* Coming soon guard for non-Spanish languages */}
        {COMING_SOON_LANGUAGES.has(state.selectedLanguage) && (
          <div className="flex flex-col items-center justify-center gap-4 px-8 py-16 text-center">
            <Clock className="h-10 w-10 text-gold/60" strokeWidth={1.2} />
            <h3 className="font-display text-xl font-semibold tracking-tight">
              {state.selectedLanguage} — Coming Soon
            </h3>
            <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
              All 41+ modules are live in Spanish today. {state.selectedLanguage} content is in
              development — switch back to Spanish to explore the full library.
            </p>
            <button
              onClick={onClose}
              className="mt-2 rounded-full border border-border/60 px-5 py-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-all hover:border-gold/50 hover:text-foreground"
            >
              Close
            </button>
          </div>
        )}

        {/* Search bar + module list — only shown for supported languages */}
        {!COMING_SOON_LANGUAGES.has(state.selectedLanguage) && (<>
        <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules…"
            className="flex-1 bg-transparent font-mono text-sm tracking-wide text-foreground placeholder:text-muted-foreground/40 outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-1.5 border-b border-border/40 px-5 py-2.5 overflow-x-auto scrollbar-none">
          {FILTER_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilterTab(id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-all",
                filterTab === id
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable list */}
        <div
          className="overflow-y-auto px-5 py-4 space-y-6"
          style={{ maxHeight: "calc(82vh - 112px)" }}
        >
          {/* Core (Free) */}
          <button
            onClick={() => select(null)}
            className={cn(
              "w-full flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-all",
              state.activeModuleId === null
                ? "border-gold/60 bg-gold/10"
                : "border-border/50 hover:border-gold/30 hover:bg-card/50",
            )}
          >
            <span className="text-xl shrink-0 text-gold">✦</span>
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  "font-mono text-xs uppercase tracking-widest font-semibold",
                  state.activeModuleId === null ? "text-gold" : "text-foreground",
                )}
              >
                Core (Free)
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                All 7 languages · parallel reader · grammar · AI tutor
              </div>
            </div>
            {state.activeModuleId === null && <Check className="h-4 w-4 shrink-0 text-gold" />}
          </button>

          {/* Paid modules — grouped or flat */}
          {query.trim() ? (
            filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filtered.map((m) => (
                  <ModCard key={m.id} mod={m} activeId={state.activeModuleId} onSelect={select} />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center font-mono text-sm text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </p>
            )
          ) : (
            CATEGORY_ORDER.filter((c) => byCategory[c]?.length).map((cat) => (
              <div key={cat}>
                <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/50">
                  {cat}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {byCategory[cat].map((m) => (
                    <ModCard key={m.id} mod={m} activeId={state.activeModuleId} onSelect={select} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        </>)}
      </DialogContent>
    </Dialog>
  );
}

function ModCard({
  mod,
  activeId,
  onSelect,
}: {
  mod: AppModule;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const active = activeId === mod.id;
  return (
    <button
      onClick={() => onSelect(mod.id)}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all",
        active
          ? "border-gold/60 bg-gold/10"
          : "border-border/50 hover:border-gold/30 hover:bg-card/50",
      )}
    >
      <span className="mt-0.5 text-lg shrink-0 leading-none">{mod.emoji}</span>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "font-mono text-[11px] uppercase tracking-widest",
            active ? "text-gold font-semibold" : "text-foreground",
          )}
        >
          {mod.name}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2 leading-snug">
          {mod.blurb}
        </div>
      </div>
      {active ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-gold mt-0.5" />
      ) : (
        <span className="shrink-0 font-mono text-[9px] text-gold/60 mt-0.5">
          ${(mod.priceCents / 100).toFixed(0)}
        </span>
      )}
    </button>
  );
}
