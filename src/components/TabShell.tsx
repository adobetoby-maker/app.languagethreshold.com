import { Component, type ReactNode, Suspense, useEffect, useState } from "react";
import { GraduationCap, Loader2, RefreshCw, X } from "lucide-react";
import { useApp, type TabKey } from "@/state/app-state";
import { EmptyState } from "./EmptyState";
import { TAB_COMPONENTS, TOOL_CATALOG } from "./tab-registry";
import { isFoundationModule, isMasterModule } from "@/lib/core30-plan";
import { core30PathBannerText } from "@/lib/core60-path";
import { useStageCurriculum } from "@/hooks/use-stage-curriculum";
import { MODULES } from "@/data/modules";
import { reloadNewestAppVersion } from "@/lib/app-update";
import {
  browserChunkReloadRuntime,
  isChunkLoadError,
  reloadForChunkError,
} from "@/lib/chunk-reload";

/** "Roofing Supervisor" for foundation-roofing: the course the Foundation leads into. */
function foundationTrade(moduleId: string | null | undefined): string {
  const base = (moduleId ?? "").replace(/^foundation-/, "");
  return MODULES.find((m) => m.id === base)?.name ?? "Core 30";
}

function TabFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

interface ErrorState {
  hasError: boolean;
  /** The failure was a stale code-split chunk: re-rendering cannot recover it, only a page load can. */
  chunkError: boolean;
  /** An automatic reload for a stale chunk is under way. */
  reloading: boolean;
}

class TabErrorBoundary extends Component<{ children: ReactNode; tabKey: string }, ErrorState> {
  state: ErrorState = { hasError: false, chunkError: false, reloading: false };

  static getDerivedStateFromError(error: unknown): Partial<ErrorState> {
    return { hasError: true, chunkError: isChunkLoadError(error) };
  }

  componentDidCatch(error: unknown) {
    // A tab open across a deploy asks for a chunk that no longer exists: reload once.
    if (reloadForChunkError(error, browserChunkReloadRuntime())) {
      this.setState({ reloading: true });
    }
  }

  componentDidUpdate(prevProps: { tabKey: string }) {
    // Reset error when tab changes so the next tab gets a clean slate
    if (prevProps.tabKey !== this.props.tabKey && this.state.hasError && !this.state.reloading) {
      this.setState({ hasError: false, chunkError: false });
    }
  }

  private retry = () => {
    if (this.state.chunkError) {
      // React.lazy keeps the failed import, so only a hard reload fetches the new build.
      void reloadNewestAppVersion();
      return;
    }
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.reloading) return <TabFallback />;
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center px-6">
          <p className="text-sm text-muted-foreground">This section failed to load.</p>
          <button
            type="button"
            onClick={this.retry}
            className="flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function TabShell() {
  const { state } = useApp();
  // Starts loading a data-driven Core 60 stage's curriculum from any tab (Core 60, Say it, Reader).
  useStageCurriculum(state.activeModuleId);
  const Component = TAB_COMPONENTS[state.currentTab];
  const tool = TOOL_CATALOG[state.currentTab];
  // The Core 30 tab also hosts a Foundation (ten beginner lessons), which is not a 30-lesson path.
  const foundation =
    state.currentTab === "core30" && isFoundationModule(state.activeModuleId ?? "");
  // ...and a Master (twenty advanced lessons after the Core 30).
  const master = state.currentTab === "core30" && isMasterModule(state.activeModuleId ?? "");
  // ...and a Core 30 module whose trade does not have both its Foundation and Master yet.
  const core30PathBanner =
    state.currentTab === "core30" && !foundation && !master
      ? core30PathBannerText(state.activeModuleId)
      : null;
  const purposeName = foundation ? "Core 60 · Foundation" : master ? "Core 60 · Master" : tool.name;
  const purposeText = foundation
    ? `Ten short beginner lessons to get you ready for ${foundationTrade(state.activeModuleId)} Lesson 1.`
    : master
      ? "Twenty lessons for the day that doesn't go as planned."
      : (core30PathBanner ?? tool.purpose);
  const [purposeTab, setPurposeTab] = useState<TabKey | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.querySelector("main")?.scrollTo({ top: 0, behavior: "instant" });
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state.currentTab]);

  useEffect(() => {
    const storageKey = `lt.tool-purpose-dismissed.${state.currentTab}`;
    try {
      setPurposeTab(localStorage.getItem(storageKey) === "1" ? null : state.currentTab);
    } catch {
      setPurposeTab(state.currentTab);
    }
  }, [state.currentTab]);

  const dismissPurpose = () => {
    try {
      localStorage.setItem(`lt.tool-purpose-dismissed.${state.currentTab}`, "1");
    } catch {
      /* ignore */
    }
    setPurposeTab(null);
  };

  if (Component) {
    const purposeBanner = purposeTab === state.currentTab && (
      <section
        data-activity={tool.accent}
        data-testid="tool-purpose"
        className="tool-purpose mb-4 flex items-center gap-3 rounded-xl border bg-card/45 py-1.5 pl-4 pr-1.5"
        aria-label={`${tool.name} purpose`}
      >
        <span className="tool-purpose-dot h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden />
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">{purposeName}</span>
          <span aria-hidden> — </span>
          {purposeText}
        </p>
        <button
          type="button"
          onClick={dismissPurpose}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
          aria-label={`Dismiss ${tool.name} purpose`}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </section>
    );
    return (
      <TabErrorBoundary tabKey={state.currentTab}>
        <Suspense fallback={<TabFallback />}>
          <>
            {state.currentTab !== "core30" && state.currentTab !== "speak" && purposeBanner}
            <Component />
            {/* Keep course availability guidance without putting it ahead of Continue. */}
            {state.currentTab === "core30" && purposeBanner}
            <span hidden data-demo-screen={state.currentTab} />
          </>
        </Suspense>
      </TabErrorBoundary>
    );
  }
  return <EmptyState icon={GraduationCap} title="" description="" />;
}
