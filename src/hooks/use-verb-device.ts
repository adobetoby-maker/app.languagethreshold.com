// Built by TAC — 2026-10-21
import { useCallback, useEffect, useRef, useState } from "react";
import { useLearnerDeviceStore } from "@/hooks/use-learner-device-store";
import {
  UNHYDRATED_DEVICE,
  hydrateDeviceBox,
  updateDeviceBox,
  type DeviceBox,
  type VerbDeviceState,
} from "@/lib/verb-games/device";

/**
 * Verb Games device state (store kind "verb-games"). The store is keyed by account and reads null
 * until its mount effect has run, so state hydrates in an effect keyed on the store object, resets
 * when the store changes, and ignores updates until hydration has finished.
 */
export function useVerbDevice(): { state: VerbDeviceState; update(fn: (s: VerbDeviceState) => VerbDeviceState): void } {
  const store = useLearnerDeviceStore("verb-games");
  const [view, setView] = useState<{ owner: typeof store | null; box: DeviceBox }>({ owner: null, box: UNHYDRATED_DEVICE });
  const boxRef = useRef<DeviceBox>(UNHYDRATED_DEVICE);
  const storeRef = useRef<typeof store | null>(null);

  useEffect(() => {
    boxRef.current = UNHYDRATED_DEVICE;
    storeRef.current = store;
    const box = hydrateDeviceBox(store.read());
    boxRef.current = box;
    setView({ owner: store, box });
    return () => {
      if (storeRef.current === store) {
        storeRef.current = null;
        boxRef.current = UNHYDRATED_DEVICE;
      }
    };
  }, [store]);

  const update = useCallback((fn: (s: VerbDeviceState) => VerbDeviceState) => {
    const current = storeRef.current;
    if (!current) return;
    const next = updateDeviceBox(boxRef.current, fn);
    if (next === boxRef.current) return;
    boxRef.current = next;
    current.write(next.state);
    setView({ owner: current, box: next });
  }, []);

  // Until this store's effect has run, show empty rather than another account's state.
  const state = view.owner === store ? view.box.state : UNHYDRATED_DEVICE.state;
  return { state, update };
}
