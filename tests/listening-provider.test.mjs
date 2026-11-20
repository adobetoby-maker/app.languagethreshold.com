// The real SpeechProvider and the real listening rules (src/lib/listening-audio.ts), run on a
// small hooks host. The audio router, the voice list, device speech, the toast and the
// learner's device storage are stand-ins, so every routing decision can be read directly.
import assert from "node:assert/strict";
import nodeTest from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { createLearnerDeviceStore, learnerDeviceKey } from "../src/lib/learner-device-store.ts";
import { encodeGoogleVoicePreference } from "../src/data/mission-tts.ts";
import { DEVICE_DEFAULT_VOICE } from "../src/data/mobile-voice.ts";

const test = (name, fn) => nodeTest(name, { timeout: 30_000 }, fn);
const tick = () => new Promise((r) => setImmediate(r));
const voice = (locale, name, gender) => ({
  name: `${locale}-Chirp3-HD-${name}`,
  languageCodes: [locale],
  ssmlGender: gender,
  tier: "Chirp 3 HD",
  label: name,
  naturalSampleRateHertz: 24000,
});
const CATALOG = {
  provider: "google-cloud-tts",
  ready: true,
  supportedLanguages: ["Spanish"],
  speakingRates: [1],
  voices: [voice("es-US", "Aoede", "FEMALE"), voice("es-US", "Charon", "MALE")],
};
const AOEDE = encodeGoogleVoicePreference(CATALOG.voices[0]);
const CHARON = encodeGoogleVoicePreference(CATALOG.voices[1]);

const FIXTURE = `
 export const controls={actor:'a',stores:{},slots:[],cursor:0,effects:[],remote:false,recorded:()=>false,jobs:[],stops:0,notices:[],dismissed:[],configured:[],catalog:()=>Promise.reject(new Error('no catalog')),
  begin(){this.cursor=0;},commit(){for(const f of this.effects.splice(0))f();},unmount(){for(const s of this.slots)s?.cleanup?.();this.slots=[];this.effects=[];}};
 const changed=(a,b)=>!a||!b||a.length!==b.length||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const i=controls.cursor++;if(!(i in controls.slots))controls.slots[i]=typeof initial==='function'?initial():initial;return [controls.slots[i],v=>{controls.slots[i]=typeof v==='function'?v(controls.slots[i]):v;}];}
 export function useRef(initial){const i=controls.cursor++;if(!(i in controls.slots))controls.slots[i]={current:initial};return controls.slots[i];}
 export function useMemo(fn,deps){const i=controls.cursor++,old=controls.slots[i];if(!old||changed(old.deps,deps))controls.slots[i]={deps,value:fn()};return controls.slots[i].value;}
 export const useCallback=(fn,deps)=>useMemo(()=>fn,deps);
 export function useEffect(fn,deps){const i=controls.cursor++,old=controls.slots[i];if(!old||changed(old.deps,deps))controls.effects.push(()=>{old?.cleanup?.();controls.slots[i]={deps,cleanup:fn()};});}
 export const createContext=()=>({Provider:'provider'}),useContext=()=>null,jsx=(type,props)=>({type,props}),jsxs=jsx;
 const isCurrentUser=id=>id===controls.actor;export const useAuth=()=>({user:controls.actor?{id:controls.actor}:null,isCurrentUser});
 export const useLearnerDeviceStore=kind=>controls.stores[kind];
 export const configureUtterance=(u,locale,voiceURI)=>{controls.configured.push({locale,voiceURI});};
 export const needsRemoteTTS=()=>controls.remote,hasRecordedListeningAudio=(text,locale,gender)=>controls.recorded(text,locale,gender),stopRemoteTTS=()=>controls.stops++;
 export const speakRemote=(text,locale,opts)=>{controls.jobs.push({text,locale,opts});return Promise.resolve();};
 export const getMissionTtsCapabilities=(accent,signal)=>controls.catalog(accent,signal);
 export const toast=Object.assign((title,opts)=>{controls.notices.push({title,...opts});},{dismiss:id=>controls.dismissed.push(id)});
`;

