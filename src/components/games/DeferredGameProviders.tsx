import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useApp } from "@/state/app-state";
import { TabErrorBoundary } from "../TabShell";
import { needsGameProviders } from "@/lib/game-provider-activation";
const GameProviders = lazy(() => import("./GameProviders"));

export function DeferredGameProviders({ children }: { children: ReactNode }) {
  const { state } = useApp();
  const requested = needsGameProviders(state.currentTab);
  const [activated, setActivated] = useState(requested);
  useEffect(() => {
    if (requested) setActivated(true);
  }, [requested]);
  if (!requested && !activated) return children;
  // Once activated, keep the same provider tree across tab switches so runs and
  // completion counters survive. AppProvider's existing identity remount resets it.
  return (
    <TabErrorBoundary tabKey={state.currentTab}>
      <Suspense
        fallback={
          <p role="status" className="p-6 text-muted-foreground">
            Opening practice tools…
          </p>
        }
      >
        <GameProviders>{children}</GameProviders>
      </Suspense>
    </TabErrorBoundary>
  );
}
