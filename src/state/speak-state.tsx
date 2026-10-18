import { useLearnerDeviceStore } from "@/hooks/use-learner-device-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Language } from "./app-state";

export type SpeakRole = "user" | "ai";

export interface SpeakTurn {
  id: string;
  role: SpeakRole;
  text: string;
  createdAt: number;
  tip?: string | null;
}

interface SpeakCtx {
  turns: SpeakTurn[];
  exchanges: number;
  totalSeconds: number;
  addTurn: (role: SpeakRole, text: string, tip?: string | null) => SpeakTurn;
  appendToTurn: (id: string, chunk: string) => void;
  setTipFor: (id: string, tip: string | null) => void;
  incrementExchanges: () => void;
  addSeconds: (n: number) => void;
  clear: () => void;
}

const Ctx = createContext<SpeakCtx | null>(null);

interface LangStore {
  turns: SpeakTurn[];
  exchanges: number;
  totalSeconds: number;
}
type Store = Record<string, LangStore>;

function emptyLang(): LangStore {
  return { turns: [], exchanges: 0, totalSeconds: 0 };
}

export function SpeakProvider({ children, language }: { children: ReactNode; language: Language }) {
  const device = useLearnerDeviceStore("speak");
  const [store, setStore] = useState<Store>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = device.read();
      if (raw) {
        const parsed = raw as Record<string, LangStore | SpeakTurn[]>;
        // Migrate v0 (just turns array) → v1
        const next: Store = {};
        for (const k of Object.keys(parsed)) {
          const v = parsed[k];
          if (Array.isArray(v)) {
            next[k] = { turns: v, exchanges: 0, totalSeconds: 0 };
          } else if (v && typeof v === "object") {
            next[k] = {
              turns: Array.isArray(v.turns) ? v.turns : [],
              exchanges: Number(v.exchanges) || 0,
              totalSeconds: Number(v.totalSeconds) || 0,
            };
          }
        }
        setStore(next);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [device]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      device.write(store);
    } catch {
      /* ignore */
    }
  }, [device, store, hydrated]);

  const lang = store[language] ?? emptyLang();

  const addTurn = useCallback(
    (role: SpeakRole, text: string, tip?: string | null) => {
      const turn: SpeakTurn = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role,
        text,
        createdAt: Date.now(),
        tip: tip ?? null,
      };
      setStore((s) => {
        const cur = s[language] ?? emptyLang();
        return { ...s, [language]: { ...cur, turns: [...cur.turns, turn] } };
      });
      return turn;
    },
    [language],
  );

  const appendToTurn = useCallback(
    (id: string, chunk: string) => {
      setStore((s) => {
        const cur = s[language] ?? emptyLang();
        return {
          ...s,
          [language]: {
            ...cur,
            turns: cur.turns.map((t) => (t.id === id ? { ...t, text: t.text + chunk } : t)),
          },
        };
      });
    },
    [language],
  );

  const setTipFor = useCallback(
    (id: string, tip: string | null) => {
      setStore((s) => {
        const cur = s[language] ?? emptyLang();
        return {
          ...s,
          [language]: {
            ...cur,
            turns: cur.turns.map((t) => (t.id === id ? { ...t, tip } : t)),
          },
        };
      });
    },
    [language],
  );

  const incrementExchanges = useCallback(() => {
    setStore((s) => {
      const cur = s[language] ?? emptyLang();
      return { ...s, [language]: { ...cur, exchanges: cur.exchanges + 1 } };
    });
  }, [language]);

  const addSeconds = useCallback(
    (n: number) => {
      if (n <= 0) return;
      setStore((s) => {
        const cur = s[language] ?? emptyLang();
        return {
          ...s,
          [language]: { ...cur, totalSeconds: cur.totalSeconds + n },
        };
      });
    },
    [language],
  );

  const clear = useCallback(() => {
    setStore((s) => ({ ...s, [language]: emptyLang() }));
  }, [language]);

  const value = useMemo(
    () => ({
      turns: lang.turns,
      exchanges: lang.exchanges,
      totalSeconds: lang.totalSeconds,
      addTurn,
      appendToTurn,
      setTipFor,
      incrementExchanges,
      addSeconds,
      clear,
    }),
    [
      lang.turns,
      lang.exchanges,
      lang.totalSeconds,
      addTurn,
      appendToTurn,
      setTipFor,
      incrementExchanges,
      addSeconds,
      clear,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSpeak() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSpeak must be used inside SpeakProvider");
  return c;
}