async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/listening-provider-"));
  const saved = {
    window: globalThis.window,
    utterance: globalThis.SpeechSynthesisUtterance,
    set: globalThis.setTimeout,
    clear: globalThis.clearTimeout,
  };
  const timers = new Map(),
    utterances = [];
  let timerId = 0;
  globalThis.setTimeout = (fn) => {
    const id = ++timerId;
    timers.set(id, fn);
    return id;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  globalThis.window = {
    speechSynthesis: { cancel() {}, speak: (u) => utterances.push(u) },
  };
  try {
    const outfile = join(dir, "provider.mjs");
    await build({
      stdin: {
        contents: `export {SpeechProvider} from './src/state/speech-state';export {controls} from 'fixture';`,
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
          name: "provider-host",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|react\/jsx-runtime|sonner|@\/state\/auth-state|@\/hooks\/use-learner-device-store|@\/lib\/(voices|tts|mission-tts))$/,
              },
              () => ({ path: "host", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: FIXTURE }));
          },
        },
      ],
    });
    const { SpeechProvider, controls: c } = await import(outfile);
    const records = new Map();
    const storage = {
      getItem: (k) => records.get(k) ?? null,
      setItem: (k, v) => records.set(k, v),
    };
    const signIn = (actor) => {
      c.actor = actor;
      c.stores = Object.fromEntries(
        ["speech", "heardWords"].map((kind) => [
          kind,
          createLearnerDeviceStore({ kind, actor, storage, isCurrent: () => c.actor === actor }),
        ]),
      );
    };
    const props = {
      children: null,
      language: "Spanish",
      onXp() {},
      onAchievement() {},
      hasAchievement: () => false,
    };
    const render = () => {
      c.begin();
      const value = SpeechProvider(props).props.value;
      c.commit();
      return value;
    };
    /** Render until hydration, voice resolution and their follow-up effects have settled. */
    const settle = async () => {
      let value;
      for (let pass = 0; pass < 4; pass++) {
        value = render();
        await tick();
      }
      return render();
    };
    const drain = () => {
      const jobs = [...timers.values()];
      timers.clear();
      jobs.forEach((fn) => fn());
    };
    const savedFor = (actor) =>
      JSON.parse(records.get(learnerDeviceKey("speech", actor)) ?? "null")?.data ?? null;
    signIn("a");
    await run({ c, props, render, settle, drain, signIn, savedFor, utterances, timers });
    c.unmount();
  } finally {
    globalThis.window = saved.window;
    globalThis.SpeechSynthesisUtterance = saved.utterance;
    globalThis.setTimeout = saved.set;
    globalThis.clearTimeout = saved.clear;
    rmSync(dir, { recursive: true, force: true });
  }
}

