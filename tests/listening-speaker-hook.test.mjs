// The real useListeningSpeaker + useOwnedPlayback (the speaker behind match tiles, cards,
// verb forms and the word card) with the real listening rules. The audio router is a stand-in
// so each tap's routing can be read; the speech context is driven by the test.
import assert from "node:assert/strict";
import nodeTest from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { encodeGoogleVoicePreference } from "../src/data/mission-tts.ts";
import { DEVICE_DEFAULT_VOICE } from "../src/data/mobile-voice.ts";

const test = (name, fn) => nodeTest(name, { timeout: 30_000 }, fn);
const AOEDE = encodeGoogleVoicePreference({
  name: "es-US-Chirp3-HD-Aoede",
  languageCodes: ["es-US"],
});

const FIXTURE = `
 import { planListening } from './src/lib/listening-audio.ts';
 export const controls={actor:'a',host:null,jobs:[],issues:[],played:[],planned:[],
  speech:{accent:'es-CR',rate:1,voiceURI:null,source:'hd',gender:'woman',fallback:false}};
 const changed=(a,b)=>!a||a.length!==b.length||a.some((v,i)=>v!==b[i]);
 export function useRef(initial){const h=controls.host,i=h.cursor++;if(!(i in h.slots))h.slots[i]={current:initial};return h.slots[i];}
 export function useCallback(fn,deps){const h=controls.host,i=h.cursor++,old=h.slots[i];if(!old||changed(old.deps,deps))h.slots[i]={deps,fn};return h.slots[i].fn;}
 export function useEffect(fn,deps){const h=controls.host,i=h.cursor++,old=h.slots[i];if(!old||changed(old.deps,deps))h.effects.push(()=>{old?.cleanup?.();h.slots[i]={deps,cleanup:fn()};});}
 const isCurrentUser=id=>controls.actor===id;
 export const useAuth=()=>({user:controls.actor?{id:controls.actor}:null,isCurrentUser});
 export const ACCENTS_BY_LANGUAGE={Spanish:[{code:'es-CR'},{code:'es-MX'}],French:[{code:'fr-FR'}],English:[{code:'en-US'}],Chinese:[{code:'zh-CN'}]};
 const listeningPlan=locale=>{const s=controls.speech;controls.planned.push(locale);return planListening({locale:locale??s.accent,learningLocale:s.accent,source:s.source,gender:s.gender,voiceURI:s.voiceURI,signedIn:controls.actor!==null,deviceFallback:s.fallback});};
 const reportListeningIssue=(reason,retry)=>controls.issues.push({reason,retry});
 const noteListeningPlayed=source=>controls.played.push(source);
 export const useSpeech=()=>{const s=controls.speech;return {accent:s.accent,rate:s.rate,voiceURI:s.voiceURI,voiceSettings:{listeningAudioSource:s.source,listeningGender:s.gender},listeningPlan,reportListeningIssue,noteListeningPlayed};};
 export const speakRemote=(text,locale,opts)=>{controls.jobs.push({text,locale,opts});return Promise.resolve();};
`;

async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/listening-speaker-"));
  try {
    const outfile = join(dir, "hook.mjs");
    await build({
      stdin: {
        contents: `export {useListeningSpeaker,listeningLocale} from './src/hooks/use-listening-speaker';export {controls} from 'fixture';`,
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
              { filter: /^(fixture|react|@\/state\/(auth|speech)-state|@\/lib\/tts)$/ },
              () => ({ path: "host", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: FIXTURE,
              resolveDir: process.cwd(),
            }));
          },
        },
      ],
    });
    const m = await import(outfile),
      c = m.controls;
    const host = () => ({ slots: [], effects: [], cursor: 0 });
    const render = (h, scope, language) => {
      c.host = h;
      h.cursor = 0;
      const speaker = m.useListeningSpeaker(scope, language);
      for (const f of h.effects.splice(0)) f();
      return speaker;
    };
    const unmount = (h) => {
      for (const s of h.slots) s?.cleanup?.();
      h.slots = [];
    };
    await run({ m, c, host, render, unmount });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("a tapped word is read by the chosen listening voice: HD only, recording gender, learner's speed", () =>
  fixture(async ({ c, host, render }) => {
    const kit = host();
    c.speech.voiceURI = AOEDE;
    c.speech.rate = 0.85;
    let speaker = render(kit, "lesson-kit", "Spanish");
    assert.equal(speaker.locale, "es-CR");
    speaker.speak("conecto");
    assert.equal(c.jobs.length, 1);
    const job = c.jobs[0];
    assert.equal(job.text, "conecto");
    assert.equal(job.locale, "es-CR");
    assert.equal(job.opts.voiceURI, AOEDE);
    assert.equal(job.opts.cloudOnly, true);
    assert.equal(job.opts.recordedGender, "female");
    assert.equal(job.opts.rate, 0.85);
    assert.equal(job.opts.owner.userId, "a");
    assert.equal(job.opts.owner.isCurrent(), true);
    job.opts.onPlaybackStart("recording");
    assert.deepEqual(c.played, ["recording"]);

    // The learner's accent and gender follow into the next tap.
    c.speech.accent = "es-MX";
    c.speech.gender = "man";
    speaker = render(kit, "lesson-kit", "Spanish");
    speaker.speak("conectas");
    assert.equal(c.jobs[1].locale, "es-MX");
    assert.equal(c.jobs[1].opts.recordedGender, "male");
    assert.equal(c.jobs[0].opts.signal.aborted, true, "the earlier word stops for the new one");
    speaker.speak("");
    assert.equal(c.jobs.length, 2, "nothing to read");
  }));

