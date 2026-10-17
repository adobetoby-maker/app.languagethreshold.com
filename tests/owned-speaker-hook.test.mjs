import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));

test("actual speaker hook and TTS wrapper keep cleanup within the owning surface, actor and scope", async () => {
  const dir = mkdtempSync(resolve("node_modules/.cache/owned-speaker-"));
  const old = { window: globalThis.window, utterance: globalThis.SpeechSynthesisUtterance };
  const utterances = [];
  let cancellations = 0;
  globalThis.window = {
    speechSynthesis: {
      cancel() {
        cancellations++;
      },
      speak(u) {
        utterances.push(u);
      },
    },
  };
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  try {
    const outfile = join(dir, "hook.mjs");
    await build({
      stdin: {
        contents: `export {useOwnedSpeaker} from './src/hooks/use-owned-speaker';export {controls} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
      plugins: [
        {
          name: "speaker-host",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|@\/state\/auth-state|@\/lib\/(mission-tts|voices|pwa-install)|sonner)$/,
              },
              () => ({ path: "host", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `export const controls={actor:'a',host:null};const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);export function useRef(initial){const h=controls.host,i=h.cursor++;if(!(i in h.slots))h.slots[i]={current:initial};return h.slots[i];}export function useCallback(fn,deps){const h=controls.host,i=h.cursor++,old=h.slots[i];if(!old||changed(old.deps,deps))h.slots[i]={deps,fn};return h.slots[i].fn;}export function useEffect(fn,deps){const h=controls.host,i=h.cursor++,old=h.slots[i];if(!old||changed(old.deps,deps))h.effects.push(()=>{old?.cleanup?.();h.slots[i]={deps,cleanup:fn()};});}const isCurrentUser=id=>controls.actor===id;export const useAuth=()=>({user:controls.actor?{id:controls.actor}:null,isCurrentUser});export const speakMissionTts=()=>Promise.resolve(),stopMissionTts=()=>{},getVoicesForLocale=()=>[{voiceURI:'default'}],configureUtterance=(u,locale)=>u.lang=locale,isIosDevice=()=>false,toast={warning:()=>{}};`,
            }));
          },
        },
      ],
    });
    const { useOwnedSpeaker, controls: c } = await import(outfile);
    const host = () => ({ slots: [], effects: [], cursor: 0 });
    const a = host(),
      b = host();
    const render = (h, scope) => {
      c.host = h;
      h.cursor = 0;
      const speak = useOwnedSpeaker(scope);
      for (const f of h.effects.splice(0)) f();
      return speak;
    };
    const unmount = (h) => {
      for (const s of h.slots) s?.cleanup?.();
      h.slots = [];
    };
    const speakA = render(a, "a"),
      speakB = render(b, "b");
    speakA("A private word", "en-US");
    const oldA = utterances.at(-1),
      oldEnd = oldA.onend;
    speakB("B private word", "en-US");
    const current = utterances.at(-1),
      end = current.onend,
      before = cancellations;
    unmount(a);
    assert.equal(cancellations, before, "old surface cleanup cannot stop newer generation");
    assert.equal(current.onend, end);
    oldEnd();
    assert.equal(current.onend, end);
    end();
    await tick();
    const stale = render(b, "old-locale");
    const newer = render(b, "new-locale");
    const count = utterances.length;
    stale("old locale", "en-US");
    assert.equal(utterances.length, count);
    newer("current locale", "en-US");
    assert.equal(utterances.length, count + 1);
    c.actor = "b";
    newer("old actor", "en-US");
    assert.equal(utterances.length, count + 1);
    unmount(b);
    speakA("unmounted", "en-US");
    assert.equal(utterances.length, count + 1);
    const guest = host();
    c.actor = null;
    const guestSpeak = render(guest, "guest");
    guestSpeak("Guest word", "en-US");
    const guestEnd = utterances.at(-1).onend;
    unmount(guest);
    guestEnd();
    await tick();
    const after = utterances.length;
    guestSpeak("late guest", "en-US");
    assert.equal(utterances.length, after);
  } finally {
    globalThis.window = old.window;
    globalThis.SpeechSynthesisUtterance = old.utterance;
    rmSync(dir, { recursive: true, force: true });
  }
});