test("the listening choice is saved per learner and language, and restored for that learner only", () =>
  fixture(async ({ c, props, settle, signIn, savedFor }) => {
    c.catalog = async () => CATALOG;
    let v = await settle();
    assert.equal(v.voiceSettings.listeningAudioSource, "hd", "HD is the default");
    assert.equal(v.listening.mode, "hd");

    v.setVoiceSettings({ listeningAudioSource: "device", listeningGender: "man" });
    v = await settle();
    assert.equal(v.listening.mode, "device");
    assert.deepEqual(savedFor("a").standardVoicesByLang.Spanish, {
      listeningGender: "man",
      listeningAudioSource: "device",
      speakingGender: "woman",
      speakingAudioSource: "google",
    });

    // Another language of the same learner keeps its own choice.
    props.language = "French";
    v = await settle();
    assert.equal(v.voiceSettings.listeningAudioSource, "hd");
    assert.equal(v.voiceSettings.listeningGender, "woman");
    props.language = "Spanish";
    v = await settle();
    assert.equal(v.voiceSettings.listeningAudioSource, "device");
    assert.equal(v.voiceSettings.listeningGender, "man");

    // Another account on the same device starts from the standard, and saves nothing into A's record.
    c.unmount();
    signIn("b");
    v = await settle();
    assert.equal(v.voiceSettings.listeningAudioSource, "hd");
    assert.equal(v.voiceSettings.listeningGender, "woman");
    v.setVoiceSettings({ listeningGender: "man" });
    await settle();
    assert.equal(savedFor("b").standardVoicesByLang.Spanish.listeningAudioSource, "hd");
    assert.equal(savedFor("a").standardVoicesByLang.Spanish.listeningAudioSource, "device");

    // A returns: the device-voice choice is still theirs.
    c.unmount();
    signIn("a");
    v = await settle();
    assert.equal(v.voiceSettings.listeningAudioSource, "device");
    assert.equal(v.voiceSettings.listeningGender, "man");
    // A guest is separate from both.
    c.unmount();
    signIn(null);
    v = await settle();
    assert.equal(v.voiceSettings.listeningAudioSource, "hd");
    assert.equal(v.listening.mode, "recordings");
  }));

test("with HD chosen, reading goes to the HD voice in the chosen gender and never to a device voice", () =>
  fixture(async ({ c, settle, drain, utterances }) => {
    c.catalog = async () => CATALOG;
    let v = await settle();
    assert.equal(v.voiceURI, AOEDE);
    v.speakSentence("Conecto la tierra al panel.", 0);
    drain();
    assert.equal(c.jobs.length, 1);
    assert.equal(c.jobs[0].locale, "es-CR");
    assert.equal(c.jobs[0].opts.voiceURI, AOEDE);
    assert.equal(c.jobs[0].opts.cloudOnly, true, "HD only");
    assert.equal(c.jobs[0].opts.recordedGender, "female");
    assert.equal(c.jobs[0].opts.owner.userId, "a");
    c.jobs[0].opts.onend("hd");

    v.setVoiceSettings({ listeningGender: "man" });
    v = await settle();
    assert.equal(v.voiceURI, CHARON);
    v.speakWord("conectar");
    drain();
    assert.equal(c.jobs[1].opts.voiceURI, CHARON);
    assert.equal(c.jobs[1].opts.recordedGender, "male");
    assert.equal(c.jobs[1].opts.cloudOnly, true);
    assert.equal(utterances.length, 0);
  }));

test("an explicit Device voice choice reads with the device voice even while HD voices are ready", () =>
  fixture(async ({ c, settle, drain, utterances }) => {
    c.catalog = async () => CATALOG;
    let v = await settle();
    v.setVoiceSettings({ listeningAudioSource: "device" });
    v = await settle();
    assert.equal(v.voiceURI, AOEDE, "the HD voice stays resolved for a switch back");
    v.speakSentence("Conecto el cable.", 0);
    drain();
    assert.equal(c.jobs.length, 0, "nothing was sent to the HD route");
    assert.equal(utterances.length, 1);
    assert.equal(utterances[0].text, "Conecto el cable.");
    assert.deepEqual(c.configured.at(-1), { locale: "es-CR", voiceURI: DEVICE_DEFAULT_VOICE });
    assert.equal(c.notices.length, 0);
  }));

