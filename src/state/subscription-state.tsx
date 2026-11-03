import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { promoActive } from "@/lib/reddit-offer";
import { useAuth } from "@/state/auth-state";

export type SubscriptionStatus = "active" | "trialing" | "canceled" | "none";

interface SubscriptionContextValue {
  status: SubscriptionStatus;
  loading: boolean;
  isActive: boolean;
  teamActive: boolean;
  promoExpiresAt: string | null;
  demoMode: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>("none");
  const [teamActive, setTeamActive] = useState(false);
  const [promoAccess, setPromoAccess] = useState<{
    userId: string;
    expiresAt: string | null;
  } | null>(null);
  const promoExpiresAt = promoAccess?.userId === user?.id ? (promoAccess?.expiresAt ?? null) : null;
  const [expiryTick, tick] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (userId: string | null) => {
    if (!userId) {
      setStatus("none");
      setTeamActive(false);
      setPromoAccess(null);
      setLoading(false);
      return;
    }
    try {
      const [{ data }, session] = await Promise.all([
        supabase.from("profiles").select("data").eq("id", userId).single(),
        supabase.auth.getSession(),
      ]);
      const s = (data?.data as Record<string, unknown>)?.subscription_status;
      setStatus(s === "active" || s === "trialing" || s === "canceled" ? s : "none");
      if (session.data.session?.access_token) {
        try {
          const headers = { Authorization: `Bearer ${session.data.session.access_token}` };
          const [team, promo] = await Promise.all([
            fetch("/api/team-entitlement", { headers })
              .then(async (r) => (r.ok ? ((await r.json()) as { active?: boolean }) : null))
              .catch(() => null),
            fetch("/api/reddit-offer", { headers })
              .then(async (r) =>
                r.ok ? ((await r.json()) as { redemption?: { expires_at?: string } | null }) : null,
              )
              .catch(() => null),
          ]);
          setTeamActive(team?.active === true);
          setPromoAccess({ userId, expiresAt: promo?.redemption?.expires_at ?? null });
        } catch {
          setTeamActive(false);
          setPromoAccess(null);
        }
      } else {
        setTeamActive(false);
        setPromoAccess(null);
      }
    } catch {
      setStatus("none");
      setTeamActive(false);
      setPromoAccess(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    load(user?.id ?? null);
  }, [user?.id, authLoading, load]);

  const refresh = useCallback(async () => {
    if (user?.id) await load(user.id);
  }, [user?.id, load]);

  useEffect(() => {
    if (!promoExpiresAt || !promoActive(promoExpiresAt)) return;
    const timer = setTimeout(
      () => tick((n) => n + 1),
      Math.min(2_147_483_647, Math.max(0, Date.parse(promoExpiresAt) - Date.now())),
    );
    return () => clearTimeout(timer);
  }, [promoExpiresAt, expiryTick]);
  // Preserve the existing public demo until the operator explicitly enables paid gating.
  const demoMode = import.meta.env.VITE_DEMO_MODE !== "false";
  const isActive =
    demoMode ||
    teamActive ||
    promoActive(promoExpiresAt) ||
    status === "active" ||
    status === "trialing";

  const value = useMemo<SubscriptionContextValue>(
    () => ({ status, loading, isActive, teamActive, promoExpiresAt, demoMode, refresh }),
    [status, loading, isActive, teamActive, promoExpiresAt, demoMode, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const fallback: SubscriptionContextValue = {
  status: "none",
  loading: false,
  isActive: false,
  teamActive: false,
  promoExpiresAt: null,
  demoMode: true,
  refresh: async () => {},
};

// eslint-disable-next-line react-refresh/only-export-components
export function useSubscription() {
  return useContext(Ctx) ?? fallback;
}
