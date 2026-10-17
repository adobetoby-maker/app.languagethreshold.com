import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { checkGate, type GateStatus } from "@/lib/ai-gate";
import { AiGateModal } from "@/components/AiGateModal";
import { useSubscription } from "@/state/subscription-state";

interface AiGateContextValue {
  /**
   * Call this BEFORE making any AI API request.
   * Either:
   *   - Runs fn() immediately if gate is open
   *   - Shows email modal, then runs fn() after capture
   *   - Shows paywall modal (fn is not run)
   */
  gated: (fn: () => void | Promise<void>) => void;
}

const AiGateContext = createContext<AiGateContextValue>({
  gated: (fn) => void fn(),
});

export function AiGateProvider({ children }: { children: ReactNode }) {
  const { isActive } = useSubscription();
  const [modalMode, setModalMode] = useState<GateStatus | null>(null);
  const pendingRef = useRef<(() => void | Promise<void>) | null>(null);

  const gated = useCallback(
    (fn: () => void | Promise<void>) => {
      const status = checkGate(isActive);

      if (status === "open") {
        void fn();
        return;
      }

      // Need to gate — hold the fn and show modal
      pendingRef.current = fn;
      setModalMode(status);
    },
    [isActive],
  );

  function handleEmailCaptured() {
    setModalMode(null);
    // Run the pending fn now that email is captured
    const fn = pendingRef.current;
    pendingRef.current = null;
    if (fn) void fn();
  }

  function handleClose() {
    setModalMode(null);
    pendingRef.current = null;
  }

  return (
    <AiGateContext.Provider value={{ gated }}>
      {children}
      {modalMode && modalMode !== "open" && (
        <AiGateModal
          mode={modalMode === "email-required" ? "email" : "paywall"}
          onEmailCaptured={handleEmailCaptured}
          onClose={handleClose}
        />
      )}
    </AiGateContext.Provider>
  );
}

export function useAiGate() {
  return useContext(AiGateContext);
}
