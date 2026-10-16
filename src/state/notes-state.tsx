import { useLearnerDeviceStore } from "@/hooks/use-learner-device-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

export type Pane = "left" | "right";

export interface Annotation {
  id: string;
  textId: string; // library entry id
  pane: Pane;
  sentenceIndex: number;
  selectedText: string;
  noteText?: string; // undefined = pure highlight
  createdAt: number;
}

interface NotesState {
  annotations: Annotation[];
  hydrated: boolean;
}

type Action =
  | { type: "HYDRATE"; payload: Annotation[] }
  | { type: "ADD"; payload: Annotation }
  | { type: "UPDATE"; payload: { id: string; noteText: string } }
  | { type: "REMOVE"; payload: string };

function reducer(state: NotesState, action: Action): NotesState {
  switch (action.type) {
    case "HYDRATE":
      return { annotations: action.payload, hydrated: true };
    case "ADD":
      return { ...state, annotations: [...state.annotations, action.payload] };
    case "UPDATE":
      return {
        ...state,
        annotations: state.annotations.map((a) =>
          a.id === action.payload.id ? { ...a, noteText: action.payload.noteText } : a,
        ),
      };
    case "REMOVE":
      return { ...state, annotations: state.annotations.filter((a) => a.id !== action.payload) };
    default:
      return state;
  }
}

const Ctx = createContext<{
  annotations: Annotation[];
  add: (a: Omit<Annotation, "id" | "createdAt">) => Annotation;
  update: (id: string, noteText: string) => void;
  remove: (id: string) => void;
  forText: (textId: string) => Annotation[];
} | null>(null);

export function NotesProvider({ children }: { children: ReactNode }) {
  const device = useLearnerDeviceStore("notes");
  const [state, dispatch] = useReducer(reducer, { annotations: [], hydrated: false });

  useEffect(() => {
    try {
      const raw = device.read();
      if (raw) {
        const parsed = raw as Annotation[];
        if (Array.isArray(parsed)) dispatch({ type: "HYDRATE", payload: parsed });
        else dispatch({ type: "HYDRATE", payload: [] });
      } else {
        dispatch({ type: "HYDRATE", payload: [] });
      }
    } catch {
      dispatch({ type: "HYDRATE", payload: [] });
    }
  }, [device]);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      device.write(state.annotations);
    } catch {
      /* ignore quota errors */
    }
  }, [device, state.annotations, state.hydrated]);

  const add = useCallback((a: Omit<Annotation, "id" | "createdAt">) => {
    const full: Annotation = {
      ...a,
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
    };
    dispatch({ type: "ADD", payload: full });
    return full;
  }, []);

  const update = useCallback((id: string, noteText: string) => {
    dispatch({ type: "UPDATE", payload: { id, noteText } });
  }, []);

  const remove = useCallback((id: string) => {
    dispatch({ type: "REMOVE", payload: id });
  }, []);

  const forText = useCallback(
    (textId: string) => state.annotations.filter((a) => a.textId === textId),
    [state.annotations],
  );

  const value = useMemo(
    () => ({ annotations: state.annotations, add, update, remove, forText }),
    [state.annotations, add, update, remove, forText],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotes() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useNotes must be used inside NotesProvider");
  return c;
}
