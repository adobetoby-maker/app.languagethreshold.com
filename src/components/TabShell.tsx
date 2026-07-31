import { Component, type ReactNode, Suspense, useEffect, useState } from "react";
import { GraduationCap, Loader2, RefreshCw, X } from "lucide-react";
import { useApp, type TabKey } from "@/state/app-state";
import { EmptyState } from "./EmptyState";
import { TAB_COMPONENTS, TOOL_CATALOG } from "./tab-registry";

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
}

class TabErrorBoundary extends Component<{ children: ReactNode; tabKey: string }, ErrorState> {
  state: ErrorState = { hasError: false };

  static getDerivedStateFromError(): ErrorState {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: { tabKey: string }) {
    // Reset error when tab changes so the next tab gets a clean slate
    if (prevProps.tabKey !== this.props.tabKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center px-6">
          <p className="text-sm text-muted-foreground">This section failed to load.</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
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
  const Component = TAB_COMPONENTS[state.currentTab];
  const tool = TOOL_CATALOG[state.currentTab];
  const [purposeTab, setPurposeTab] = useState<TabKey | null>(null);

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
    return (
      <TabErrorBoundary tabKey={state.currentTab}>
        <Suspense fallback={<TabFallback />}>
          <>
            {purposeTab === state.currentTab && (
              <section
                data-activity={tool.accent}
                className="tool-purpose mb-4 flex items-center gap-3 rounded-xl border bg-card/45 py-1.5 pl-4 pr-1.5"
                aria-label={`${tool.name} purpose`}
              >
                <span className="tool-purpose-dot h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden />
                <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">{tool.name}</span>
                  <span aria-hidden> — </span>
                  {tool.purpose}
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
            )}
            <Component />
          </>
        </Suspense>
      </TabErrorBoundary>
    );
  }
  return <EmptyState icon={GraduationCap} title="" description="" />;
}
