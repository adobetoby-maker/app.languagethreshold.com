import type {} from "./watch-talk-fixture.types";
// Dev-server-only browser harness. No auth sessions, microphones, AI calls or learner records.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { registerPlugin } from "@capacitor/core";
import "../src/styles.css";
const listeners = new Map<string, (value: unknown) => void>();
const bridge = {
  context: null as null | { contextId: string },
  stops: 0,
  acknowledgements: 0,
  async start() {
    return { paired: true, installed: true };
  },
  async stop() {
    bridge.stops++;
    bridge.context = null;
  },
  async setContext(value: { contextId: string }) {
    bridge.context = value;
  },
  async acknowledge() {
    bridge.acknowledgements++;
  },
  async addListener(name: string, handler: (value: unknown) => void) {
    listeners.set(name, handler);
    return {
      async remove() {
        if (listeners.get(name) === handler) listeners.delete(name);
      },
    };
  },
};
registerPlugin("WatchTalk", { ios: () => bridge });
const { WatchTalkControl } = await import("../src/components/speak/WatchTalkControl");
Object.assign(window, {
  watchHarness: {
    emit(overrides: object = {}) {
      listeners.get("transcript")?.({
        contextId: bridge.context?.contextId,
        requestId: "f89b2e1a-754f-4c70-8bac-3e09c45889ff",
        text: "Hola desde mi reloj",
        createdAt: Date.now(),
        ...overrides,
      });
    },
    failure() {
      listeners.get("failure")?.({ message: "Watch transcription timed out. Try a shorter turn." });
    },
    status() {
      return { context: bridge.context, stops: bridge.stops, acks: bridge.acknowledgements };
    },
  },
});
export function Harness() {
  const [ready, setReady] = useState(true);
  const [mission, setMission] = useState(1);
  const [turns, setTurns] = useState<string[]>([]);
  return (
    <main style={{ maxWidth: 600, margin: "auto", padding: 16 }}>
      <h1>Watch bridge test fixture</h1>
      <button onClick={() => setReady(!ready)}>Toggle partner speaking</button>
      <button onClick={() => setMission(mission + 1)}>Change mission</button>
      <WatchTalkControl
        key={mission}
        ready={ready}
        title="Spanish practice"
        locale="es-MX"
        onTurn={(text) => {
          setTurns([...turns, text]);
          setReady(false);
        }}
      />
      <output data-testid="received-turns">{JSON.stringify(turns)}</output>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
