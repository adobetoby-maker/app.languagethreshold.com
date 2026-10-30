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
        contents: `export {SpeakingMissionsPreview} from './src/components/speak/SpeakingMissionsPreview';export {c,SpeakingConsentSaveError} from 'fixture';`,
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
                  /^(fixture|react|lucide-react|@\/state\/(app|speech|auth|ai-gate)-state|@\/lib\/(mission-tts|tts|voices|speaking-client|speaking-privacy|speaking-navigation|lesson-return)|@\/components\/(auth\/AuthModal|reader\/(WordCard|FuriganaText|PinyinText)|travel\/NextTripBanner)|\.\/(LongPressWordText|SpeakingConsentDialog|MicrophoneTestDialog))$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const c={actor:'a',session:{user:{id:'a'}},slots:[],cursor:0,effects:[],writes:0,actions:[],audio:[],headers:[],waitHeaders:false,confirmed:true,saves:[],reads:[],waitRead:false,state:{selectedLanguage:'Spanish',nativeLanguage:'English',activeModuleId:'construction-foreman',nextTrips:{}}};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export const useRef=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];};
 export const useState=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]=typeof initial==='function'?initial():initial;return[c.slots[i],v=>{c.writes++;if(typeof v==='function'){v(c.slots[i]);c.slots[i]=v(c.slots[i]);}else c.slots[i]=v;}];};
 export const useMemo=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={value:fn(),deps};return c.slots[i].value;};export const useCallback=(fn,deps)=>useMemo(()=>fn,deps);
 export const useEffect=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||!deps||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()};});};
 const dispatch=a=>c.actions.push(a),isCurrentUser=id=>c.actor===id;
 export const useApp=()=>({state:c.state,dispatch}),useAuth=()=>{if(c.session?.user.id!==c.actor)c.session=c.actor?{user:{id:c.actor}}:null;return{session:c.session,user:c.session?.user??null,isCurrentUser};},useAiGate=()=>({gated:fn=>fn()});
 const setAccent=()=>{},setRate=()=>{},setVoiceURI=()=>{};export const useSpeech=()=>({accent:'es-CR',rate:1,voiceURI:null,voiceSettings:{listeningGender:'woman',speakingGender:'woman',speakingAudioSource:'device'},setAccent,setRate,setVoiceURI});
 const owned=o=>{if(!o||o.userId!==c.actor||!o.isCurrent())throw new Error("Expected current speaking request owner");};
 export class SpeakingConsentSaveError extends Error {constructor(outcome){super('Synthetic unconfirmed save');this.outcome=outcome;}};export const getSpeakingAgeAttestation=async(signal,owner)=>{owned(owner);return c.waitRead?new Promise((resolve,reject)=>c.reads.push({signal,owner,resolve,reject})):c.confirmed;},saveSpeakingAgeAttestation=(value,signal,current,owner)=>{owned(owner);return new Promise((resolve,reject)=>c.saves.push({value,signal,current,owner,resolve,reject}));},speakingRequestHeaders=(owner)=>{owned(owner);return c.waitHeaders?new Promise(r=>c.headers.push(r)):Promise.resolve({});};
 export const getMissionTtsCapabilities=async()=>({ready:false,voices:[]}),pickVoice=()=>({voiceURI:'device',lang:'es-CR'}),subscribeVoices=()=>()=>{};
 export const speakRemote=(text,locale,opts)=>new Promise(resolve=>{c.audio.push({text,locale,opts,resolve});opts.signal.addEventListener('abort',resolve,{once:true});}),speakMissionTts=()=>{throw new Error('No remote audio in fixture');};
 export const consumeCoreSpeakingEntry=()=>false,consumeSpeakingMissionRequest=()=>null,browserReturnStorage=()=>null,lessonMissionPrefix=()=>'',readLessonReturn=()=>null,setSpeakingPrivacyMode=()=>{};
 export const AuthModal='auth',WordCard='card',NextTripBanner='banner',LongPressWordText='text',FuriganaText='text',PinyinText='text',SpeakingConsentDialog='consent',MicrophoneTestDialog='mic-test';
 export const Check='span',ChevronLeft='span',Lightbulb='span',Mic='span',RotateCcw='span',Search='span',Send='span',Square='span',X='span';
 `,
            }));
          },
        },
      ],
    });
    const { SpeakingMissionsPreview, c, SpeakingConsentSaveError } = await import(out),
      requests = [],
      recognitions = [],
      timers = new Map(),
      timerDelays = new Map();
    let timer = 0;
    let speechQueueResets = 0;
    globalThis.window = {
      addEventListener() {},
      removeEventListener() {},
      speechSynthesis: {
        cancel() {
          speechQueueResets++;
        },
      },
      SpeechRecognition: class {
        constructor() {
          recognitions.push(this);
        }
        start() {
          if (c.startError) this.onerror?.({ error: c.startError });
          else if (!c.silentStart) this.onstart?.();
        }
        stop() {
          this.onend?.();
        }
        abort() {
          this.aborted = true;
        }
      },
      setTimeout: (fn, milliseconds) => {
        timers.set(++timer, fn);
        timerDelays.set(timer, milliseconds);
        return timer;
      },
      clearTimeout: (id) => {
        timers.delete(id);
        timerDelays.delete(id);
      },
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
    tree = render();
    assert.ok(
      nodes(tree).find((n) => n.props?.["aria-label"] === "Start listening").props.disabled,
    );
    button(tree, "Stop reply — my turn").props.onClick();
    assert.equal(audio.opts.signal.aborted, true, "learner can release a stuck second reply");
    tree = render();
    assert.notEqual(
      nodes(tree).find((n) => n.props?.["aria-label"] === "Start listening").props.disabled,
      true,
    );
    audio.resolve();
    await tick();
    tree = render();
    assert.ok(nodes(tree).some((n) => n.props?.text === "current partner"));
    assert.equal(
      nodes(tree).some((n) => n.props?.text === "stale partner"),
      false,
    );
    // iOS Safari can drop onend after partner audio; Stop must still end the listening turn.
    nodes(tree)
      .find((n) => n.props?.["aria-label"] === "Start listening")
      .props.onClick();
    const silent = recognitions.at(-1);
    assert.equal(
      speechQueueResets,
      1,
      "second-turn microphone tap releases the prior device speech queue",
    );
    silent.stop = () => {};
    tree = render();
    const beforeStop = new Set(timers.keys());
    nodes(tree)
      .find((n) => n.props?.["aria-label"] === "Stop listening")
      .props.onClick();
    tree = render();
    assert.ok(nodes(tree).some((n) => n.props?.["aria-label"] === "Finishing transcription"));
    const fallback = [...timers].filter(([id]) => !beforeStop.has(id));
    assert.equal(fallback.length, 1);
    assert.equal(
      timerDelays.get(fallback[0][0]),
      8000,
      "empty transcript gets a full grace period, not a 1.2s abort",
    );
    timers.delete(fallback[0][0]);
    fallback[0][1]();
    tree = render();
    assert.equal(silent.aborted, true);
    assert.ok(nodes(tree).some((n) => n.props?.["aria-label"] === "Start listening"));
    // A browser may emit an error without onend. Each failure must free the
    // recorder for the next tap and must never submit the partial transcript.
    const requestsBeforeFailures = requests.length;
    for (const error of ["not-allowed", "audio-capture", "network", "no-speech", "aborted"]) {
      const count = recognitions.length;
      nodes(tree)
        .find((n) => n.props?.["aria-label"] === "Start listening")
        .props.onClick();
      assert.equal(recognitions.length, count + 1, `retry after ${error} starts a fresh recorder`);
      const failed = recognitions.at(-1);
      const staleResult = failed.onresult,
        staleEnd = failed.onend;
      failed.onresult({
        resultIndex: 0,
        results: [
          Object.assign([{ transcript: "Do not send failed partial" }], { isFinal: false }),
        ],
      });
      failed.onerror({ error });
      assert.equal(failed.aborted, true);
      assert.equal(failed.onresult, null);
      assert.equal(failed.onend, null);
      staleResult({
        resultIndex: 0,
        results: [Object.assign([{ transcript: "Late failed final" }], { isFinal: true })],
      });
      staleEnd();
      await tick();
      tree = render();
      if (error === "not-allowed") assert.match(text(tree), /browser settings/);
      const resume = button(tree, "Resume mission");
      if (resume) {
        resume.props.onClick();
        tree = render();
      }
      assert.ok(nodes(tree).some((n) => n.props?.["aria-label"] === "Start listening"));
      assert.equal(
        requests.length,
        requestsBeforeFailures,
        "failed recognition never sends a turn",
      );
    }
    // Cancel while waiting must release the microphone and reject late results.
    nodes(tree)
      .find((n) => n.props?.["aria-label"] === "Start listening")
      .props.onClick();
    const cancelled = recognitions.at(-1),
      lateCancelledResult = cancelled.onresult;
    cancelled.stop = () => {};
    tree = render();
    nodes(tree)
      .find((n) => n.props?.["aria-label"] === "Stop listening")
      .props.onClick();
    tree = render();
    button(tree, "Cancel transcription").props.onClick();
    assert.equal(cancelled.aborted, true);
    lateCancelledResult({
      resultIndex: 0,
      results: [Object.assign([{ transcript: "Do not send cancelled answer" }], { isFinal: true })],
    });
    await tick();
    assert.equal(requests.length, requestsBeforeFailures);
    tree = render();
    nodes(tree)
      .find((n) => n.props?.["aria-label"] === "Start listening")
      .props.onClick();
    const rec = recognitions.at(-1),
      result = rec.onresult,
      end = rec.onend;
    rec.stop = () => {};
    tree = render();
    nodes(tree)
      .find((n) => n.props?.["aria-label"] === "Stop listening")
      .props.onClick();
    tree = render();
    assert.match(text(tree), /Finishing transcription/);
    assert.equal(rec.aborted, undefined, "stopping capture must not abort pending results");
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
    assert.equal(
      [...timers.keys()].filter((id) => timerDelays.get(id) === 8000).length,
      0,
      "a late final result clears its grace timer without waiting for onend",
    );
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
    // A stalled mission request must preserve the answer and release the microphone.
    c.slots = [];
    c.effects = [];
    c.actor = "a";
    c.confirmed = true;
    tree = await begin();
    send(tree, "QA timeout answer");
    await tick();
    const timedOutRequest = requests.at(-1);
    const deadline = [...timers.entries()].find(([id]) => timerDelays.get(id) === 45000);
    assert.ok(deadline);
    deadline[1]();
    tree = render();
    assert.equal(timedOutRequest.opts.signal.aborted, true);
    assert.match(text(tree), /reply took too long/);
    assert.equal(
      nodes(tree).find((n) => n.type === "input" && n.props.id === "mission-typed-turn").props
        .value,
      "QA timeout answer",
    );
    button(tree, "Reset").props.onClick();
    await tick();
    const freshAudio = c.audio.at(-1);
    freshAudio.resolve();
    await tick();
    tree = render();
    timedOutRequest.resolve({
      ok: true,
      json: async () => ({
        assistantText: "late timeout reply",
        provisionalObjectiveIds: [],
        shouldEnd: false,
        deferredFeedback: [],
      }),
      body: { cancel: async () => {} },
    });
    await tick();
    assert.doesNotMatch(text(render()), /late timeout reply/);
    assert.notEqual(
      nodes(tree).find((n) => n.props?.["aria-label"] === "Start listening").props.disabled,
      true,
    );
    unmount();
    c.slots = [];
    c.effects = [];
    c.actor = "a";
    c.confirmed = true;
    tree = await begin();
    c.startError = "audio-capture";
    nodes(tree)
      .find((n) => n.props?.["aria-label"] === "Start listening")
      .props.onClick();
    tree = render();
    assert.ok(button(tree, "Resume mission"));
    assert.doesNotMatch(text(tree), /Listening…/);
    button(tree, "Resume mission").props.onClick();
    tree = render();
    c.startError = null;
    c.silentStart = true;
    nodes(tree)
      .find((n) => n.props?.["aria-label"] === "Start listening")
      .props.onClick();
    tree = render();
    assert.ok(nodes(tree).find((n) => n.props?.["aria-label"] === "Cancel microphone"));
    const startDeadline = [...timers.entries()].find(([id]) => timerDelays.get(id) === 12000);
    assert.ok(startDeadline);
    startDeadline[1]();
    tree = render();
    assert.match(text(tree), /microphone did not start/);
    assert.ok(button(tree, "Resume mission"));
    button(tree, "Resume mission").props.onClick();
    tree = render();
    c.silentStart = false;
    nodes(tree)
      .find((n) => n.props?.["aria-label"] === "Start listening")
      .props.onClick();
    tree = render();
    assert.ok(nodes(tree).find((n) => n.props?.["aria-label"] === "Stop listening"));
    button(tree, "Reset").props.onClick();
    await tick();
    assert.equal(recognitions.at(-1).aborted, true);
    unmount();
    // The startup/settings prompt owns consent; entering a mission never opens a blocking modal.
    c.slots = [];
    c.effects = [];
    c.actor = "a";
    c.confirmed = false;
    tree = await ready();
    const beforeConsentRequests = requests.length,
      beforeConsentAudio = c.audio.length;
    button(tree, "Start mission").props.onClick();
    tree = render();
    assert.equal(nodes(tree).filter((n) => n.type === "consent").length, 0);
    assert.match(JSON.stringify(tree), /AI conversation is off/);
    assert.equal(requests.length, beforeConsentRequests);
    assert.equal(c.audio.length, beforeConsentAudio);
    assert.equal(c.saves.length, 0, "lesson entry cannot write consent");
    unmount();

    // Signing in must retain the chosen public mission, without carrying private work
    // or automatically starting a conversation for the newly authenticated actor.
    c.slots = [];
    c.effects = [];
    c.actor = null;
    c.session = null;
    c.waitRead = false;
    c.confirmed = true;
    props.embeddedMissionPrefix = undefined;
    window.requestAnimationFrame = () => 1;
    window.cancelAnimationFrame = () => {};
    window.location = {
      href: "https://app.example/?tab=speak&module=construction-foreman&target=Spanish&native=English",
    };
    window.history = {
      state: null,
      replaceState(_state, _title, path) {
        window.location.href = new URL(path, window.location.href).href;
      },
    };
    tree = await ready();
    const missionCard = nodes(tree).find(
      (n) =>
        n.props?.["data-testid"] === "speaking-mission-card" &&
        text(n).includes("Pre-shift safety briefing"),
    );
    assert.ok(missionCard);
    missionCard.props.onClick();
    tree = await ready();
    button(tree, "Conversation").props.onClick();
    tree = render();
    button(tree, "Sign in to start mission").props.onClick();
    tree = render();
    assert.equal(nodes(tree).find((n) => n.type === "auth").props.open, true);
    const returnUrl = window.location.href;
    assert.equal(
      new URL(returnUrl).searchParams.get("mission"),
      "scenario_version_construction_safety_briefing_es_v1",
    );
    const requestsBeforeSignIn = requests.length,
      audioBeforeSignIn = c.audio.length;
    c.actor = "signed-in-learner";
    tree = await ready();
    assert.match(text(tree), /Pre-shift safety briefing/);
    assert.ok(button(tree, "Start mission"), "email sign-in returns to the same setup");
    assert.equal(nodes(tree).find((n) => n.type === "auth").props.open, false);
    assert.equal(requests.length, requestsBeforeSignIn, "sign-in does not auto-send a turn");
    assert.equal(
      c.audio.length,
      audioBeforeSignIn,
      "sign-in does not auto-start recording or playback",
    );

    // A fresh component after an OAuth redirect restores that same explicit mission.
    unmount();
    c.slots = [];
    c.effects = [];
    window.location.href = returnUrl;
    tree = await ready();
    assert.match(text(tree), /Pre-shift safety briefing/);
    assert.ok(button(tree, "Start mission"));
    button(tree, "All missions").props.onClick();
    tree = await ready();
    assert.equal(new URL(window.location.href).searchParams.has("mission"), false);
    assert.equal(button(tree, "Start mission"), undefined, "leaving does not reopen the mission");
    unmount();
  } finally {
    for (const [k, d] of Object.entries(old)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