test("HD audio that cannot play is reported with a retry; the device voice plays only if the learner picks it", () =>
  fixture(async ({ c, settle, drain, utterances, render }) => {
    c.catalog = async () => CATALOG;
    let v = await settle();
    v.speakSentence("Conecto la tierra al panel.", 3);
    drain();
    v = render();
    assert.equal(v.playing, true);
    c.jobs[0].opts.onerror("unavailable");
    v = render();
    assert.equal(v.playing, false, "the surface is released, not left waiting");
    assert.equal(v.activeSentenceIndex, -1);
    assert.equal(utterances.length, 0, "nothing was read in another voice");
    assert.equal(c.notices.length, 1);
    const notice = c.notices[0];
    assert.equal(notice.title, "The HD voice could not play this");
    assert.equal(notice.action.label, "Try again");
    assert.equal(notice.cancel.label, "Use device voice");
    assert.doesNotMatch(JSON.stringify(notice), /google|chirp/i);

    // "Try again" stays HD only.
    notice.action.onClick();
    drain();
    assert.equal(c.jobs.length, 2);
    assert.equal(c.jobs[1].text, "Conecto la tierra al panel.");
    assert.equal(c.jobs[1].opts.cloudOnly, true);
    assert.equal(render().listeningFallback, false);
    c.jobs[1].opts.onerror("busy");
    assert.equal(c.notices.at(-1).title, "The HD voice is busy");

    // "Use device voice" is the learner's own choice: HD is still tried first, then the device.
    c.notices.at(-1).cancel.onClick();
    drain();
    v = render();
    assert.equal(v.listeningFallback, true);
    assert.equal(v.listening.strict, false);
    assert.equal(c.jobs.length, 3);
    assert.equal(c.jobs[2].opts.cloudOnly, false);
    assert.equal(c.jobs[2].opts.voiceURI, AOEDE);
    // While it lasts, a failure is quiet (the swap was already announced and accepted).
    const noticesSoFar = c.notices.length;
    c.jobs[2].opts.onPlaybackStart("device");
    c.jobs[2].opts.onend("device");
    v = render();
    assert.equal(v.listeningFallback, true);
    assert.equal(c.notices.length, noticesSoFar);

    // The HD voice answers again: the fill-in ends by itself and HD-only resumes.
    v.speakSentence("Conectamos el sistema.", 4);
    drain();
    c.jobs[3].opts.onPlaybackStart("hd");
    c.jobs[3].opts.onend("hd");
    v = render();
    assert.equal(v.listeningFallback, false);
    assert.equal(v.listening.strict, true);
    assert.ok(c.dismissed.includes("listening-hd-unavailable"));
    v.speakSentence("Conectan los cables.", 5);
    drain();
    assert.equal(c.jobs[4].opts.cloudOnly, true);
  }));

test("a passage stops at the sentence that could not play in HD and resumes from it", () =>
  fixture(async ({ c, settle, drain, render, utterances }) => {
    c.catalog = async () => CATALOG;
    let v = await settle();
    const moved = [];
    v.speakSentences(
      [
        { text: "Uno.", index: 0 },
        { text: "Dos.", index: 1 },
        { text: "Tres.", index: 2 },
      ],
      (index) => moved.push(index),
    );
    drain();
    c.jobs[0].opts.onend("recording");
    assert.equal(c.jobs.length, 2);
    c.jobs[1].opts.onerror("offline");
    v = render();
    assert.equal(c.jobs.length, 2, "the third sentence was not run through in silence");
    assert.equal(v.playing, false);
    assert.equal(c.notices.at(-1).title, "The HD voice needs a connection");
    assert.equal(utterances.length, 0);
    assert.deepEqual(moved, [0, 1]);

    c.notices.at(-1).action.onClick();
    drain();
    assert.equal(c.jobs[2].text, "Dos.");
    c.jobs[2].opts.onend("hd");
    assert.equal(c.jobs[3].text, "Tres.");
    c.jobs[3].opts.onend("hd");
    assert.deepEqual(moved, [0, 1, 1, 2]);
    assert.equal(render().playing, false);
  }));

