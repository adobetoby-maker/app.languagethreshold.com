import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";

test("account changes discard the previous speaker's selected word and sentence", async () => {
  const dir = mkdtempSync(resolve("node_modules/.cache/pocket-owner-"));
  try {
    const outfile = join(dir, "dock.mjs");
    await build({
      stdin: {
        contents: `export { SpeakTutorDock } from './src/components/speak/SpeakTutorDock'; export { owner } from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile,
      bundle: true,
      platform: "node",
      format: "esm",
      external: ["react", "react/jsx-runtime"],
      logLevel: "silent",
      plugins: [
        {
          name: "account-boundary",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|lucide-react|@\/state\/|@\/lib\/(curriculum-vocabulary|speaking-client))/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
            export const owner = { id: 'account-a' };
            export const useAuth = () => ({user: owner.id ? {id:owner.id} : null, isCurrentUser:id=>id===owner.id});
            export const useApp = () => ({state:{selectedLanguage:'Spanish',nativeLanguage:'English',activeModuleId:'roofing',userVocab:[]}, dispatch:()=>{}});
            export const useFlashcards = () => ({addCard:()=>{}});
            export const ChevronLeft=()=>null,ChevronRight=()=>null,BookmarkPlus=()=>null,X=()=>null;
            export const curriculumVocabulary=()=>[],speakingRequestHeaders=()=>({});
          `,
            }));
          },
        },
      ],
    });
    const { SpeakTutorDock, owner } = await import(outfile);
    const selection = {
      owner: "account-a",
      word: "mapa",
      sentence: "Mira mi mapa.",
      scope: "free",
      id: 1,
    };
    const props = { scope: "free", sentence: "", canAsk: true, selection, children: null };
    const first = SpeakTutorDock(props);
    assert.equal(first.props.selection, selection);
    owner.id = "account-b";
    const second = SpeakTutorDock(props);
    assert.notEqual(second.key, first.key);
    assert.equal(second.props.selection, null);
    owner.id = undefined;
    assert.equal(SpeakTutorDock(props).props.selection, null);
    const guestSelection = { ...selection, owner: undefined };
    assert.equal(
      SpeakTutorDock({ ...props, selection: guestSelection }).props.selection,
      guestSelection,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
