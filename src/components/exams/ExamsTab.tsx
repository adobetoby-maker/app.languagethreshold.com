import { useEffect } from "react";
import { useApp } from "@/state/app-state";
import { useAuth } from "@/state/auth-state";
import { examsLocation } from "@/lib/exam-navigation";

/** Compatibility for an older saved active tab; assessment UI lives on /exams. */
export function ExamsTab() {
  const { state, profileReadyUserId } = useApp();
  const { user, loading } = useAuth();
  const ready = state.hydrated && !loading && (!user || profileReadyUserId === user.id);
  const destination = examsLocation({
    moduleId: state.activeModuleId,
    target: state.selectedLanguage,
    native: state.nativeLanguage,
  });
  useEffect(() => {
    if (!ready) return;
    // Let the incoming-link bridge apply the current route first. An older
    // cached Exams tab must never replace an explicit incoming Reader/lesson link.
    const frame = requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.has("tab") && params.get("tab") !== "exams") return;
      window.location.replace(destination);
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, destination]);
  return (
    <section data-private-assessment role="status" className="mx-auto max-w-2xl p-5">
      <p>Opening Exams…</p>
      {ready && (
        <a
          className="mt-3 inline-flex min-h-11 items-center text-gold underline"
          href={destination}
        >
          Open Exams
        </a>
      )}
    </section>
  );
}
