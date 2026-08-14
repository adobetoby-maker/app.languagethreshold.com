import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SpeakingAudioSource = "device" | "google" | "text";

interface SpeakingConsentDialogProps {
  open: boolean;
  saving: boolean;
  language: string;
  audioSource: SpeakingAudioSource;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function SpeakingConsentDialog({
  open,
  saving,
  language,
  audioSource,
  onOpenChange,
  onConfirm,
}: SpeakingConsentDialogProps) {
  const audioPrivacyCopy =
    audioSource === "google"
      ? `Google Cloud receives only the partner's generated ${language} line, voice, and speed settings. Your microphone audio is not sent to Google Cloud Text-to-Speech.`
      : audioSource === "device"
        ? "Partner playback uses this device's browser voice, so the partner line is not sent to Google Cloud Text-to-Speech."
        : "Text-only mode does not send the partner line to a speech-synthesis provider.";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-3xl border-gold/40 bg-card p-5 sm:max-w-md sm:p-6">
        <DialogHeader className="text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
            One-time speaking confirmation
          </p>
          <DialogTitle className="font-serif text-2xl leading-tight text-foreground">
            Confirm once, then start speaking
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            This confirmation is saved to your account. You will not be asked again on future
            speaking lessons.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
          <div className="rounded-2xl border border-gold/30 bg-gold/10 p-4">
            <p className="font-semibold text-foreground">I confirm that I am at least 13.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This is an account self-attestation, not identity or age-document verification.
            </p>
          </div>
          <p>
            Mission mode sends the current rolling text transcript to Anthropic for the partner's
            next reply and AI-estimated coaching.
          </p>
          <p>{audioPrivacyCopy}</p>
          <p className="text-xs text-muted-foreground">
            Browser speech recognition may use browser or operating-system services.
          </p>
        </div>

        <div className="grid gap-3 pt-1">
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="min-h-14 w-full rounded-2xl bg-gold px-4 py-3 font-semibold text-black shadow-lg shadow-gold/10 disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? "Saving confirmation…" : "I am 13 or older — start mission"}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="min-h-12 w-full rounded-2xl border-2 border-border bg-background px-4 py-3 text-sm font-medium text-foreground disabled:opacity-50"
          >
            Not now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
