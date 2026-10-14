/** Supabase auth callbacks run under its session lock; profile reads must run later. */
export function createDeferredAuthSync<T>({
  reset,
  load,
  apply,
}: {
  reset: () => void;
  load: (userId: string) => Promise<T>;
  apply: (userId: string, data: T) => void;
}) {
  let sequence = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    handle(session: { user: { id: string } } | null) {
      const current = ++sequence;
      if (timer) clearTimeout(timer);
      timer = null;
      reset();
      const userId = session?.user.id;
      if (!userId) return;
      timer = setTimeout(() => {
        timer = null;
        void load(userId)
          .then((data) => {
            if (current === sequence) apply(userId, data);
          })
          .catch(() => {
            // Leave cloud writes disabled when the profile could not be read.
          });
      }, 0);
    },
    dispose() {
      sequence++;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
