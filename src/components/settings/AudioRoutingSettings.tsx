import { SoundEffectsSettings } from "./SoundEffectsSettings";
import { useAuth } from "@/state/auth-state";
import { MicrophoneTestDialog } from "@/components/speak/MicrophoneTestDialog";

/** Changing the account or learning view must also release an open audio test. */
export function AudioRoutingSettings({
  learningContext = "account",
}: {
  learningContext?: string;
}) {
  const { user } = useAuth();
  // /account intentionally has no learning-state provider. Learning views pass
  // their scope explicitly so changing view/module still releases the audio test.
  const scope = JSON.stringify([user?.id ?? null, learningContext]);
  return (
    <section className="rounded-xl border border-border/50 bg-card/30 p-3 text-sm">
      <h3 className="font-semibold">Audio &amp; microphone</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Check your microphone input and where you hear replies.
      </p>
      <MicrophoneTestDialog key={scope} triggerLabel="Check audio routing" />
      <SoundEffectsSettings />
    </section>
  );
}
