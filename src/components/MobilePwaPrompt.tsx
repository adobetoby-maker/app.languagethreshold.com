import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useApp } from "@/state/app-state";
import { PwaInstallControl } from "./PwaInstallControl";

const DISMISSED_UNTIL_KEY = "lt.pwa-install.dismissed-until.v1";
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

/** A phone-browser suggestion; installed PWAs and native shells already have the app. */
export function MobilePwaPrompt() {
  const { state } = useApp();
  const [eligible, setEligible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    const mobile = window.matchMedia("(max-width: 1023px) and (pointer: coarse)");
    const update = () => setEligible(mobile.matches);
    update();
    mobile.addEventListener("change", update);
    try {
      setDismissed(Number(localStorage.getItem(DISMISSED_UNTIL_KEY)) > Date.now());
    } catch {
      // The suggestion can still be dismissed for this visit when storage is unavailable.
    }
    return () => mobile.removeEventListener("change", update);
  }, []);

  if (!eligible || dismissed || !state.hydrated || !state.onboardingComplete) return null;

  return (
    <PwaInstallControl
      variant="banner"
      onDismiss={() => {
        setDismissed(true);
        try {
          localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + SNOOZE_MS));
        } catch {
          // Dismissal remains effective for this visit.
        }
      }}
    />
  );
}
