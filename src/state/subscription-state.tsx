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
import { useAuth } from "@/state/auth-state";

export type SubscriptionStatus = "active" | "trialing" | "canceled" | "none";

interface SubscriptionContextValue {
  status: SubscriptionStatus;
  loading: boolean;
  isActive: boolean;
  teamActive: boolean;
  demoMode: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>("none");
  const [teamActive, setTeamActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (userId: string | null) => {
    if (!userId) {
      setStatus("none");
      setTeamActive(false);
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
          const response = await fetch("/api/team-entitlement", {
            headers: { Authorization: `Bearer ${session.data.session.access_token}` },
          });
          const result = (await response.json()) as { active?: boolean };
          setTeamActive(response.ok && result.active === true);
        } catch {
          setTeamActive(false);
        }
      } else {
        setTeamActive(false);
      }
    } catch {
      setStatus("none");
      setTeamActive(false);
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

  // Preserve the existing public demo until the operator explicitly enables paid gating.
  const demoMode = import.meta.env.VITE_DEMO_MODE !== "false";
  const isActive = demoMode || teamActive || status === "active" || status === "trialing";

  const value = useMemo<SubscriptionContextValue>(
    () => ({ status, loading, isActive, teamActive, demoMode, refresh }),
    [status, loading, isActive, teamActive, demoMode, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const fallback: SubscriptionContextValue = {
  status: "none",
  loading: false,
  isActive: false,
  teamActive: false,
  demoMode: true,
  refresh: async () => {},
};

// eslint-disable-next-line react-refresh/only-export-components
export function useSubscription() {
  return useContext(Ctx) ?? fallback;
}
