import { useState, useSyncExternalStore } from "react";
import { CheckCircle2, Download, ExternalLink, Share, Smartphone } from "lucide-react";
import {
  getPwaInstallServerSnapshot,
  getPwaInstallSnapshot,
  promptPwaInstall,
  subscribePwaInstall,
} from "@/lib/pwa-install";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function PwaInstallControl({ variant = "row" }: { variant?: "row" | "card" }) {
  const install = useSyncExternalStore(
    subscribePwaInstall,
    getPwaInstallSnapshot,
    getPwaInstallServerSnapshot,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  const startInstall = async () => {
    if (install.installed || install.ios || !install.installPromptReady) {
      setDialogOpen(true);
      return;
    }

    setInstalling(true);
    const outcome = await promptPwaInstall().catch(() => "unavailable" as const);
    setInstalling(false);
    if (outcome === "unavailable") setDialogOpen(true);
  };

  const label = install.installed
    ? "App installed"
    : installing
      ? "Opening installer…"
      : install.ios
        ? "Install on iPhone"
        : "Install app";

  return (
    <>
      {variant === "card" ? (
        <section className="mb-4 overflow-hidden rounded-2xl border border-gold/30 bg-gold/5">
          <div className="flex items-center gap-2 border-b border-gold/20 px-5 py-4">
            <Smartphone className="h-4 w-4 text-gold" />
            <h2 className="text-sm font-semibold text-foreground">Install Language Threshold</h2>
          </div>
          <div className="px-5 py-4">
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              {install.installed
                ? "Language Threshold is running as an installed app on this device."
                : "Add it to your Home Screen for a full-screen app window and faster return to practice."}
            </p>
            <button
              type="button"
              onClick={() => void startInstall()}
              disabled={installing}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-midnight transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {install.installed ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {label}
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => void startInstall()}
          disabled={installing}
          className="mt-3 flex min-h-12 w-full items-center justify-between rounded-xl border-2 border-gold/40 bg-gold/10 px-4 py-3 text-left transition-colors hover:border-gold/70 disabled:cursor-wait disabled:opacity-60"
        >
          <span className="flex items-center gap-2.5 text-sm font-semibold text-gold">
            {install.installed ? (
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
            ) : (
              <Download className="h-4 w-4" strokeWidth={1.8} />
            )}
            {label}
          </span>
          <span className="max-w-[46%] text-right text-[10px] leading-tight text-muted-foreground">
            {install.installed ? "Home Screen app is ready" : "Home Screen · full-screen app"}
          </span>
        </button>
      )}

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-3xl border-gold/35">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {install.installed
                ? "Language Threshold is installed"
                : install.ios
                  ? "Install on your iPhone"
                  : "Install Language Threshold"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-left leading-relaxed">
                {install.installed ? (
                  <p>Open Language Threshold from its icon on your Home Screen or app launcher.</p>
                ) : install.ios ? (
                  <ol className="space-y-3">
                    <li className="flex gap-3">
                      <span className="font-mono text-gold">1</span>
                      <span>
                        Open <strong className="text-foreground">app.languagethreshold.com</strong>{" "}
                        in Safari if you are viewing it inside another app.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-mono text-gold">2</span>
                      <span className="flex items-center gap-1.5">
                        Tap Share <Share className="inline h-4 w-4 text-foreground" />.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-mono text-gold">3</span>
                      <span>Choose Add to Home Screen.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-mono text-gold">4</span>
                      <span>Turn on Open as Web App if shown, then tap Add.</span>
                    </li>
                  </ol>
                ) : (
                  <p>
                    Your browser did not offer the one-tap installer. Open its menu and choose
                    Install app or Add to Home Screen. Safari on iPhone uses the Share menu.
                  </p>
                )}
                {!install.installed && (
                  <p className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-xs">
                    Installing changes how the app opens; it does not change your account, progress,
                    microphone, voice quality, or AI response speed.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            {install.ios && !install.installed && (
              <AlertDialogAction asChild>
                <a href="https://app.languagethreshold.com" target="_blank" rel="noreferrer">
                  Open app link <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
