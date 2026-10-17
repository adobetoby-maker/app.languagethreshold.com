import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
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
test("actual speaking missions isolate late replies, playback, microphone and completion from restarted/foreign/unmounted sessions", async () => {
  const dir = mkdtempSync(resolve("node_modules/.cache/speaking-preview-"));
  const old = Object.fromEntries(
    ["window", "document", "fetch"].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]),
  );
  try {
    const out = join(dir, "component.mjs");
    await build({
      stdin: {
        contents: `export {SpeakingMissionsPreview} from './src/components/speak/SpeakingMissionsPreview';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile: out,
      bundle: true,
      format: "esm",
      platform: "node",
      external: ["react/jsx-runtime"],
      define: { "import.meta.env": "{}" },
      logLevel: "silent",
      plugins: [
        {
          name: "mission-host",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|lucide-react|@\/state\/(app|speech|auth|ai-gate)-state|@\/lib\/(mission-tts|tts|voices|speaking-client|speaking-privacy|speaking-navigation|lesson-return)|@\/components\/(auth\/AuthModal|reader\/(WordCard|FuriganaText|PinyinText)|travel\/NextTripBanner)|\.\/(LongPressWordText|SpeakingConsentDialog))$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const c={actor:'a',session:{user:{id:'a'}},slots:[],cursor:0,effects:[],writes:0,actions:[],audio:[],headers:[],waitHeaders:false,confirmed:true,saves:[],state:{selectedLanguage:'Spanish',nativeLanguage:'English',activeModuleId:'construction-foreman',nextTrips:{}}};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export const useRef=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];};
 export const useState=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]=typeof initial==='function'?initial():initial;return[c.slots[i],v=>{c.writes++;if(typeof v==='function'){v(c.slots[i]);c.slots[i]=v(c.slots[i]);}else c.slots[i]=v;}];};
 export const useMemo=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={value:fn(),deps};return c.slots[i].value;};export const useCallback=(fn,deps)=>useMemo(()=>fn,deps);
 export const useEffect=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||!deps||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()};});};
 const dispatch=a=>c.actions.push(a),isCurrentUser=id=>c.actor===id;
 export const useApp=()=>({state:c.state,dispatch}),useAuth=()=>{if(c.session?.user.id!==c.actor)c.session=c.actor?{user:{id:c.actor}}:null;return{session:c.session,user:c.session?.user??null,isCurrentUser};},useAiGate=()=>({gated:fn=>fn()});
 const setAccent=()=>{},setRate=()=>{},setVoiceURI=()=>{};export const useSpeech=()=>({accent:'es-CR',rate:1,voiceURI:null,setAccent,setRate,setVoiceURI});
 export const getSpeakingAgeAttestation=async()=>c.confirmed,saveSpeakingAgeAttestation=(value,signal,current)=>new Promise(resolve=>c.saves.push({value,signal,current,resolve})),speakingRequestHeaders=()=>c.waitHeaders?new Promise(r=>c.headers.push(r)):Promise.resolve({});
 export const getMissionTtsCapabilities=async()=>({ready:false,voices:[]}),pickVoice=()=>({voiceURI:'device',lang:'es-CR'}),subscribeVoices=()=>()=>{};
 export const speakRemote=(text,locale,opts)=>new Promise(resolve=>{c.audio.push({text,locale,opts,resolve});opts.signal.addEventListener('abort',resolve,{once:true});}),speakMissionTts=()=>{throw new Error('No remote audio in fixture');};
 export const consumeCoreSpeakingEntry=()=>false,consumeSpeakingMissionRequest=()=>null,browserReturnStorage=()=>null,lessonMissionPrefix=()=>'',readLessonReturn=()=>null,setSpeakingPrivacyMode=()=>{};
 export const AuthModal='auth',WordCard='card',NextTripBanner='banner',LongPressWordText='text',FuriganaText='text',PinyinText='text',SpeakingConsentDialog='consent';
 export const Check='span',ChevronLeft='span',Lightbulb='span',Mic='span',RotateCcw='span',Search='span',Send='span',Square='span',X='span';
 `,
            }));
          },
        },
      ],
    });
    const { SpeakingMissionsPreview, c } = await import(out),
      requests = [],
      recognitions = [],
      timers = new Map();
    let timer = 0;
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
      setTimeout: (fn) => {
        timers.set(++timer, fn);
        return timer;
      },
      clearTimeout: (id) => timers.delete(id),
    };
    globalThis.document = {
      visibilityState: "visible",
      addEventListener() {},
      removeEventListener() {},
    };
    globalThis.fetch = (url, opts) =>
      new Promise((resolve) => requests.push({ url, opts, resolve }));
    const props = {
      embeddedMissionPrefix: "scenario_version_construction_safety_briefing_es_v1",
      onEmbeddedClose() {},
    };
    const render = () => {
      c.cursor = 0;
      const tree = SpeakingMissionsPreview(props);
      for (const f of c.effects.splice(0)) f();
      return tree;
    };
    const unmount = () => {
      for (const s of c.slots) s?.cleanup?.();
    };
    const button = (tree, label) =>
      nodes(tree).find((n) => n.type === "button" && text(n).trim() === label);
    const ready = async () => {
      let tree;
      for (let i = 0; i < 4; i++) {
        tree = render();
        await tick();
      }
      return tree;
    };
    const begin = async () => {
      let tree = await ready();
      const start = button(tree, "Start mission") ?? button(tree, "Try again");
      assert.ok(start);
      assert.notEqual(start.props.disabled, true);
      start.props.onClick();
      await tick();
      tree = render();
      const audio = c.audio.at(-1);
      assert.equal(audio.opts.deviceOnly, true);
      audio.opts.onPlaybackStart?.();
      audio.resolve();
      await tick();
      return render();
    };
    const send = (tree, phrase = "QA learner turn") => {
      nodes(tree)
        .find((n) => n.type === "input" && n.props.id === "mission-typed-turn")
        .props.onChange({ target: { value: phrase } });
      tree = render();
      const form = nodes(tree).find((n) => n.type === "form");
      form.props.onSubmit({ preventDefault() {} });
      return form;
    };
    let tree = await begin();
    const form = send(tree);
    form.props.onSubmit({ preventDefault() {} });
    await tick();
    assert.equal(requests.length, 1);
    const stale = requests[0];
    tree = render();
    button(tree, "End").props.onClick();
    tree = render();
    assert.equal(stale.opts.signal.aborted, true);
    const marks = c.actions.filter((a) => a.type === "MARK_PRACTICE").length;
    assert.equal(marks, 1, "explicit end records practice once");
    tree = await begin();
    send(tree, "QA replacement turn");
    await tick();
    assert.equal(requests.length, 2);
    stale.resolve({
      ok: true,
      json: async () => ({
        assistantText: "stale partner",
        provisionalObjectiveIds: [],
        shouldEnd: true,
        deferredFeedback: [],
      }),
      body: { cancel: async () => {} },
    });
    await tick();
    assert.equal(c.actions.filter((a) => a.type === "MARK_PRACTICE").length, marks);
    assert.equal(requests[1].opts.signal.aborted, false);
    requests[1].resolve({
      ok: true,
      json: async () => ({
        assistantText: "current partner",
        provisionalObjectiveIds: [],
        shouldEnd: false,
        deferredFeedback: [],
      }),
    });
    await tick();
    const audio = c.audio.at(-1),
      start = audio.opts.onPlaybackStart;
    start();
    audio.resolve();
    await tick();
    tree = render();
    assert.ok(nodes(tree).some((n) => n.props?.text === "current partner"));
    assert.equal(
      nodes(tree).some((n) => n.props?.text === "stale partner"),
      false,
    );
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
    assert.equal(requests.length, 3);
    assert.equal(JSON.parse(requests[2].opts.body).messages.at(-1).content, "QA final");
    assert.equal(rec.onresult, null);
    c.actor = "b";
    const writes = c.writes,
      actions = c.actions.length;
    unmount();
    requests[2].resolve({
      ok: true,
      json: async () => ({
        assistantText: "foreign",
        provisionalObjectiveIds: [],
        shouldEnd: true,
      }),
      body: { cancel: async () => {} },
    });
    result(event);
    end();
    start();
    await tick();
    assert.equal(c.writes, writes);
    assert.equal(c.actions.length, actions);
    assert.equal(rec.aborted, true);
    assert.equal(timers.size, 0);
    c.slots = [];
    c.actor = "a";
    c.confirmed = true;
    tree = await begin();
    c.waitHeaders = true;
    const beforeHeaders = requests.length;
    send(tree, "QA pending credentials");
    await tick();
    assert.equal(c.headers.length, 1);
    unmount();
    const afterHeaderCleanup = c.writes;
    c.headers.shift()({});
    await tick();
    assert.equal(
      requests.length,
      beforeHeaders,
      "cancelled mission credentials cannot dispatch a model request",
    );
    assert.equal(c.writes, afterHeaderCleanup);
    c.waitHeaders = false;
    // Consent save is user-invoked in fixtures only; late acknowledgement cannot start a mission.
    c.slots = [];
    c.actor = "a";
    c.confirmed = false;
    tree = await ready();
    button(tree, "Start mission").props.onClick();
    tree = render();
    const dialog = nodes(tree).find((n) => n.type === "consent");
    dialog.props.onConfirm();
    dialog.props.onConfirm();
    assert.equal(c.saves.length, 1);
    const save = c.saves[0];
    unmount();
    const saveWrites = c.writes,
      audioCount = c.audio.length;
    assert.equal(save.signal.aborted, true);
    save.resolve(true);
    await tick();
    assert.equal(c.writes, saveWrites);
    assert.equal(c.audio.length, audioCount);
  } finally {
    for (const [k, d] of Object.entries(old)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
