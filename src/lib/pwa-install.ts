export type PwaInstallOutcome = "accepted" | "dismissed" | "unavailable";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface PwaInstallSnapshot {
  installed: boolean;
  installPromptReady: boolean;
  ios: boolean;
}

const SERVER_SNAPSHOT: PwaInstallSnapshot = {
  installed: false,
  installPromptReady: false,
  ios: false,
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedDuringSession = false;
let initialized = false;
let snapshot = SERVER_SNAPSHOT;
const subscribers = new Set<() => void>();

export function isIosDevice(
  userAgent: string,
  platform = "",
  maxTouchPoints = 0,
): boolean {
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function buildSnapshot(): PwaInstallSnapshot {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;

  return {
    installed: installedDuringSession || detectStandalone(),
    installPromptReady: deferredPrompt !== null,
    ios: isIosDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints),
  };
}

function publishSnapshot(): void {
  snapshot = buildSnapshot();
  subscribers.forEach((subscriber) => subscriber());
}

export function initializePwaInstall(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  snapshot = buildSnapshot();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    publishSnapshot();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installedDuringSession = true;
    publishSnapshot();
  });

  window.matchMedia("(display-mode: standalone)").addEventListener("change", publishSnapshot);
}

export function subscribePwaInstall(subscriber: () => void): () => void {
  initializePwaInstall();
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function getPwaInstallSnapshot(): PwaInstallSnapshot {
  return snapshot;
}

export function getPwaInstallServerSnapshot(): PwaInstallSnapshot {
  return SERVER_SNAPSHOT;
}

export async function promptPwaInstall(): Promise<PwaInstallOutcome> {
  if (!deferredPrompt) return "unavailable";

  const prompt = deferredPrompt;
  deferredPrompt = null;
  publishSnapshot();

  await prompt.prompt();
  const choice = await prompt.userChoice;
  if (choice.outcome === "accepted") {
    installedDuringSession = true;
    publishSnapshot();
  }
  return choice.outcome;
}
