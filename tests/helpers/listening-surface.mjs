// Drives a real component that reads target-language text aloud, with the real
// useListeningSpeaker + useOwnedPlayback hooks and the real listening rules
// (src/lib/listening-audio.ts). Only React itself, the account, the speech context, the audio
// router and the list of installed voices are stand-ins, so a test can read exactly what a tap
// asked the router to play, and whether leaving the item, the session or the account stops it.
import { build } from "esbuild";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

/** A stand-in `react` and JSX runtime that `createHost` renders and re-renders. */
const REACT = `
 export const R={instances:new Map(),current:null,effects:[],dirty:false,seen:new Set(),path:''};
 const changed=(a,b)=>!a||!b||a.length!==b.length||a.some((v,i)=>v!==b[i]);
 const slot=()=>{const inst=R.current;return [inst,inst.cursor++];};
 export function useState(initial){const [inst,i]=slot();if(!(i in inst.slots)){const cell={value:typeof initial==='function'?initial():initial};cell.set=v=>{const next=typeof v==='function'?v(cell.value):v;if(next!==cell.value){cell.value=next;R.dirty=true;}};inst.slots[i]=cell;}return [inst.slots[i].value,inst.slots[i].set];}
 export function useRef(initial){const [inst,i]=slot();if(!(i in inst.slots))inst.slots[i]={current:initial};return inst.slots[i];}
 export function useMemo(fn,deps){const [inst,i]=slot(),old=inst.slots[i];if(!old||changed(old.deps,deps))inst.slots[i]={deps,value:fn()};return inst.slots[i].value;}
 export const useCallback=(fn,deps)=>useMemo(()=>fn,deps);
 export function useEffect(fn,deps){const [inst,i]=slot(),old=inst.slots[i];if(!old||!deps||changed(old.deps,deps))R.effects.push(()=>{old?.cleanup?.();const cell={deps,effect:true};inst.slots[i]=cell;cell.cleanup=fn();});}
 export const useLayoutEffect=useEffect,useSyncExternalStore=(subscribe,snapshot)=>snapshot(),memo=component=>component;
 export function createContext(value){const ctx={value,stack:[]};ctx.Provider={provider:ctx};return ctx;}
 export const useContext=ctx=>ctx.stack.length?ctx.stack.at(-1):ctx.value;
 export const Fragment='fragment',jsx=(type,props,key)=>({type,props:props??{},key}),jsxs=jsx;
`;

/** The account, the speech context, the audio router and the device's voices, set by the test. */
const LISTENING = `
 import { planListening } from './src/lib/listening-audio.ts';
 export const L={actor:'a',jobs:[],issues:[],played:[],voices:[{voiceURI:'installed',lang:'es-MX'}],voiceListeners:new Set(),
  speech:{accent:'es-CR',rate:1,voiceURI:null,source:'hd',gender:'woman',fallback:false}};
 const isCurrentUser=id=>L.actor===id;
 export const useAuth=()=>({user:L.actor?{id:L.actor}:null,isCurrentUser});
 export const ACCENTS_BY_LANGUAGE={Spanish:[{code:'es-CR'},{code:'es-MX'}],French:[{code:'fr-FR'}],English:[{code:'en-US'}],Japanese:[{code:'ja-JP'}],Chinese:[{code:'zh-CN'}]};
 const listeningPlan=locale=>{const s=L.speech;return planListening({locale:locale??s.accent,learningLocale:s.accent,source:s.source,gender:s.gender,voiceURI:s.voiceURI,signedIn:L.actor!==null,deviceFallback:s.fallback});};
 // Stable identities, like the real provider's callbacks: a re-render alone never replays audio.
 const reportListeningIssue=(reason,retry)=>{L.issues.push({reason,retry});};
 const noteListeningPlayed=source=>{L.played.push(source);};
 export const useSpeech=()=>{const s=L.speech;return {accent:s.accent,rate:s.rate,voiceURI:s.voiceURI,voiceSettings:{listeningAudioSource:s.source,listeningGender:s.gender},listeningPlan,reportListeningIssue,noteListeningPlayed};};
 export const speakRemote=(text,locale,opts)=>{L.jobs.push({text,locale,opts});return Promise.resolve();};
 export const getVoicesForLocale=()=>L.voices,subscribeVoices=cb=>{L.voiceListeners.add(cb);return()=>L.voiceListeners.delete(cb);};
`;

const SHARED =
  /^(listening-surface|react|react\/jsx-runtime|lucide-react|@\/state\/(auth|speech)-state|@\/lib\/(tts|voices))$/;

/** Every icon the given files import, as plain host elements. */
function icons(files) {
  const names = new Set();
  for (const file of files) {
    const source = readFileSync(resolve(file), "utf8");
    for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from "lucide-react"/gs))
      for (const part of match[1].split(","))
        names.add(
          part
            .trim()
            .replace(/^type\s+\S+$/, "")
            .split(/\s+as\s+/)[0],
        );
  }
  names.delete("");
  return [...names].map((name) => `export const ${name}='icon-${name}';`).join("\n");
}

