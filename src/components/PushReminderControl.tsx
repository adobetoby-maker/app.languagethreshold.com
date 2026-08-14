import { useEffect, useMemo, useState } from "react";
import { BellOff, BellRing, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { buildLearningReminderContext } from "@/lib/learning-reminders";
import {
  pushApi,
  rememberPushEnabled,
  type PushSettingsResponse,
  urlBase64ToUint8Array,
} from "@/lib/push-api";
import { LANGUAGES, useApp, type Language } from "@/state/app-state";
import { useAuth } from "@/state/auth-state";

function deviceSupportsPush() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function isIos() {
  return typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function timezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function subscriptionShape(subscription: PushSubscription) {
  const value = subscription.toJSON();
  if (!value.endpoint || !value.keys?.p256dh || !value.keys.auth) {
    throw new Error("This browser returned an incomplete push subscription.");
  }
  return { endpoint: value.endpoint, keys: { p256dh: value.keys.p256dh, auth: value.keys.auth } };
}

export function PushReminderControl() {
  const { state, dispatch } = useApp();
  const { session, user } = useAuth();
  const context = useMemo(() => buildLearningReminderContext(state), [state]);
  const [settings, setSettings] = useState<PushSettingsResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supported = deviceSupportsPush();
  const reminderLanguage = state.practiceReminderLanguage ?? state.selectedLanguage;

  useEffect(() => {
    if (!session) {
      setSettings(null);
      return;
    }
    let active = true;
    pushApi<PushSettingsResponse>()
      .then((value) => {
        if (!active) return;
        setSettings(value);
        if (user) rememberPushEnabled(user.id, value.enabled);
      })
      .catch((error: unknown) => {
        if (active)
          setMessage(error instanceof Error ? error.message : "Reminders are unavailable.");
      });
    return () => {
      active = false;
    };
  }, [session, user]);

  async function enable() {
    if (!session || !user) {
      setMessage("Sign in first so reminders can follow you across devices.");
      return;
    }
    if (!supported) {
      setMessage("Push notifications are not available in this browser.");
      return;
    }
    if (isIos() && !isStandalone()) {
      setMessage(
        "On iPhone, install Language Threshold on your Home Screen, open the app, then enable reminders here.",
      );
      return;
    }
    if (!settings?.publicKey || !settings.configured) {
      setMessage("Push delivery is not configured yet.");
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error(
          "Notifications were not allowed. You can change this in your device settings.",
        );
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(settings.publicKey),
        }));
      await pushApi<{ ok: true }>({
        method: "POST",
        body: JSON.stringify({
          action: "subscribe",
          subscription: subscriptionShape(subscription),
          reminderHour: settings.reminderHour,
          timezone: timezone(),
          context,
        }),
      });
      const next = { ...settings, enabled: true, timezone: timezone() };
      setSettings(next);
      rememberPushEnabled(user.id, true);
      toast(`${reminderLanguage} reminders are on`, {
        description: `Daily at ${formatHour(next.reminderHour)}.`,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not enable reminders.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!user) return;
    setBusy(true);
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await pushApi<{ ok: true }>({
          method: "POST",
          body: JSON.stringify({ action: "unsubscribe", endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      } else {
        await pushApi<{ ok: true }>({
          method: "POST",
          body: JSON.stringify({
            action: "preferences",
            enabled: false,
            reminderHour: settings?.reminderHour ?? 19,
            timezone: timezone(),
            context,
          }),
        });
      }
      setSettings((current) => (current ? { ...current, enabled: false } : current));
      rememberPushEnabled(user.id, false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not turn reminders off.");
    } finally {
      setBusy(false);
    }
  }

  async function changeHour(reminderHour: number) {
    if (!settings || !user) return;
    setSettings({ ...settings, reminderHour });
    if (!settings.enabled) return;
    try {
      await pushApi<{ ok: true }>({
        method: "POST",
        body: JSON.stringify({
          action: "preferences",
          enabled: true,
          reminderHour,
          timezone: timezone(),
          context,
        }),
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not change reminder time.");
    }
  }

  return (
    <section className="rounded-2xl border border-cyan-400/25 bg-cyan-400/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-300/10">
          {settings?.enabled ? (
            <BellRing className="h-4.5 w-4.5 text-cyan-200" />
          ) : (
            <BellOff className="h-4.5 w-4.5 text-cyan-200" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">
            Daily practice reminder
          </p>
          <h2 className="mt-1 font-serif text-xl text-foreground">
            {settings?.enabled ? "Your countdown is active" : "Keep the trip in sight"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            One useful notification combines your nearest departure, selected speaking topic, and
            exact lessons left.
          </p>

          {session && (
            <label className="mt-4 block text-xs text-muted-foreground">
              Remind me to speak
              <select
                value={reminderLanguage}
                onChange={(event) =>
                  dispatch({
                    type: "SET_REMINDER_LANGUAGE",
                    payload: event.target.value as Language,
                  })
                }
                className="ml-2 min-h-11 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {LANGUAGES.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!session ? (
            <p className="mt-4 rounded-xl border border-border/60 bg-background/35 p-3 text-xs text-muted-foreground">
              Sign in to turn on reminders. Your dates and progress stay tied to your account.
            </p>
          ) : settings?.enabled ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="text-xs text-muted-foreground">
                Remind me at
                <select
                  value={settings.reminderHour}
                  onChange={(event) => void changeHour(Number(event.target.value))}
                  className="ml-2 min-h-11 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  {Array.from({ length: 15 }, (_, index) => index + 7).map((hour) => (
                    <option key={hour} value={hour}>
                      {formatHour(hour)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => void disable()}
                disabled={busy}
                className="min-h-11 rounded-xl border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Turn off
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void enable()}
              disabled={busy || !settings}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-45"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BellRing className="h-4 w-4" />
              )}
              Allow practice reminders
            </button>
          )}

          {isIos() && !isStandalone() && (
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-200" />
              iPhone notifications work after you add the app to your Home Screen and open it there.
            </p>
          )}
          {message && <p className="mt-3 text-xs leading-relaxed text-amber-300">{message}</p>}
        </div>
      </div>
    </section>
  );
}

function formatHour(hour: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(new Date(2020, 0, 1, hour));
}
