import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { LegacyLibraryRecovery } from "../../../src/components/library/LegacyLibraryRecovery";
import { createLibraryDevice } from "../../../src/lib/library-device";
import { LEGACY_LIBRARY_KEY } from "../../../src/lib/legacy-library";
import { Auth, Library } from "./bindings";
import type { LibraryEntry } from "../../../src/state/library-state";
const cloud = new Map<string, LibraryEntry>();
const remote = {
  load: async () => [...cloud.values()],
  put: async (entry: LibraryEntry) => {
    cloud.set(entry.id, entry);
    return entry;
  },
  remove: async (id: string) => {
    cloud.delete(id);
  },
};
export function Fixture() {
  const [actor, setActor] = useState("fictional-a");
  const [online, setOnline] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [cloudCount, setCloudCount] = useState(0);
  const live = useRef(actor);
  live.current = actor;
  const device = useMemo(
    () =>
      createLibraryDevice({
        actor,
        storage: localStorage,
        remote: null,
        isCurrent: () => live.current === actor,
      }),
    // The fixture models remount/reload after a device write, without remounting the outer controls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actor, generation],
  );
  const state = useSyncExternalStore(device.subscribe, device.getSnapshot);
  async function sync() {
    const syncing = createLibraryDevice({
      actor,
      storage: localStorage,
      remote,
      isCurrent: () => live.current === actor,
    });
    await syncing.sync();
    setCloudCount(cloud.size);
    setGeneration((n) => n + 1);
  }
  return (
    <main className="mx-auto max-w-md space-y-4 p-5">
      <h1>Local fictional Reader recovery fixture</h1>
      <p>
        No hosted account, credentials, real learner or network sync. Simulated cloud is memory
        only.
      </p>
      <p>
        Account: {actor} · {online ? "Simulated online" : "Simulated offline"}
      </p>
      <button
        className="border p-3"
        onClick={() => setActor(actor === "fictional-a" ? "fictional-b" : "fictional-a")}
      >
        Switch fictional account
      </button>
      <button
        className="border p-3"
        onClick={() => {
          localStorage.setItem(
            LEGACY_LIBRARY_KEY,
            JSON.stringify([
              {
                id: "old-multichapter",
                title: "Fictional crew briefing",
                subtitle: "QA only",
                language: "Spanish",
                targetLabel: "Español",
                section: "custom",
                available: true,
                sentences: [{ en: "Morning briefing", target: "Reunión de la mañana" }],
                chapters: [
                  {
                    title: "Morning",
                    sentences: [{ en: "Morning briefing", target: "Reunión de la mañana" }],
                  },
                  { title: "Afternoon", sentences: [{ en: "End of day", target: "Fin del día" }] },
                ],
              },
            ]),
          );
          setGeneration((n) => n + 1);
        }}
      >
        Load fictional older save
      </button>
      <Auth.Provider value={{ user: { id: actor, email: actor + "@example.invalid" } }}>
        <Library.Provider
          value={{
            recoverOlderLibrary: (confirmed: boolean) => {
              const count = device.recoverLegacy(confirmed);
              return count;
            },
          }}
        >
          <LegacyLibraryRecovery key={actor + generation} />
        </Library.Provider>
      </Auth.Provider>
      <p>
        Device texts: {state.books.length} · Waiting to sync: {state.pending.length} · Simulated
        cloud texts: {cloudCount}
      </p>
      {state.books.map((entry) => (
        <article key={entry.id}>
          <h2>{entry.title}</h2>
          {entry.chapters?.map((chapter, index) => (
            <section key={index}>
              <h3>{chapter.title}</h3>
              {chapter.sentences.map((sentence, i) => (
                <p key={i}>
                  {sentence.target} / {sentence.en}
                </p>
              ))}
            </section>
          ))}
        </article>
      ))}
      <button
        className="border p-3"
        onClick={() => {
          setOnline(true);
          void sync();
        }}
      >
        Reconnect simulated cloud
      </button>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
