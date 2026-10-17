import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/state/auth-state";
import { supabase } from "@/integrations/supabase/client";
import { createLtAnalytics, type LtAnalytics } from "@/lib/lt-analytics";

export function useFieldPrepAnalytics(): LtAnalytics {
  const { user, isCurrentUser } = useAuth();
  const actor = user?.id ?? null;
  const instance = useRef<LtAnalytics | null>(null);
  useEffect(() => {
    let mounted = true;
    const current = () => mounted && (actor === null || isCurrentUser(actor));
    const analytics = createLtAnalytics({
      isCurrent: current,
      insert: async (table, payload, signal) => {
        const { data, error } = await supabase.auth.getSession();
        if (error || signal.aborted || !current() || (data.session?.user.id ?? null) !== actor)
          return { error: true };
        // Existing browser grants/RLS remain authoritative; never manufacture a role or ownership column.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await (supabase as any).from(table).insert(payload).abortSignal(signal);
      },
    });
    instance.current = analytics;
    return () => {
      mounted = false;
      analytics.dispose();
      if (instance.current === analytics) instance.current = null;
    };
  }, [actor, isCurrentUser]);
  return useMemo(
    () => ({
      fieldPrepSession: (...args) =>
        instance.current?.fieldPrepSession(...args) ?? Promise.resolve(false),
      appEvent: (...args) => instance.current?.appEvent(...args) ?? Promise.resolve(false),
      submitFeedback: (...args) =>
        instance.current?.submitFeedback(...args) ?? Promise.resolve(false),
      dispose: () => instance.current?.dispose(),
    }),
    [],
  );
}