test("each listening state routes as Settings describes it", () =>
  fixture(async ({ c, host, render }) => {
    const kit = host();
    const tap = (text = "conectar") => {
      const speaker = render(kit, "lesson-kit", "Spanish");
      speaker.speak(text);
      return c.jobs.at(-1).opts;
    };
    // HD chosen, voice list still loading: a recording may play; a miss says the voice is loading.
    c.speech.voiceURI = null;
    let opts = tap();
    assert.equal(opts.cloudOnly, true);
    assert.equal(opts.recordedGender, "female");
    assert.equal(opts.unavailableReason, "loading");
    assert.equal(opts.voiceURI, DEVICE_DEFAULT_VOICE, "never a cloud voice that is not resolved");
    // HD chosen, HD voices unavailable.
    c.speech.voiceURI = DEVICE_DEFAULT_VOICE;
    opts = tap();
    assert.equal(opts.cloudOnly, true);
    assert.equal(opts.unavailableReason, "unavailable");
    // The learner let the device voice fill in.
    c.speech.voiceURI = AOEDE;
    c.speech.fallback = true;
    opts = tap();
    assert.equal(opts.cloudOnly, false);
    assert.equal(opts.voiceURI, AOEDE, "HD is still tried first");
    c.speech.fallback = false;
    // Device voice chosen: no HD voice and no recording lookup.
    c.speech.source = "device";
    opts = tap();
    assert.equal(opts.cloudOnly, false);
    assert.equal(opts.recordedGender, undefined);
    assert.equal(opts.voiceURI, DEVICE_DEFAULT_VOICE);
    c.speech.source = "hd";
    // Signed out: recordings by gender without an account; a miss asks, it does not swap voices.
    c.actor = null;
    c.speech.voiceURI = DEVICE_DEFAULT_VOICE;
    opts = tap();
    assert.equal(opts.cloudOnly, true);
    assert.equal(opts.recordedGender, "female");
    assert.equal(opts.unavailableReason, "sign-in");
    assert.equal(opts.voiceURI, DEVICE_DEFAULT_VOICE);
    assert.equal(opts.owner.userId, "");
    opts.onerror("sign-in");
    assert.equal(c.issues.at(-1).reason, "sign-in");
    // ...until the signed-out learner allows the device voice.
    c.speech.fallback = true;
    opts = tap();
    assert.equal(opts.cloudOnly, false);
    assert.equal(opts.recordedGender, "female");
  }));

test("HD audio that cannot play is reported once per tap with a retry that follows the learner's answer", () =>
  fixture(async ({ c, host, render }) => {
    const kit = host();
    c.speech.voiceURI = AOEDE;
    const speaker = render(kit, "lesson-kit", "Spanish");
    let surfaceErrors = 0;
    speaker.speak("conectamos", { onerror: () => surfaceErrors++ });
    c.jobs[0].opts.onerror("busy");
    assert.equal(surfaceErrors, 1);
    assert.equal(c.issues.length, 1);
    assert.equal(c.issues[0].reason, "busy");

    // "Try again": the same word, still HD only.
    c.issues[0].retry();
    assert.equal(c.jobs.length, 2);
    assert.equal(c.jobs[1].text, "conectamos");
    assert.equal(c.jobs[1].opts.cloudOnly, true);
    c.jobs[1].opts.onerror("busy");

    // "Use device voice": the provider flips the policy, then the retry reads it as it is now.
    c.speech.fallback = true;
    c.issues[1].retry();
    assert.equal(c.jobs.length, 3);
    assert.equal(c.jobs[2].text, "conectamos");
    assert.equal(c.jobs[2].opts.cloudOnly, false);
    // Re-rendering for that change must not cancel the retry that just started.
    render(kit, "lesson-kit", "Spanish");
    assert.equal(c.jobs[2].opts.signal.aborted, false);
    assert.equal(c.jobs[2].opts.owner.isCurrent(), true);
    // A device-voice failure is not an HD notice.
    c.jobs[2].opts.onerror();
    assert.equal(c.issues.length, 2);
  }));

