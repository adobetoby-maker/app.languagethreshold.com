import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SpeakingAudioSource = "device" | "google" | "text" | "selected";

interface SpeakingConsentDialogProps {
  open: boolean;
  saving: boolean;
  unknown: boolean;
  onCheckSavedStatus: () => void;
  error?: string | null;
  language: string;
  audioSource: SpeakingAudioSource;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  allowSkipWhileSaving?: boolean;
}

export function SpeakingConsentDialog({
  open,
  saving,
  unknown,
  onCheckSavedStatus,
  error,
  language,
  audioSource,
  onOpenChange,
  onConfirm,
  allowSkipWhileSaving = false,
}: SpeakingConsentDialogProps) {
  const audioPrivacyCopy =
    audioSource === "google"
      ? `Google Cloud receives only the partner's generated ${language} line, voice, and speed settings. Your microphone audio is not sent to Google Cloud Text-to-Speech.`
      : audioSource === "device"
        ? "Partner playback uses this device's browser voice, so the partner line is not sent to Google Cloud Text-to-Speech."
        : audioSource === "text"
          ? "Text-only mode does not send the partner line to a speech-synthesis provider."
          : "Partner playback may use your device or a speech provider such as Google Cloud. A speech provider receives the partner’s line and voice settings, not your microphone audio from Language Threshold.";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (!saving || allowSkipWhileSaving) && onOpenChange(nextOpen)}
    >
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] flex-col gap-3 overflow-hidden rounded-3xl border-gold/40 bg-card p-5 sm:max-w-md sm:p-6">
        <DialogHeader className="shrink-0 text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
            {unknown ? "Confirmation status unconfirmed" : "Speaking privacy"}
          </p>
          <DialogTitle className="font-serif text-2xl leading-tight text-foreground">
            {unknown ? "Check your speaking confirmation" : "Before you speak"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {unknown
              ? "Your earlier request may still finish. Check its saved status before sending another confirmation."
              : "Your spoken words become text. Anthropic’s AI receives the conversation transcript for replies and feedback."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto space-y-3 text-sm leading-relaxed text-foreground/90">
          <p>
            Your device or browser’s speech service may process microphone audio. Language Threshold
            does not upload raw audio for this conversation.
          </p>
          {!unknown && (
            <p className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm">
              By choosing <strong>Agree &amp; continue</strong>, I confirm I am 13 or older and
              consent to this processing for AI conversation practice.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Use fictional details. Avoid sensitive information. AI can make mistakes. The mic starts
            only when you tap it. Other lessons stay available if you skip.
          </p>
          <details className="text-xs text-muted-foreground">
            <summary className="min-h-11 cursor-pointer py-3">Partner voice details</summary>
            <p>{audioPrivacyCopy}</p>
          </details>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="grid shrink-0 gap-2 pt-1">
          <p className="text-xs text-muted-foreground">
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Privacy Policy
            </a>
            {" · "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Terms of Service
            </a>
          </p>
          <button
            type="button"
            onClick={unknown ? onCheckSavedStatus : onConfirm}
            disabled={saving}
            className="min-h-12 w-full rounded-2xl bg-gold px-4 py-3 font-semibold text-black shadow-lg shadow-gold/10 disabled:cursor-wait disabled:opacity-60"
          >
            {saving
              ? unknown
                ? "Checking saved confirmation…"
                : "Saving confirmation…"
              : unknown
                ? "Check saved confirmation"
                : "Agree & continue"}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving && !allowSkipWhileSaving}
            className="min-h-12 w-full rounded-2xl border-2 border-border bg-background px-4 py-3 text-sm font-medium text-foreground disabled:opacity-50"
          >
            Not now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
