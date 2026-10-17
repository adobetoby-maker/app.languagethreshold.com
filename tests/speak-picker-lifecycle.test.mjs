import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
const changed = (a, b) => !a || a.some((v, i) => v !== b[i]);
function nodes(n, out = []) {
  if (Array.isArray(n)) n.forEach((v) => nodes(v, out));
  else if (n && typeof n === "object") {
    out.push(n);
    nodes(n.props?.children, out);
  }
  return out;
}
function text(n) {
  if (n == null || typeof n === "boolean") return "";
  if (Array.isArray(n)) return n.map(text).join("");
  if (typeof n === "object") return text(n.props?.children);
  return String(n);
}
async function fixture(component, action) {
  const dir = mkdtempSync(resolve("node_modules/.cache/speak-picker-"));
  const old = Object.fromEntries(
    ["window", "localStorage", "fetch"].map((k) => [
      k,
      Object.getOwnPropertyDescriptor(globalThis, k),
    ]),
  );
  const oldNow = Date.now;
  try {
    const out = join(dir, "component.mjs"),
      file =
        component === "SpeakLearn"
          ? "src/components/speak/SpeakLearn.tsx"
          : "src/components/VoicePicker.tsx";
    await build({
      stdin: {
        contents: `export {${component}} from './${file}';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile: out,
      bundle: true,
      platform: "node",
      format: "esm",
      external: ["react/jsx-runtime"],
      logLevel: "silent",
      plugins: [
        {
          name: "screen-host",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|lucide-react|sonner|@\/state\/(app|speak|speech|auth|ai-gate)-state|@\/lib\/(tts|voices|mission-tts|pwa-install|confetti|module-filter|speaking-client|speaking-privacy)|@\/data\/modules|@\/components\/(speak\/(ChallengePanel|SpeakingMissionsPreview)|modules\/ModuleMatchPanel|core30\/LessonReturnPill|ui\/dropdown-menu))$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const c={slots:[],cursor:0,effects:[],actor:'a',accent:'es-CR',voice:null,state:{selectedLanguage:'Spanish',nativeLanguage:'English',activeModuleId:'roofing',level:'A2',userVocab:[]},turns:[],audio:[],dispatches:[],tips:[],exchanges:0,seconds:[],writes:0,errors:[],headers:[],waitHeaders:false,capabilities:[],now:0};
 const changed=${changed.toString()};
 export const useRef=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];};
 export const useState=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]=typeof initial==='function'?initial():initial;return [c.slots[i],v=>{c.writes++;c.slots[i]=typeof v==='function'?v(c.slots[i]):v;}];};
 export const useMemo=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={deps,value:fn()};return c.slots[i].value;};export const useCallback=(fn,deps)=>useMemo(()=>fn,deps);
 export const useEffect=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||!deps||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()};});};
 const dispatch=a=>c.dispatches.push(a),isCurrentUser=id=>c.actor===id;
 export const useApp=()=>({state:c.state,dispatch}),useAuth=()=>({user:c.actor?{id:c.actor}:null,session:c.actor?{user:{id:c.actor}}:null,isCurrentUser}),useAiGate=()=>({gated:fn=>fn()});
 const addTurn=(role,text)=>{const t={id:'turn-'+c.turns.length,role,text};c.turns=[...c.turns,t];return t;},appendToTurn=(id,delta)=>{c.turns=c.turns.map(t=>t.id===id?{...t,text:t.text+delta}:t);},setTipFor=(id,tip)=>c.tips.push({id,tip}),incrementExchanges=()=>c.exchanges++,addSeconds=s=>c.seconds.push(s),clear=()=>{c.turns=[];};
 export const useSpeak=()=>({turns:c.turns,exchanges:c.exchanges,addTurn,appendToTurn,setTipFor,incrementExchanges,addSeconds,clear});
 export const ACCENTS_BY_LANGUAGE={Spanish:[{code:'es-CR'}]},useSpeech=()=>({accent:c.accent,voiceURI:c.voice,rate:1,setVoiceURI:v=>c.voice=v,setAccent:v=>c.accent=v,accentsForLanguage:[{code:'es-CR',label:'QA accent'}],settingsHydrated:true});
 export const speakRemote=(text,locale,opts)=>{c.audio.push({text,locale,opts});return new Promise(resolve=>opts.signal.addEventListener('abort',resolve,{once:true}));},speakMissionTts=async()=>{};
 export const speakingRequestHeaders=()=>c.waitHeaders?new Promise(r=>c.headers.push(r)):Promise.resolve({}),setSpeakingPrivacyMode=()=>{};
 export const getMissionTtsCapabilities=(_locale,signal)=>new Promise(resolve=>c.capabilities.push({signal,resolve}));
 export const getVoicesForLocale=()=>[{voiceURI:'qa-device',name:'QA device voice',lang:'es-CR'}],pickVoice=()=>getVoicesForLocale()[0],subscribeVoices=()=>()=>{},isIosDevice=()=>false;
 export const getModule=()=>null,matchesFocus=()=>false,celebrate=()=>{},looseIncludes=()=>false;
 export const toast=Object.assign((...a)=>c.errors.push(a),{error:(...a)=>c.errors.push(a)});
 export const Mic='span',Square='span',Trash2='span',AlertTriangle='span',AudioLines='span',ChevronDown='span',Cloud='span',Smartphone='span';
 export const ChallengePanel='section',SpeakingMissionsPreview='section',ModuleMatchPanel='section',LessonReturnPill='section';
 export const DropdownMenu='menu',DropdownMenuContent='menucontent',DropdownMenuItem='menuitem',DropdownMenuLabel='label',DropdownMenuSeparator='hr',DropdownMenuTrigger='button';
 `,
            }));
          },
        },
      ],
    });
    const mod = await import(out),
      { c } = mod;
    const requests = [],
      recognitions = [];
    Date.now = () => c.now;
    globalThis.localStorage = { getItem: () => null, setItem: () => {} };
    globalThis.window = {
      SpeechRecognition: class {
        constructor() {
          recognitions.push(this);
        }
        start() {}
        stop() {
          this.onend?.();
        }
        abort() {
          this.aborted = true;
        }
      },
    };
    globalThis.fetch = (url, opts) =>
      new Promise((resolve) =>
        requests.push({ url, opts, mode: JSON.parse(opts.body).mode, resolve }),
      );
    const render = () => {
      c.cursor = 0;
      const tree = mod[component]({});
      for (const f of c.effects.splice(0)) f();
      return tree;
    };
    const unmount = () => {
      for (const s of c.slots) s?.cleanup?.();
    };
    const button = (tree, label) =>
      nodes(tree).find((n) => n.type === "button" && text(n).trim() === label);
    const finish = async (req) => {
      let i = 0;
      const chunks = [
        `data: ${JSON.stringify({ choices: [{ delta: { content: "QA reply" } }] })}\n`,
        "data: [DONE]\n",
      ];
      const reader = {
        read: async () =>
          i < chunks.length
            ? { done: false, value: new TextEncoder().encode(chunks[i++]) }
            : { done: true },
        cancel: async () => {
          reader.cancelled = true;
        },
      };
      req.resolve({ ok: true, body: { getReader: () => reader } });
      await tick();
      return reader;
    };
    await action({ c, render, unmount, button, requests, recognitions, finish });
  } finally {
    Date.now = oldNow;
    for (const [k, d] of Object.entries(old)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}
test("actual SpeakLearn cancels chat/tips before and after headers, suppresses duplicate/late microphone work and avoids foreign elapsed credit", () =>
  fixture("SpeakLearn", async ({ c, render, unmount, button, requests, recognitions, finish }) => {
    let tree = render();
    button(tree, "Free conversation").props.onClick();
    tree = render();
    const chip = nodes(tree).find((n) => n.type === "button" && text(n).includes("ciudad"));
    chip.props.onClick();
    chip.props.onClick();
    await tick();
    assert.equal(requests.length, 2);
    assert.equal(c.turns.filter((t) => t.role === "user").length, 1);
    tree = render();
    button(tree, "Clear").props.onClick();
    tree = render();
    assert.equal(
      requests.every((r) => r.opts.signal.aborted),
      true,
    );
    let cancelled = false;
    requests
      .find((r) => r.mode === "chat")
      .resolve({
        ok: true,
        body: {
          cancel: async () => {
            cancelled = true;
          },
        },
      });
    requests
      .find((r) => r.mode === "tip")
      .resolve({ ok: true, json: async () => ({ tip: "stale tip" }) });
    await tick();
    assert.equal(cancelled, true);
    assert.equal(c.turns.length, 0);
    assert.equal(c.tips.length, 0);
    assert.equal(c.exchanges, 0);
    nodes(tree)
      .find((n) => n.type === "button" && text(n).includes("ciudad"))
      .props.onClick();
    await tick();
    const activeChat = requests.at(-2),
      activeTip = requests.at(-1);
    assert.equal(activeChat.mode, "chat");
    const reader = await finish(activeChat);
    assert.equal(reader.cancelled, true);
    assert.equal(c.exchanges, 1);
    assert.equal(c.dispatches.filter((a) => a.type === "ADD_XP" && a.payload === 10).length, 1);
    const lastAudio = c.audio.at(-1);
    tree = render();
    button(tree, "Clear").props.onClick();
    assert.equal(lastAudio.opts.signal.aborted, true);
    activeTip.resolve({ ok: true, json: async () => ({ tip: "late positive tip" }) });
    await tick();
    assert.equal(c.tips.length, 0);
    c.waitHeaders = true;
    tree = render();
    nodes(tree)
      .find((n) => n.type === "button" && text(n).includes("ciudad"))
      .props.onClick();
    await tick();
    assert.equal(c.headers.length, 2);
    tree = render();
    button(tree, "Clear").props.onClick();
    for (const resolve of c.headers.splice(0)) resolve({});
    await tick();
    assert.equal(requests.length, 4, "cancelled credentials must not dispatch a later request");
    c.waitHeaders = false;
    tree = render();
    nodes(tree)
      .find((n) => n.props?.["aria-label"] === "Start listening")
      .props.onClick();
    const rec = recognitions.at(-1),
      result = rec.onresult,
      end = rec.onend;
    const event = {
      resultIndex: 0,
      results: [Object.assign([{ transcript: "QA final" }], { isFinal: true })],
    };
    result(event);
    result(event);
    end();
    end();
    await tick();
    assert.equal(requests.length, 6);
    assert.equal(c.turns.filter((t) => t.role === "user").at(-1).text, "QA final");
    assert.equal(rec.onresult, null);
    const pending = requests.at(-2);
    c.now = 5000;
    c.actor = "b";
    const writes = c.writes,
      turnCount = c.turns.length,
      credit = c.dispatches.length;
    unmount();
    pending.resolve({ ok: true, body: { cancel: async () => {} } });
    requests.at(-1).resolve({ ok: true, json: async () => ({ tip: "foreign" }) });
    result(event);
    end();
    await tick();
    assert.equal(c.writes, writes);
    assert.equal(c.turns.length, turnCount);
    assert.equal(c.dispatches.length, credit);
    assert.equal(c.seconds.length, 0);
    assert.equal(c.errors.length, 0);
  }));
test("actual VoicePicker cancels device preview on close/accent/unmount and ignores capabilities after abort", () =>
  fixture("VoicePicker", async ({ c, render, unmount }) => {
    render();
    let tree = render();
    const device = () => nodes(tree).find((n) => n.type === "menuitem" && n.key === "qa-device");
    device().props.onSelect({ preventDefault() {} });
    assert.equal(c.audio.length, 1);
    assert.equal(c.audio[0].opts.voiceURI, "qa-device");
    nodes(tree)
      .find((n) => n.type === "menu")
      .props.onOpenChange(false);
    assert.equal(c.audio[0].opts.signal.aborted, true);
    tree = render();
    device().props.onSelect({ preventDefault() {} });
    c.accent = "es-MX";
    tree = render();
    assert.equal(c.audio[1].opts.signal.aborted, true);
    tree = render();
    device().props.onSelect({ preventDefault() {} });
    unmount();
    const writes = c.writes;
    assert.equal(c.audio.at(-1).opts.signal.aborted, true);
    for (const cap of c.capabilities) {
      assert.equal(cap.signal.aborted, true);
      cap.resolve({ ready: false, voices: [] });
    }
    await tick();
    assert.equal(c.writes, writes);
  }));