test("playback belongs to its surface: leaving, another learner or a new voice ends it and its retries", () =>
  fixture(async ({ c, host, render, unmount }) => {
    c.speech.voiceURI = AOEDE;
    const match = host(),
      card = host();
    const matchSpeaker = render(match, "match", "Spanish");
    const cardSpeaker = render(card, "card", "Spanish");
    matchSpeaker.speak("el cable");
    const tile = c.jobs.at(-1);
    cardSpeaker.speak("conectar");
    const cardJob = c.jobs.at(-1);
    // Leaving the match step cancels only its own audio.
    unmount(match);
    assert.equal(tile.opts.signal.aborted, true);
    assert.equal(tile.opts.owner.isCurrent(), false);
    assert.equal(cardJob.opts.signal.aborted, false);
    assert.equal(cardJob.opts.owner.isCurrent(), true);
    // A late failure from the surface that left starts nothing new.
    const before = c.jobs.length;
    matchSpeaker.speak("tarde");
    assert.equal(c.jobs.length, before);
    cardJob.opts.onerror("offline");
    const retry = c.issues.at(-1).retry;

    // The voice changes (Settings): the playing word stops; the new voice is used next.
    c.speech.gender = "man";
    const fresh = render(card, "card", "Spanish");
    assert.equal(cardJob.opts.signal.aborted, true);
    cardSpeaker.speak("viejo");
    assert.equal(c.jobs.length, before, "a speaker from before the change is ignored");
    fresh.speak("conecta");
    assert.equal(c.jobs.at(-1).opts.recordedGender, "male");

    // Another learner signs in: this surface's speaker and its pending retry are dead.
    c.actor = "b";
    const jobs = c.jobs.length;
    fresh.speak("otro");
    retry();
    assert.equal(c.jobs.length, jobs);
    assert.equal(c.jobs.at(-1).opts.owner.isCurrent(), false);
    unmount(card);
    retry();
    assert.equal(c.jobs.length, jobs);
  }));

test("multilingual: a surface in another language never borrows the selected language's HD voice", () =>
  fixture(async ({ m, c, host, render }) => {
    assert.equal(m.listeningLocale("es-MX", "Spanish"), "es-MX");
    assert.equal(m.listeningLocale("es-MX", "French"), "fr-FR");
    assert.equal(m.listeningLocale("es-MX", "English"), "en-US");
    assert.equal(m.listeningLocale("es-MX"), "es-MX");
    assert.equal(m.listeningLocale("es-MX", "Klingon"), "es-MX");

    c.speech.voiceURI = AOEDE;
    // A native-language card back (English) while learning Spanish, signed in and signed out:
    // the requested locale is planned with the learner's real state, never a pretended one.
    for (const actor of ["a", null]) {
      c.actor = actor;
      c.speech.voiceURI = actor ? AOEDE : DEVICE_DEFAULT_VOICE;
      const back = render(host(), "flashcard-back", "English");
      assert.equal(back.locale, "en-US");
      back.speak("to connect");
      assert.equal(c.planned.at(-1), "en-US", "planned for the locale that is spoken");
      const job = c.jobs.at(-1);
      assert.equal(job.locale, "en-US");
      assert.equal(job.opts.voiceURI, DEVICE_DEFAULT_VOICE, "not the Spanish HD voice");
      assert.equal(job.opts.cloudOnly, false, "the device voice reads it, as before");
      assert.equal(job.opts.recordedGender, undefined);
      assert.equal(job.opts.unavailableReason, undefined);
      assert.equal(job.opts.owner.userId, actor ?? "", "the real account state is passed on");
      job.opts.onerror();
      assert.equal(c.issues.length, 0, "no sign-in or HD notice for native-language text");
    }
    c.actor = "a";
    let job;

    // A language with no HD voice reads with the device voice.
    c.speech.accent = "zh-CN";
    c.speech.voiceURI = DEVICE_DEFAULT_VOICE;
    const chinese = render(host(), "kit", "Chinese");
    chinese.speak("你好");
    job = c.jobs.at(-1);
    assert.equal(job.locale, "zh-CN");
    assert.equal(job.opts.cloudOnly, false);
    assert.equal(job.opts.recordedGender, undefined);
  }));
