import { useState, useMemo } from "react";
import { Search, Sparkles, CheckCircle2, Lock, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useApp } from "@/state/app-state";
import { useSubscription } from "@/state/subscription-state";
import { MODULES, type AppModule } from "@/data/modules";
import type { TabKey } from "@/state/app-state";

const CATEGORY_ORDER: AppModule["category"][] = [
  "English for Work",
  "Faith",
  "Medical",
  "Trades",
  "Service",
  "Education",
  "Agriculture",
  "Sports",
  "Travel",
];

const CATEGORY_META: Record<AppModule["category"], { emoji: string; color: string }> = {
  "English for Work": {
    emoji: "🗣️",
    color: "text-indigo-400 border-indigo-400/40 bg-indigo-400/10",
  },
  Faith: { emoji: "🙏", color: "text-violet-400 border-violet-400/40 bg-violet-400/10" },
  Medical: { emoji: "🏥", color: "text-sky-400 border-sky-400/40 bg-sky-400/10" },
  Trades: { emoji: "🔧", color: "text-amber-400 border-amber-400/40 bg-amber-400/10" },
  Service: { emoji: "🍽️", color: "text-rose-400 border-rose-400/40 bg-rose-400/10" },
  Education: { emoji: "📚", color: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10" },
  Agriculture: { emoji: "🌾", color: "text-lime-400 border-lime-400/40 bg-lime-400/10" },
  Sports: { emoji: "⚽", color: "text-orange-400 border-orange-400/40 bg-orange-400/10" },
  Travel: { emoji: "✈️", color: "text-cyan-400 border-cyan-400/40 bg-cyan-400/10" },
};

function moduleDestinationTab(moduleId: string): TabKey {
  if (moduleId === "lds-missionary") return "missionary";
  if (moduleId === "orthopedics") return "orthopedics";
  if (moduleId === "soccer") return "soccer";
  if (moduleId === "baseball") return "baseball";
  if (moduleId === "or-evs") return "orEvs";
  if (moduleId === "fmg") return "fmg";
  if (moduleId === "rock-climbing") return "climbing";
  if (moduleId === "sport-fishing") return "fishing";
  return "reader";
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface ModuleCardProps {
  module: AppModule;
  isActive: boolean;
  isPurchased: boolean;
  isSubscribed: boolean;
  onActivate: () => void;
}

function ModuleCard({ module, isActive, isPurchased, isSubscribed, onActivate }: ModuleCardProps) {
  const meta = CATEGORY_META[module.category];
  const topVocab = module.vocabFocus.slice(0, 5);

  return (
    <div
      className={
        "group relative flex flex-col rounded-2xl border p-5 transition-all duration-200 " +
        (isActive
          ? "border-gold/70 bg-gradient-to-br from-gold/10 via-card/90 to-card/90 shadow-luxe"
          : "border-border/50 bg-card/60 hover:border-gold/30 hover:bg-card/80 hover:shadow-md")
      }
    >
      {/* Active badge */}
      {isActive && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-gold/50 bg-gold/20 px-2.5 py-1">
          <CheckCircle2 className="h-3 w-3 text-gold" />
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-gold">Active</span>
        </div>
      )}

      {/* Emoji */}
      <div className="mb-3 text-4xl leading-none">{module.emoji}</div>

      {/* Name + category */}
      <div className="mb-1 flex items-start gap-2">
        <h3 className="flex-1 font-display text-base italic leading-snug text-foreground">
          {module.name}
        </h3>
      </div>

      {/* Category badge */}
      <span
        className={`mb-2 self-start rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${meta.color}`}
      >
        {meta.emoji} {module.category}
      </span>

      {/* User role */}
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        Role: {module.userRole}
      </p>

      {/* Blurb */}
      <p className="mb-4 flex-1 text-xs leading-relaxed text-foreground/75">{module.blurb}</p>

      {/* Vocab focus chips */}
      <div className="mb-4 flex flex-wrap gap-1">
        {topVocab.map((kw) => (
          <span
            key={kw}
            className="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 font-mono text-[9px] text-muted-foreground"
          >
            {kw}
          </span>
        ))}
        {module.vocabFocus.length > 5 && (
          <span className="rounded-full border border-border/40 px-2 py-0.5 font-mono text-[9px] text-muted-foreground/60">
            +{module.vocabFocus.length - 5}
          </span>
        )}
      </div>

      {/* Footer: status + action */}
      <div className="flex items-center justify-between gap-2">
        {isPurchased || isSubscribed ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-emerald-400">
            ✓ Included with Pro
          </span>
        ) : (
          <Link
            to="/pricing"
            className="font-mono text-[9px] uppercase tracking-[0.15em] text-gold/70 hover:text-gold transition-colors"
          >
            Pro plan →
          </Link>
        )}

        {isActive ? (
          <button
            onClick={onActivate}
            className="flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-gold transition-colors hover:bg-gold/30"
          >
            Open <ChevronRight className="h-3 w-3" />
          </button>
        ) : (
          <button
            onClick={onActivate}
            className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/80 transition-colors hover:border-gold/50 hover:bg-gold/10 hover:text-gold"
          >
            {isPurchased ? (
              <>
                Activate <ChevronRight className="h-3 w-3" />
              </>
            ) : (
              <>
                <Lock className="h-3 w-3" /> Preview
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function ModulesPage() {
  const { state, dispatch } = useApp();
  const { isActive: isSubscribed } = useSubscription();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<AppModule["category"] | "All">("All");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return MODULES.filter((m) => {
      const matchesCat = activeCategory === "All" || m.category === activeCategory;
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.blurb.toLowerCase().includes(q) ||
        m.userRole.toLowerCase().includes(q) ||
        m.vocabFocus.some((v) => v.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [search, activeCategory]);

  // Group by category preserving CATEGORY_ORDER
  const groups = useMemo(() => {
    if (activeCategory !== "All") {
      return [{ category: activeCategory as AppModule["category"], modules: filtered }];
    }
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      modules: filtered.filter((m) => m.category === cat),
    })).filter((g) => g.modules.length > 0);
  }, [filtered, activeCategory]);

  const handleActivate = (module: AppModule) => {
    // Purchase if not owned (free preview period)
    if (!state.purchasedModules.includes(module.id)) {
      dispatch({ type: "PURCHASE_MODULE", payload: module.id });
    }
    dispatch({ type: "SET_ACTIVE_MODULE", payload: module.id });
    dispatch({ type: "SET_TAB", payload: moduleDestinationTab(module.id) });
  };

  const totalModules = MODULES.length;
  const purchasedCount = state.purchasedModules.length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page header */}
      <div className="border-b border-border/60 bg-card/30 px-6 py-5 backdrop-blur">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-gold" />
            <span className="font-display text-sm italic">
              <span className="text-gold">✦</span> Module Library
            </span>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              {purchasedCount} / {totalModules} modules
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a specialty module to focus your reading, tutor, and practice around your
            profession.
          </p>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search modules, roles, or keywords…"
              className="w-full rounded-xl border border-border/60 bg-background/60 py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/50 focus:outline-none"
            />
          </div>

          {/* Category filter */}
          <div className="mt-3 flex gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveCategory("All")}
              className={
                "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors " +
                (activeCategory === "All"
                  ? "border-gold/60 bg-gold/15 text-gold"
                  : "border-border/50 bg-background/30 text-muted-foreground hover:text-foreground")
              }
            >
              All {search ? `(${filtered.length})` : `(${totalModules})`}
            </button>
            {CATEGORY_ORDER.map((cat) => {
              const meta = CATEGORY_META[cat];
              const count = MODULES.filter((m) => m.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={
                    "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors " +
                    (activeCategory === cat
                      ? `border-gold/60 bg-gold/15 text-gold`
                      : "border-border/50 bg-background/30 text-muted-foreground hover:text-foreground")
                  }
                >
                  {meta.emoji} {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Module grid */}
      <div className="lt-scroll-safe custom-scroll flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl space-y-10">
          {groups.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground text-sm">No modules match "{search}"</p>
              <button
                onClick={() => setSearch("")}
                className="mt-2 font-mono text-[10px] uppercase tracking-widest text-gold hover:opacity-80"
              >
                Clear search
              </button>
            </div>
          ) : (
            groups.map(({ category, modules }) => {
              const meta = CATEGORY_META[category];
              const isEnglishForWork = category === "English for Work";
              return (
                <section key={category}>
                  {/* Category heading */}
                  {isEnglishForWork ? (
                    <div className="mb-4 rounded-2xl border border-indigo-400/30 bg-indigo-400/5 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{meta.emoji}</span>
                        <div className="flex-1">
                          <h2 className="font-display text-lg font-semibold text-indigo-300">
                            English for Work
                          </h2>
                          <p className="text-xs text-indigo-300/70">
                            For professionals learning English on the job — native language as your
                            foundation.
                          </p>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-400/60">
                          {modules.length} module{modules.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-2xl">{meta.emoji}</span>
                      <h2 className="font-display text-lg italic text-foreground">{category}</h2>
                      <div className="flex-1 border-t border-border/40" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {modules.length} module{modules.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {/* Cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {modules.map((m) => (
                      <ModuleCard
                        key={m.id}
                        module={m}
                        isActive={state.activeModuleId === m.id}
                        isPurchased={state.purchasedModules.includes(m.id)}
                        isSubscribed={isSubscribed}
                        onActivate={() => handleActivate(m)}
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