test("stopping, switching language or leaving cancels playback and silences late reports and retries", () =>
  fixture(async ({ c, props, settle, drain, render, utterances }) => {
    c.catalog = async () => CATALOG;
    let v = await settle();
    v.speakSentence("Antes de detener.", 0);
    drain();
    const stopsBefore = c.stops;
    v.stop();
    assert.ok(c.stops > stopsBefore, "the router was told to stop");
    c.jobs[0].opts.onerror("unavailable");
    c.jobs[0].opts.onend("hd");
    assert.equal(c.notices.length, 0, "a stopped playback reports nothing");
    assert.equal(c.jobs[0].opts.owner.isCurrent(), false);

    // A standing notice and the device fill-in do not survive a language switch.
    v.speakSentence("Otra frase.", 1);
    drain();
    c.jobs[1].opts.onerror("unavailable");
    c.notices.at(-1).cancel.onClick();
    drain();
    assert.equal(render().listeningFallback, true);
    const staleRetry = c.notices.at(-1).action.onClick;
    props.language = "French";
    v = await settle();
    assert.equal(v.listeningFallback, false);
    assert.ok(c.dismissed.includes("listening-hd-unavailable"));
    assert.equal(c.jobs.at(-1).opts.owner.isCurrent(), false);

    // After the account subtree is gone, an old notice button does nothing.
    const jobs = c.jobs.length;
    c.unmount();
    staleRetry();
    drain();
    assert.equal(c.jobs.length, jobs);
    assert.equal(utterances.length, 0);
  }));

test("signed out: recordings play without an account; a miss asks first and never swaps voices on its own", () =>
  fixture(async ({ c, settle, drain, render, signIn, utterances }) => {
    c.unmount();
    signIn(null);
    let catalogCalls = 0;
    c.catalog = async () => {
      catalogCalls++;
      return CATALOG;
    };
    c.recorded = (text, locale, gender) =>
      text === "conecto" && locale === "es-CR" && gender === "female";
    const v = await settle();
    assert.equal(v.voiceURI, DEVICE_DEFAULT_VOICE);
    assert.equal(catalogCalls, 0, "no cloud voice is resolved without an account");
    assert.equal(v.listening.mode, "recordings");

    v.speakWord("conecto");
    drain();
    assert.equal(c.jobs.length, 1);
    assert.equal(c.jobs[0].opts.recordedGender, "female");
    assert.equal(c.jobs[0].opts.cloudOnly, true, "HD only: the recording, or a report");
    assert.equal(c.jobs[0].opts.voiceURI, DEVICE_DEFAULT_VOICE);
    assert.equal(c.jobs[0].opts.owner.userId, "");
    c.jobs[0].opts.onend("recording");

    // No recording: HD only is kept. The router is asked (it can only report), nothing is spoken.
    v.speakWord("palabra sin grabación");
    drain();
    assert.equal(c.jobs.length, 2);
    assert.equal(c.jobs[1].opts.cloudOnly, true);
    assert.equal(c.jobs[1].opts.unavailableReason, "sign-in");
    assert.equal(c.jobs[1].opts.voiceURI, DEVICE_DEFAULT_VOICE, "no cloud voice without an account");
    assert.equal(c.jobs[1].opts.owner.userId, "");
    c.jobs[1].opts.onerror("sign-in");
    assert.equal(utterances.length, 0, "this device's voice did not stand in");
    assert.equal(c.notices.length, 1);
    assert.equal(c.notices[0].title, "Sign in to hear this in the HD voice");
    assert.equal(c.notices[0].cancel.label, "Use device voice");
    assert.equal(catalogCalls, 0, "still no cloud request for a signed-out learner");

    // The learner's own choice: this device's voice fills in for the rest of the visit.
    c.notices[0].cancel.onClick();
    drain();
    assert.equal(render().listeningFallback, true);
    assert.equal(utterances.length, 1);
    assert.equal(utterances[0].text, "palabra sin grabación");
    assert.equal(c.jobs.length, 2, "the device path, not the HD route");
    utterances[0].onend();
    // Recordings are still preferred while the device voice fills in.
    render().speakWord("conecto");
    drain();
    assert.equal(c.jobs.length, 3);
    assert.equal(c.jobs[2].opts.recordedGender, "female");
    assert.equal(c.jobs[2].opts.cloudOnly, false);
    assert.equal(c.notices.length, 1, "asked once, not on every word");
  }));

