import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, RefreshCw, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import type { NewsArticle } from "@/routes/api.sports-news";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SportsPanelProps {
  sport: "soccer" | "baseball";
  favoriteTeam: string | null;
  language: string;
  onSetFavoriteTeam: (team: string | null) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const VISIBLE_INCREMENT = 6;

// ---------------------------------------------------------------------------
// Loading skeleton cards
// ---------------------------------------------------------------------------

function SkeletonCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-2"
        >
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Individual article card
// ---------------------------------------------------------------------------

function ArticleCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-150"
    >
      <p className="text-sm font-medium text-white/90 group-hover:text-white line-clamp-3 leading-snug">
        {article.title}
      </p>

      <div className="mt-1.5 flex items-center gap-2 text-xs text-white/40">
        <span>{article.source}</span>
        <span>·</span>
        <span>{timeAgo(article.pubDate)}</span>
      </div>

      {article.summary && (
        <p className="mt-2 text-xs text-white/55 line-clamp-2 leading-relaxed">{article.summary}</p>
      )}

      {article.teamMentions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {article.teamMentions.slice(0, 3).map((team) => (
            <Badge
              key={team}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-4 bg-white/10 text-white/60 border-white/10"
            >
              {team}
            </Badge>
          ))}
        </div>
      )}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Favorite team inline editor
// ---------------------------------------------------------------------------

function FavoriteTeamInput({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (team: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(value ?? "");
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const commit = () => {
    const trimmed = draft.trim();
    onChange(trimmed || null);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          placeholder="e.g. Real Madrid"
          className="text-xs bg-white/10 border border-white/20 rounded-md px-2 py-1 text-white/90 placeholder-white/30 focus:outline-none focus:border-white/40 w-36"
        />
        <button
          onClick={commit}
          className="text-emerald-400 hover:text-emerald-300 transition-colors"
          aria-label="Confirm"
        >
          <Check size={13} />
        </button>
        <button
          onClick={cancel}
          className="text-white/40 hover:text-white/60 transition-colors"
          aria-label="Cancel"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors group"
    >
      {value ? (
        <>
          <span className="text-white/70">Following:</span>
          <span className="text-white/90 font-medium">{value}</span>
        </>
      ) : (
        <span className="text-white/40">+ Add your team</span>
      )}
      <Pencil size={11} className="opacity-50 group-hover:opacity-80 transition-opacity" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SportsNewsPanel({
  sport,
  favoriteTeam,
  language,
  onSetFavoriteTeam,
}: SportsPanelProps) {
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(VISIBLE_INCREMENT);
  const [worldCupFilter, setWorldCupFilter] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<string | null>(null);

  const icon = sport === "soccer" ? "⚽" : "⚾";
  const heading = sport === "soccer" ? "Matchday News" : "Baseball News";

  const { key, capture } = usePracticeLifecycle(JSON.stringify([sport, favoriteTeam, language]));
  const inFlight = useRef<AbortController | null>(null);
  const loadNews = useCallback(async () => {
    const lease = capture();
    if (!lease.isCurrent() || inFlight.current) return;
    const controller = new AbortController();
    inFlight.current = controller;
    const release = lease.own(() => {
      controller.abort();
      if (inFlight.current === controller) inFlight.current = null;
    });
    setLoading(true);
    setError(null);
    setFetchMessage("Fetching latest news...");
    try {
      const res = await fetch("/api/sports-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport, favoriteTeam }),
        cache: "no-store",
        signal: controller.signal,
      });
      if (!lease.isCurrent()) {
        void res.body?.cancel().catch(() => {});
        return;
      }
      if (!res.ok) {
        void res.body?.cancel().catch(() => {});
        throw new Error("News unavailable");
      }
      const data = (await res.json()) as { articles?: NewsArticle[]; error?: unknown } | null;
      if (!lease.isCurrent()) return;
      if (!data || data.error || !Array.isArray(data.articles)) throw new Error("News unavailable");
      setArticles(data.articles);
    } catch {
      if (!lease.isCurrent()) return;
      setError("News unavailable — try again later.");
      setArticles([]);
    } finally {
      release();
      if (inFlight.current === controller) inFlight.current = null;
      if (lease.isCurrent()) {
        setLoading(false);
        setFetchMessage(null);
      }
    }
  }, [capture, sport, favoriteTeam]);

  useEffect(() => {
    setResultKey(key);
    setArticles([]);
    setError(null);
    setVisible(VISIBLE_INCREMENT);
    setWorldCupFilter(false);
    void loadNews();
  }, [key, loadNews]);

  const changeFavoriteTeam = (team: string | null) => {
    if (capture().isCurrent()) onSetFavoriteTeam(team);
  };

  // Apply World Cup filter for soccer
  const displayedAll =
    resultKey !== key
      ? []
      : sport === "soccer" && worldCupFilter
        ? articles.filter(
            (a) =>
              a.title.toLowerCase().includes("world cup") || a.title.toLowerCase().includes("fifa"),
          )
        : articles;

  const displayed = displayedAll.slice(0, visible);
  const hasMore = visible < displayedAll.length;

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3 className="text-sm font-semibold text-white/90">
            {heading}
            {language && (
              <span className="ml-2 text-xs font-normal text-white/40">· {language}</span>
            )}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* World Cup filter pill — soccer only */}
          {sport === "soccer" && (
            <button
              onClick={() => setWorldCupFilter((v) => !v)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
                worldCupFilter
                  ? "bg-amber-500/20 border-amber-400/40 text-amber-300"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white/70"
              }`}
            >
              <span>🏆</span>
              <span>World Cup 2026</span>
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={loadNews}
            disabled={loading}
            className="text-white/30 hover:text-white/60 transition-colors disabled:opacity-30"
            aria-label="Refresh news"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ---- Favorite team ---- */}
      <FavoriteTeamInput value={favoriteTeam} onChange={changeFavoriteTeam} />

      {/* ---- Content ---- */}
      {loading || resultKey !== key ? (
        <div className="flex flex-col gap-3">
          {fetchMessage && <p className="text-xs text-white/40 text-center py-1">{fetchMessage}</p>}
          <SkeletonCards count={3} />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-white/50">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadNews}
            className="border-white/20 text-white/60 hover:text-white/90 bg-transparent"
          >
            <RefreshCw size={13} className="mr-1.5" />
            Try again
          </Button>
        </div>
      ) : displayed.length === 0 ? (
        <p className="text-sm text-white/40 text-center py-6">
          {worldCupFilter ? "No World Cup articles right now." : "No articles found."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {displayed.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}

          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisible((v) => v + VISIBLE_INCREMENT)}
              className="mt-1 text-xs text-white/50 hover:text-white/80 hover:bg-white/5"
            >
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