/** Renders an element tree the way React would, keeping each component's state by position/key. */
function createHost(R) {
  const instanceAt = (path) => {
    let inst = R.instances.get(path);
    if (!inst) R.instances.set(path, (inst = { slots: [], cursor: 0 }));
    inst.cursor = 0;
    R.seen.add(path);
    return inst;
  };
  const release = (inst) => {
    for (const cell of inst.slots) if (cell?.effect) cell.cleanup?.();
    inst.slots = [];
  };
  const walk = (node, path, parent, all) => {
    if (node == null || typeof node === "boolean") return;
    if (typeof node === "string" || typeof node === "number") {
      parent.text.push(String(node));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${path}/${child?.key ?? i}`, parent, all));
      return;
    }
    const { type, props } = node;
    if (typeof type === "function") {
      const where = `${path}/<${type.name}>`;
      R.current = instanceAt(where);
      // Like React: a component's effects run after its children's.
      const outer = R.effects;
      R.effects = [];
      const output = type(props);
      const own = R.effects;
      R.effects = outer;
      R.current = null;
      walk(output, where, parent, all);
      R.effects.push(...own);
    } else if (type?.provider) {
      type.provider.stack.push(props.value);
      walk(props.children, `${path}/provider`, parent, all);
      type.provider.stack.pop();
    } else if (type === "fragment") {
      walk(props.children, `${path}/fragment`, parent, all);
    } else {
      const element = { type, props, text: [], parent };
      all.push(element);
      walk(props.children, `${path}/${type}`, element, all);
      parent.text.push(element.text.join(""));
    }
  };
  let elements = [];
  const once = () => {
    R.dirty = false;
    R.seen = new Set();
    elements = [];
    walk(host.element, "root", { text: [] }, elements);
    // A component that left the tree is unmounted: its effects are cleaned up.
    for (const [path, inst] of [...R.instances])
      if (!R.seen.has(path)) {
        release(inst);
        R.instances.delete(path);
      }
    for (const effect of R.effects.splice(0)) effect();
  };
  const host = {
    element: null,
    /** Render, then keep rendering while effects or handlers changed state. */
    render(element = host.element) {
      host.element = element;
      once();
      for (let pass = 0; R.dirty && pass < 20; pass++) once();
      assert.equal(R.dirty, false, "the tree settles");
      return host;
    },
    unmount() {
      for (const inst of R.instances.values()) release(inst);
      R.instances.clear();
      elements = [];
    },
    all: (testid) => elements.filter((el) => el.props["data-testid"] === testid),
    where: (predicate) => elements.filter(predicate),
    one(testid) {
      const found = host.all(testid);
      assert.equal(found.length, 1, `exactly one ${testid}`);
      return found[0];
    },
    /** A button by its accessible name (aria-label, else its text). */
    button: (name) =>
      elements.find(
        (el) =>
          el.type === "button" && (el.props["aria-label"] ?? el.text.join("").trim()) === name,
      ),
    text: (el) => el.text.join(""),
    /** A tap, then the re-render React would do. */
    click(el) {
      assert.ok(el, "element to tap exists");
      assert.notEqual(el.props.disabled, true, "a disabled control cannot be tapped");
      el.props.onClick?.({ stopPropagation() {}, preventDefault() {} });
      return host.render();
    },
  };
  return host;
}

/**
 * Bundles `exports` from `entry` and hands back the module with a host to render it.
 * `standins` is the source of a module that replaces every import matched by `replace`
 * (the component's own data and state); the shared stand-ins above are always in place.
 */
export async function loadSurface({ entry, exports, files = [entry], replace, standins = "" }) {
  const dir = mkdtempSync(resolve("node_modules/.cache/listening-surface-"));
  try {
    const outfile = join(dir, "surface.mjs");
    await build({
      stdin: {
        contents: `export {${exports.join(",")}} from './${entry}';export {R,L,jsx} from 'listening-surface';export * as S from 'surface-standins';`,
        resolveDir: process.cwd(),
      },
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      jsx: "automatic",
      logLevel: "silent",
      plugins: [
        {
          name: "listening-surface",
          setup(b) {
            b.onResolve({ filter: SHARED }, () => ({ path: "shared", namespace: "surface" }));
            b.onResolve({ filter: /^surface-standins$/ }, () => ({
              path: "own",
              namespace: "surface",
            }));
            if (replace)
              b.onResolve({ filter: replace }, () => ({ path: "own", namespace: "surface" }));
            b.onLoad({ filter: /^shared$/, namespace: "surface" }, () => ({
              contents: `${REACT}\n${LISTENING}\n${icons(files)}`,
              resolveDir: process.cwd(),
            }));
            b.onLoad({ filter: /^own$/, namespace: "surface" }, () => ({
              contents: `export const controls={};\n${standins}`,
              resolveDir: process.cwd(),
            }));
          },
        },
      ],
    });
    const mod = await import(outfile);
    return { mod, R: mod.R, L: mod.L, S: mod.S, jsx: mod.jsx, host: createHost(mod.R) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The encoded HD listening voice a signed-in learner has after it resolved. */
export const HD_VOICE = "google:es-US:es-US-Chirp3-HD-Aoede";

/** Timers a component sets, run by the test instead of the clock. */
export function fakeTimers() {
  const timers = new Map();
  let id = 0;
  return {
    timers,
    setTimeout: (fn, ms = 0) => {
      timers.set(++id, { fn, ms });
      return id;
    },
    clearTimeout: (key) => timers.delete(key),
    /** Runs every pending timer of `ms`, returns how many ran. */
    run(ms) {
      const due = [...timers].filter(([, timer]) => timer.ms === ms);
      for (const [key, timer] of due) {
        timers.delete(key);
        timer.fn();
      }
      return due.length;
    },
  };
}