test("changing the listening gender drops the old voice at once; a speaking-only change keeps it", () =>
  fixture(async ({ c, settle, drain, render }) => {
    c.catalog = async () => CATALOG;
    let v = await settle();
    assert.equal(v.voiceURI, AOEDE);

    // Speaking partner changes never touch the listening voice.
    v.setVoiceSettings({ speakingGender: "man", speakingAudioSource: "device" });
    v = render();
    assert.equal(v.voiceURI, AOEDE);
    assert.equal(v.listening.pending, null);

    // Listening gender changes: before the new voice has resolved, the female voice is gone.
    v.setVoiceSettings({ listeningGender: "man" });
    v = render();
    assert.equal(v.voiceSettings.listeningGender, "man");
    assert.equal(v.voiceURI, null, "the previous gender's voice is not kept");
    assert.equal(v.listening.pending, "loading");
    v.speakWord("conectar");
    drain();
    const quick = c.jobs.at(-1).opts;
    assert.notEqual(quick.voiceURI, AOEDE, "a quick tap is never read by the previous gender");
    assert.equal(quick.voiceURI, DEVICE_DEFAULT_VOICE);
    assert.equal(quick.recordedGender, "male", "a recording, if any, is the new gender's");
    assert.equal(quick.cloudOnly, true);
    assert.equal(quick.unavailableReason, "loading");

    v = await settle();
    assert.equal(v.voiceURI, CHARON);
    // Choosing the gender that is already selected changes nothing.
    v.setVoiceSettings({ listeningGender: "man" });
    assert.equal(render().voiceURI, CHARON);
  }));

test("the resolved HD voice is remembered for the same accent and gender, so saved audio works offline", () =>
  fixture(async ({ c, settle, drain, signIn, savedFor }) => {
    c.catalog = async () => CATALOG;
    let v = await settle();
    assert.equal(v.voiceURI, AOEDE);
    assert.deepEqual(savedFor("a").hdVoiceByLang.Spanish, {
      accent: "es-CR",
      gender: "woman",
      voiceURI: AOEDE,
    });

    // Next visit with no connection: the voice list cannot be fetched.
    c.unmount();
    signIn("a");
    c.catalog = () => Promise.reject(new TypeError("Failed to fetch"));
    v = await settle();
    assert.equal(v.voiceURI, AOEDE, "recorded and saved clips keep their HD voice");
    assert.equal(v.listening.mode, "hd");
    assert.equal(v.listening.pending, null);
    v.speakWord("conectar");
    drain();
    assert.equal(c.jobs.at(-1).opts.voiceURI, AOEDE);
    assert.equal(c.jobs.at(-1).opts.cloudOnly, true);

    // A different gender was never resolved: nothing is guessed, and a miss says why.
    v.setVoiceSettings({ listeningGender: "man" });
    v = await settle();
    assert.equal(v.voiceURI, DEVICE_DEFAULT_VOICE);
    assert.equal(v.listening.mode, "hd");
    assert.equal(v.listening.pending, "unavailable");
    v.speakWord("conectar");
    drain();
    assert.equal(c.jobs.at(-1).opts.recordedGender, "male");
    assert.equal(c.jobs.at(-1).opts.cloudOnly, true);
    assert.equal(c.jobs.at(-1).opts.unavailableReason, "unavailable");

    // When the provider itself says it has no voice, the remembered one is dropped.
    c.unmount();
    signIn("a");
    c.catalog = async () => ({ ...CATALOG, ready: false, voices: [] });
    v = await settle();
    assert.equal(v.voiceURI, DEVICE_DEFAULT_VOICE);
    assert.equal(savedFor("a").hdVoiceByLang.Spanish, undefined);
  }));
