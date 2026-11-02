import { useEffect, useRef, useState } from "react";

const OVERLAYS = "lt.openOverlays";
let sequence = 0;
let pendingBack: Promise<void> | null = null;

function removeCurrentStep() {
  pendingBack = new Promise<void>((resolve) => {
    const finish = () => {
      window.removeEventListener("popstate", finish);
      window.clearTimeout(timer);
      pendingBack = null;
      resolve();
    };
    const timer = window.setTimeout(finish, 500);
    window.addEventListener("popstate", finish, { once: true });
    window.history.back();
  });
}

/** Give transient panels a same-page Back step, preserving the router's state. */
export function useOverlayHistory(open: boolean, onDismiss: () => void) {
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    if (!open || typeof window === "undefined" || !window.history?.pushState) return;
    const id = `overlay-${Date.now()}-${++sequence}`;
    const url = window.location.href;
    let active = true;
    let pushed = false;
    let popped = false;
    const onPop = () => {
      const stack = window.history.state?.[OVERLAYS];
      if (pushed && (!Array.isArray(stack) || !stack.includes(id))) {
        popped = true;
        dismiss.current();
      }
    };
    // Strict Mode's trial effect must not create a phantom history entry.
    const onKey = (event: KeyboardEvent) => {
      const stack = window.history.state?.[OVERLAYS];
      if (event.key === "Escape" && !event.defaultPrevented && stack?.at(-1) === id) {
        event.preventDefault();
        dismiss.current();
      }
    };
    queueMicrotask(async () => {
      if (pendingBack) await pendingBack;
      if (!active) return;
      const state = window.history.state ?? {};
      const stack = Array.isArray(state[OVERLAYS]) ? state[OVERLAYS] : [];
      window.history.pushState({ ...state, [OVERLAYS]: [...stack, id] }, "", url);
      pushed = true;
      window.addEventListener("popstate", onPop);
      window.addEventListener("keydown", onKey);
    });
    return () => {
      active = false;
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      const stack = window.history.state?.[OVERLAYS];
      if (!pushed || popped || !Array.isArray(stack) || !stack.includes(id)) return;
      if (window.location.href === url && stack.at(-1) === id) {
        removeCurrentStep();
      } else {
        // Navigation already happened, or a child panel owns the current step.
        window.history.replaceState(
          { ...window.history.state, [OVERLAYS]: stack.filter((item: string) => item !== id) },
          "",
        );
      }
    };
  }, [open]);
}

/** Support both controlled and trigger-owned Radix roots with the same exit behavior. */
export function useOverlayState(props: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(props.defaultOpen ?? false);
  const open = props.open ?? internalOpen;
  const onOpenChange = (next: boolean) => {
    if (props.open === undefined) setInternalOpen(next);
    props.onOpenChange?.(next);
  };
  useOverlayHistory(open, () => onOpenChange(false));
  return { open, onOpenChange };
}
