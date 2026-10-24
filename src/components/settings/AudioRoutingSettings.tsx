import { useApp } from "@/state/app-state";
import { useAuth } from "@/state/auth-state";
import { MicrophoneTestDialog } from "@/components/speak/MicrophoneTestDialog";

/** Changing the account or learning view must also release an open audio test. */
export function AudioRoutingSettings() {
  const { user } = useAuth();
  const { state } = useApp();
  const scope = JSON.stringify([
    user?.id ?? null,
    state.currentTab,
    state.activeModuleId,
    state.selectedLanguage,
  ]);
  return (
    <section className="rounded-xl border border-border/50 bg-card/30 p-3 text-sm">
      <h3 className="font-semibold">Audio &amp; microphone</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Check your microphone input and where you hear replies.
      </p>
      <MicrophoneTestDialog key={scope} triggerLabel="Check audio routing" />
    </section>
  );
}
