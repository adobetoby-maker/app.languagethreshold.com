// The real Listening Drill, battle review, saved-words drawer, Sound Practice and Say It card
// components on the real listening hooks and rules. Each test taps what a learner taps and reads what the
// audio router was asked to play: the learner's listening voice (recorded HD audio, then the
// HD voice, never a silent device voice), with playback tied to the item it belongs to.
import assert from "node:assert/strict";
import nodeTest from "node:test";
import { fakeTimers, HD_VOICE, loadSurface } from "./helpers/listening-surface.mjs";
import { DEVICE_DEFAULT_VOICE } from "../src/data/mobile-voice.ts";
import { soundLesson } from "../src/data/sound-like-a-native.ts";

const test = (name, fn) => nodeTest(name, { timeout: 30_000 }, fn);
const tick = () => new Promise((r) => setImmediate(r));
const APP = `
 controls.app={activeModuleId:'roofing',selectedLanguage:'Spanish',nativeLanguage:'English'};
 controls.dispatches=[];
 export const useApp=()=>({state:controls.app,dispatch:action=>controls.dispatches.push(action)});
`;
/** What every HD-only request for the signed-in learner looks like. */
function assertHd(job, { text, locale = "es-CR", gender = "female", rate = 1 }) {
  assert.equal(job.text, text);
  assert.equal(job.locale, locale);
  assert.equal(job.opts.voiceURI, HD_VOICE);
  assert.equal(job.opts.cloudOnly, true, "HD only: no silent device voice");
  assert.equal(job.opts.recordedGender, gender);
  assert.equal(job.opts.rate, rate);
  assert.equal(job.opts.owner.userId, "a");
  assert.equal(job.opts.owner.isCurrent(), true);
}

// ─── Listening Drill ──────────────────────────────────────────────────────────

const DRILL = `
 ${APP}
 export const PhoneActivity='phone-activity';
 export const useServerFn=fn=>fn,generateListeningDrill=async()=>({data:null,error:'not used'}),MODULES=[];
 const phrases=['Trae los clavos.','Antes de subir al techo, revisa el equipo.','Baja la escalera.'];
 const question=i=>({question:{phrase:phrases[i],englishTranslation:'English',cefr:'A2',topic:'Roofing',options:[phrases[i],'Otra frase.','No subas.','Trae agua.'],correctIndex:0,listenFor:'Listen.'},playCount:0,submitted:false,selectedIndex:null,correct:false});
 controls.ld={RUN_LENGTH:5,state:{run:null,leaderboard:{},loading:false,error:null},setFetcher(){},
  startRun(language){this.state.run={language,index:0,questions:[question(0)]};},
  currentQuestion(){const run=this.state.run;return run?run.questions[run.index]??null:null;},
  runScore(){return {correct:0,total:0};},
  loadQuestion(){const run=this.state.run;run.questions[run.index]=question(run.index);},
  incrementPlays(){const current=this.currentQuestion();if(current)current.playCount++;},
  answer(index){const current=this.currentQuestion();current.submitted=true;current.selectedIndex=index;current.correct=index===current.question.correctIndex;},
  advance(){this.state.run.index++;},isRunComplete(){return false;},endRun(){this.state.run=null;}};
 export const useListeningDrill=()=>controls.ld;
`;
const drill = () =>
  loadSurface({
    entry: "src/components/listening-drill/ListeningDrill.tsx",
    exports: ["ListeningDrill"],
    replace:
      /^(@\/components\/PhoneActivity|@tanstack\/react-start|@\/state\/(app|listening-drill)-state|@\/data\/modules|@\/fns\/listening-drill\.functions)$/,
    standins: DRILL,
  });
const startRun = (host) =>
  host.click(host.where((el) => el.type === "button" && /Start Run/.test(host.text(el)))[0]);

test("Listening Drill: each phrase plays in the learner's listening voice at their speed, and belongs to its question", async () => {
  const { mod, L, S, host, jsx } = await drill();
  L.speech.voiceURI = HD_VOICE;
  L.speech.rate = 0.85;
  host.render(jsx(mod.ListeningDrill, {}));
  assert.equal(L.jobs.length, 0, "nothing plays in the lobby");
  startRun(host);
  assert.equal(L.jobs.length, 1, "a fresh question plays once by itself");
  assertHd(L.jobs[0], { text: "Trae los clavos.", rate: 0.85 });
  assert.equal(S.controls.ld.currentQuestion().playCount, 1);

  // Replay: the same phrase again, still HD only.
  host.click(host.button("Play audio"));
  assert.equal(L.jobs.length, 2);
  assertHd(L.jobs[1], { text: "Trae los clavos.", rate: 0.85 });
  assert.equal(L.jobs[0].opts.owner.isCurrent(), false, "the earlier play gave way");
  assert.equal(S.controls.ld.currentQuestion().playCount, 2);

  // Answering stops the phrase.
  host.click(host.where((el) => el.type === "button" && host.text(el).includes("Otra frase."))[0]);
  assert.equal(L.jobs[1].opts.signal.aborted, true);
  assert.equal(L.jobs[1].opts.owner.isCurrent(), false);
  assert.equal(L.jobs.length, 2, "answering never replays");

  // Next question: its own phrase plays, and nothing from the previous question can.
  host.click(host.one("listening-next"));
  host.render();
  assert.equal(L.jobs.length, 3);
  assertHd(L.jobs[2], { text: "Antes de subir al techo, revisa el equipo.", rate: 0.85 });
  for (const earlier of L.jobs.slice(0, 2)) assert.equal(earlier.opts.owner.isCurrent(), false);

  // A miss is reported with a retry of the same phrase; nothing else is played.
  L.jobs[2].opts.onerror("busy");
  assert.equal(L.issues.at(-1).reason, "busy");
  assert.equal(L.issues.at(-1).tryAgain(), true);
  assertHd(L.jobs[3], { text: "Antes de subir al techo, revisa el equipo.", rate: 0.85 });

  // Leaving the drill, or another learner, ends this question's audio.
  const playing = L.jobs[3];
  host.unmount();
  assert.equal(playing.opts.signal.aborted, true);
  assert.equal(playing.opts.owner.isCurrent(), false);
});

test("Listening Drill: accent, gender, the device choice and signed-out learners follow the listening rules", async () => {
  const { mod, L, S, host, jsx } = await drill();
  const play = (setup) => {
    host.unmount();
    S.controls.ld.state.run = null;
    setup();
    host.render(jsx(mod.ListeningDrill, {}));
    startRun(host);
    return L.jobs.at(-1);
  };
  let job = play(() => {
    L.speech.voiceURI = HD_VOICE;
    L.speech.accent = "es-MX";
    L.speech.gender = "man";
  });
  assertHd(job, { text: "Trae los clavos.", locale: "es-MX", gender: "male" });

  job = play(() => {
    L.speech.source = "device";
  });
  assert.equal(job.opts.voiceURI, DEVICE_DEFAULT_VOICE, "the learner's device choice is kept");
  assert.equal(job.opts.cloudOnly, false);
  assert.equal(job.opts.recordedGender, undefined);

  job = play(() => {
    L.speech.source = "hd";
    L.actor = null;
    L.speech.voiceURI = DEVICE_DEFAULT_VOICE;
  });
  assert.equal(job.opts.recordedGender, "male", "a public recording needs no account");
  assert.equal(job.opts.cloudOnly, true, "and a miss asks instead of using the device voice");
  assert.equal(job.opts.unavailableReason, "sign-in");
  assert.equal(job.opts.owner.userId, "");

  // A run in another language than the one being learned never borrows the Spanish HD voice.
  job = play(() => {
    L.actor = "a";
    L.speech.voiceURI = HD_VOICE;
    S.controls.app.selectedLanguage = "French";
  });
  assert.equal(job.locale, "fr-FR");
  assert.equal(job.opts.voiceURI, DEVICE_DEFAULT_VOICE);
  assert.equal(job.opts.cloudOnly, false);
  host.unmount();
});

test("Listening Drill: answering or moving on withdraws a 'could not play in HD' notice; its saved buttons replay nothing", async () => {
  const { mod, L, host, jsx } = await drill();
  L.speech.voiceURI = HD_VOICE;
  host.render(jsx(mod.ListeningDrill, {}));
  startRun(host);
  const first = "Trae los clavos.";
  const second = "Antes de subir al techo, revisa el equipo.";

  // The first question's phrase cannot play in HD: the learner is told, with a retry.
  L.jobs[0].opts.onerror("offline");
  const stopped = L.issues.at(-1);
  assert.equal(stopped.standing, true);

  // Answering stops this question's audio. The notice goes with it: pressing a saved button
  // afterwards replays nothing and does not switch the learner to this device's voice.
  host.click(host.where((el) => el.type === "button" && host.text(el).includes("Otra frase."))[0]);
  assert.equal(stopped.standing, false, "stopping withdrew the notice");
  assert.equal(stopped.tryAgain(), false);
  assert.equal(stopped.useDeviceVoice(), false);
  assert.equal(L.jobs.length, 1, "nothing was replayed");
  assert.equal(L.speech.fallback, false, "the device voice was not switched on");

  // A replay that fails again raises a fresh notice; the next question leaves it behind.
  host.click(host.button("Play audio"));
  assert.equal(L.jobs.at(-1).text, first);
  L.jobs.at(-1).opts.onerror("offline");
  const left = L.issues.at(-1);
  assert.equal(left.standing, true);
  host.click(host.one("listening-next"));
  host.render();
  assert.equal(L.jobs.length, 3, "only the next question's own phrase played");
  assert.equal(L.jobs.at(-1).text, second);
  assert.equal(left.standing, false, "the previous question's notice is gone");
  assert.equal(left.useDeviceVoice(), false);
  assert.equal(left.tryAgain(), false);
  assert.equal(L.jobs.length, 3, "the previous phrase is never read over the next question");
  assert.equal(L.speech.fallback, false);

  // In the question it belongs to, the notice still works: the learner's own choice of this
  // device's voice is taken, and the same phrase is read again.
  L.jobs.at(-1).opts.onerror("offline");
  const current = L.issues.at(-1);
  assert.equal(current.useDeviceVoice(), true);
  assert.equal(L.speech.fallback, true);
  assert.equal(L.jobs.length, 4);
  assert.equal(L.jobs.at(-1).text, second);
  assert.equal(L.jobs.at(-1).opts.cloudOnly, false, "the device voice may fill in, as chosen");
  assert.equal(current.tryAgain(), false, "a notice is used once");
  host.unmount();
});

// ─── After-battle review ──────────────────────────────────────────────────────

const REVIEW = `
 ${APP}
 export const useOverlayHistory=()=>{};
 export const toast=()=>{};
 controls.saved=[];
 export const useMatch=()=>({savedVocab:controls.saved,saveVocabWord:word=>{controls.saved.push(word);return true;}});
`;

test("After-battle review: each word is read in its own language by the listening voice, and belongs to its row", async () => {
  const { mod, L, host, jsx } = await loadSurface({
    entry: "src/components/match/BattleReviewPanel.tsx",
    exports: ["BattleReviewPanel"],
    replace: /^(@\/hooks\/use-overlay-history|sonner|@\/state\/(app|match)-state)$/,
    standins: REVIEW,
  });
  L.speech.voiceURI = HD_VOICE;
  const word = (text, language, round) => ({
    word: text,
    correctDefinition: "definition",
    language,
    cefr: "A2",
    round,
    playerCorrect: true,
  });
  const words = [word("la escalera", "Spanish", 1), word("le toit", "French", 2)];
  const panel = (list) =>
    jsx(mod.BattleReviewPanel, { words: list, onPlayAgain() {}, onHome() {}, onClose() {} });
  host.render(panel(words));

  host.click(host.button("Pronounce la escalera"));
  assertHd(L.jobs[0], { text: "la escalera" });
  // A word from another language keeps this device's voice: no mismatched HD voice, no notice.
  host.click(host.button("Pronounce le toit"));
  assert.equal(L.jobs[1].text, "le toit");
  assert.equal(L.jobs[1].locale, "fr-FR");
  assert.equal(L.jobs[1].opts.voiceURI, DEVICE_DEFAULT_VOICE);
  assert.equal(L.jobs[1].opts.cloudOnly, false);
  L.jobs[1].opts.onerror();
  assert.equal(L.issues.length, 0);

  // Each row owns its audio: a row that leaves the list stops, the other row is untouched.
  host.click(host.button("Pronounce la escalera"));
  const spanish = L.jobs.at(-1);
  host.click(host.button("Pronounce le toit"));
  const french = L.jobs.at(-1);
  host.render(panel(words.slice(0, 1)));
  assert.equal(french.opts.signal.aborted, true);
  assert.equal(french.opts.owner.isCurrent(), false);
  assert.equal(spanish.opts.signal.aborted, false);
  assert.equal(spanish.opts.owner.isCurrent(), true);
  L.actor = "b";
  assert.equal(spanish.opts.owner.isCurrent(), false, "another learner never hears it");
  host.unmount();
});

// ─── Saved battle words (Library drawer) ──────────────────────────────────────

const LIBRARY = `
 ${APP}
 export const useOverlayHistory=()=>{};
 export const LegacyLibraryRecovery='legacy-recovery',AddTextModal='add-text',CultureReadingGenerator='culture-generator';
 export const getModule=()=>null,wordCount=()=>0;
 export const useLibrary=()=>({state:{entries:[],languageFilter:[]},dispatch(){},removeCustomEntry(){},setReadStatus(){},setLanguageFilter(){},syncing:false,pendingChanges:0,syncError:null,legacySaved:false,syncLibrary(){}});
 controls.saved=[
  {id:'w1',word:'el martillo',definition:'hammer',language:'Spanish',cefr:'A1',savedAt:1},
  {id:'w2',word:'la teja',definition:'shingle',language:'Spanish',cefr:'A2',savedAt:2},
  {id:'w3',word:'le marteau',definition:'hammer',language:'French',cefr:'A1',savedAt:3}];
 export const useMatch=()=>({savedVocab:controls.saved,removeVocabWord:id=>{controls.saved=controls.saved.filter(word=>word.id!==id);}});
`;

test("Saved words: Pronounce reads the word in its own language by the listening voice; removing a word stops it", async () => {
  const { mod, L, host, jsx } = await loadSurface({
    entry: "src/components/library/LibraryDrawer.tsx",
    exports: ["LibraryDrawer"],
    replace:
      /^(@\/hooks\/use-overlay-history|\.\/(LegacyLibraryRecovery|AddTextModal|CultureReadingGenerator)|@\/state\/(app|library|match)-state|@\/data\/modules)$/,
    standins: LIBRARY,
  });
  L.speech.voiceURI = HD_VOICE;
  L.speech.gender = "man";
  host.render(jsx(mod.LibraryDrawer, { open: true, onClose() {} }));

  host.click(host.button("Pronounce el martillo"));
  assertHd(L.jobs[0], { text: "el martillo", gender: "male" });
  host.click(host.button("Pronounce le marteau"));
  assert.equal(
    L.jobs[1].locale,
    "fr-FR",
    "a word saved from another language is read as that language",
  );
  assert.equal(L.jobs[1].opts.voiceURI, DEVICE_DEFAULT_VOICE, "never by the Spanish HD voice");
  assert.equal(L.jobs[1].opts.cloudOnly, false);

  // Two cards, two owners: playing one does not cancel the other's request by scope...
  host.click(host.button("Pronounce el martillo"));
  const hammer = L.jobs.at(-1);
  host.click(host.button("Pronounce la teja"));
  const shingle = L.jobs.at(-1);
  assert.equal(hammer.opts.signal.aborted, false);
  // ...and removing a word stops that word's audio only.
  host.click(host.button("Remove el martillo"));
  assert.equal(host.button("Pronounce el martillo"), undefined);
  assert.equal(hammer.opts.signal.aborted, true);
  assert.equal(hammer.opts.owner.isCurrent(), false);
  assert.equal(shingle.opts.owner.isCurrent(), true);

  // An HD miss is reported with a retry for that same word.
  shingle.opts.onerror("offline");
  assert.equal(L.issues.at(-1).reason, "offline");
  assert.equal(L.issues.at(-1).tryAgain(), true);
  assertHd(L.jobs.at(-1), { text: "la teja", gender: "male" });

  // A word that is removed takes its notice with it: the saved buttons replay nothing and do
  // not switch the learner to this device's voice.
  L.jobs.at(-1).opts.onerror("offline");
  const removed = L.issues.at(-1);
  assert.equal(removed.standing, true);
  const before = L.jobs.length;
  host.click(host.button("Remove la teja"));
  assert.equal(removed.standing, false, "the notice left with its word");
  assert.equal(removed.tryAgain(), false);
  assert.equal(removed.useDeviceVoice(), false);
  assert.equal(L.jobs.length, before);
  assert.equal(L.speech.fallback, false);

  // Closing the drawer ends the audio of the word that is still listed.
  host.click(host.button("Pronounce le marteau"));
  const last = L.jobs.at(-1);
  host.unmount();
  assert.equal(last.opts.owner.isCurrent(), false, "closing the drawer ends its audio");
});

// ─── Sound Practice ───────────────────────────────────────────────────────────

const SOUND = `
 export const useLearnerDeviceStore=()=>controls.store??(controls.store={read:()=>null,write(){}});
 export const MouthMap='mouth-map';
`;

test("Sound Practice: word anchors are read in the learner's Spanish accent by the listening voice, owned by the active lab", async () => {
  const lesson = soundLesson("sound-like-a-native", 1);
  assert.ok(lesson?.wordAnchors.length, "the lesson has word anchors");
  const { mod, L, host, jsx } = await loadSurface({
    entry: "src/components/sound-practice/SoundPractice.tsx",
    exports: ["SoundPractice"],
    replace: /^(@\/hooks\/use-learner-device-store|\.\/MouthMap)$/,
    standins: SOUND,
  });
  // A spoken run sets a timer and watches page visibility; neither is under test here.
  const saved = ["window", "document"].map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]);
  globalThis.window = { setInterval: () => 1, clearInterval() {} };
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  L.speech.voiceURI = HD_VOICE;
  L.speech.accent = "es-MX";
  const lab = (active) =>
    jsx(mod.SoundPractice, { lesson, moduleId: "sound-like-a-native", lessonNumber: 1, active });
  try {
    host.render(lab(true));
    const anchor = lesson.wordAnchors[0].target;
    host.click(host.button(`Hear ${anchor}`));
    assertHd(L.jobs[0], { text: anchor, locale: "es-MX" });

    host.click(host.button("Hear word row"));
    const row = L.jobs[1];
    assert.match(row.text, /\. /, "the row of anchors is read as one line");
    assertHd(row, { text: row.text, locale: "es-MX" });
    // Starting a spoken run stops the model audio so the learner speaks over silence.
    host.click(host.button("Start sound run"));
    assert.equal(row.opts.signal.aborted, true);
    assert.equal(row.opts.owner.isCurrent(), false);

    // A notice about model audio that could not play never reads over a spoken run either.
    host.click(host.button("Stop run"));
    host.click(host.button("Hear word row"));
    L.jobs.at(-1).opts.onerror("offline");
    const overRun = L.issues.at(-1);
    assert.equal(overRun.standing, true);
    const beforeRun = L.jobs.length;
    host.click(host.button("Start sound run"));
    assert.equal(overRun.standing, false, "starting the run withdrew the notice");
    assert.equal(overRun.tryAgain(), false);
    assert.equal(overRun.useDeviceVoice(), false);
    assert.equal(L.jobs.length, beforeRun, "nothing plays while the learner is speaking");
    assert.equal(L.speech.fallback, false);

    // The lab stops owning audio when its lesson section is no longer the active one.
    host.click(host.button("Stop run"));
    host.click(host.button(`Hear ${anchor}`));
    const playing = L.jobs.at(-1);
    host.render(lab(false));
    assert.equal(playing.opts.signal.aborted, true);
    assert.equal(playing.opts.owner.isCurrent(), false);

    // A learner whose listening language is not Spanish still hears Spanish anchors in a
    // Spanish locale, through this device's voice (their HD choice covers their own language).
    host.unmount();
    L.speech.accent = "fr-FR";
    host.render(lab(true));
    host.click(host.button(`Hear ${anchor}`));
    assert.equal(L.jobs.at(-1).locale, "es-CR");
    assert.equal(L.jobs.at(-1).opts.cloudOnly, false);
    assert.equal(L.jobs.at(-1).opts.voiceURI, DEVICE_DEFAULT_VOICE);
    host.unmount();
  } finally {
    for (const [key, descriptor] of saved)
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
  }
});

// ─── Say It card (lesson speaking practice) ───────────────────────────────────

const SAY_IT = `
 export const Dialog='dialog',DialogContent='dialog-content',DialogTitle='dialog-title';
 controls.recognitions=[];
 class Recognition{constructor(){controls.recognitions.push(this);this.started=false;this.aborted=false;}start(){this.started=true;}stop(){this.onend?.();}abort(){this.aborted=true;}}
 export const recognitionConstructor=()=>Recognition;
`;

/** The page, the timer behind the microphone, and the learner's own recorder and player. */
async function sayItPage(run) {
  const keys = ["window", "document", "setTimeout", "clearTimeout", "MediaRecorder", "Audio"];
  const saved = keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  const clock = fakeTimers();
  const listeners = new Map();
  const players = [];
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.document = {
    visibilityState: "visible",
    addEventListener: (type, fn) => listeners.set(type, fn),
    removeEventListener: (type) => listeners.delete(type),
    querySelector: () => null,
  };
  globalThis.setTimeout = clock.setTimeout;
  globalThis.clearTimeout = clock.clearTimeout;
  globalThis.MediaRecorder = class {
    state = "inactive";
    mimeType = "audio/webm";
    start() {
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
      this.ondataavailable?.({ data: new Blob(["the learner's voice"], { type: this.mimeType }) });
      this.onstop?.();
    }
  };
  globalThis.Audio = class {
    constructor(src) {
      this.src = src;
      players.push(this);
    }
    pause() {
      this.paused = true;
    }
    play() {
      this.playing = true;
      return Promise.resolve();
    }
  };
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
    configurable: true,
  });
  try {
    await run({ clock, listeners, players });
  } finally {
    delete globalThis.navigator.mediaDevices;
    for (const [key, descriptor] of saved)
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
  }
}
const SAY_IT_WORDS = [
  { es: "manguito rotador", en: "rotator cuff", kind: "term" },
  { es: "hombro", en: "shoulder", kind: "term" },
];

test("Say It: Listen and Slow read the model word in the learner's listening voice; the microphone, scoring, My recording and Next are untouched", async () => {
  const { mod, L, S, host, jsx } = await loadSurface({
    entry: "src/components/core30/LessonSayItCard.tsx",
    exports: ["LessonSayItCard"],
    replace: /^(@\/components\/ui\/dialog|@\/lib\/phone-dictation)$/,
    standins: SAY_IT,
  });
  await sayItPage(async ({ listeners, players }) => {
    L.speech.voiceURI = HD_VOICE;
    L.speech.accent = "es-MX";
    L.speech.gender = "man";
    L.speech.rate = 0.85;
    const words = SAY_IT_WORDS;
    let activity = 0;
    const card = () =>
      jsx(mod.LessonSayItCard, {
        words,
        language: "Spanish",
        onActivity: () => activity++,
        onOpenConversation() {},
        online: true,
      });
    const model = { text: "manguito rotador", locale: "es-MX", gender: "male" };
    host.render(card());
    assert.equal(L.jobs.length, 0, "nothing plays until the learner asks");

    // Listen: the learner's speed. Slow: the same word at 0.65 of it, as before.
    host.click(host.button("Listen"));
    assertHd(L.jobs[0], { ...model, rate: 0.85 });
    host.click(host.button("Slow"));
    assertHd(L.jobs[1], { ...model, rate: 0.85 * 0.65 });
    assert.equal(L.jobs[0].opts.owner.isCurrent(), false, "the first play gave way");
    // HD audio that cannot play is reported, and a retry keeps the word and the slow speed.
    L.jobs[1].opts.onerror("busy");
    assert.equal(L.issues.at(-1).reason, "busy");
    assert.equal(L.issues.at(-1).tryAgain(), true);
    assertHd(L.jobs[2], { ...model, rate: 0.85 * 0.65 });

    // Speaking stops the model, and recognition still listens in the same locale.
    const playing = L.jobs[2];
    host.click(host.one("say-word-record"));
    assert.equal(playing.opts.signal.aborted, true);
    assert.equal(playing.opts.owner.isCurrent(), false);
    const recognition = S.controls.recognitions.at(-1);
    assert.equal(recognition.started, true);
    assert.equal(recognition.lang, "es-MX");
    assert.equal(host.button("Listen").props.disabled, true, "no model audio over the microphone");
    assert.equal(host.button("Slow").props.disabled, true);
    await tick();
    recognition.onresult({ results: [{ 0: { transcript: "manguito rotador" } }] });
    recognition.onend();
    host.render();
    assert.match(host.text(host.one("say-word-score")), /100%/, "scoring is unchanged");
    assert.equal(L.jobs.length, 3, "the microphone and the score never use the listening voice");

    // My recording plays the learner's own audio directly, and stops the model first.
    host.click(host.button("Listen"));
    const overRecording = L.jobs.at(-1);
    host.click(host.button("My recording"));
    assert.equal(L.jobs.length, 4, "the learner's recording is not routed through the HD voice");
    assert.equal(players.length, 1);
    assert.match(players[0].src, /^blob:/);
    assert.equal(players[0].playing, true);
    assert.equal(overRecording.opts.signal.aborted, true);

    // Next: the model belongs to its word. It stops, the card resets, and the next word plays.
    host.click(host.button("Listen"));
    const previousWord = L.jobs.at(-1);
    host.click(host.one("say-word-next"));
    assert.equal(previousWord.opts.signal.aborted, true);
    assert.equal(previousWord.opts.owner.isCurrent(), false);
    assert.equal(players[0].paused, true, "the recording stops with the word too");
    assert.equal(host.text(host.one("say-word-target")), "hombro");
    assert.equal(host.all("say-word-score").length, 0);
    host.click(host.button("Listen"));
    assertHd(L.jobs.at(-1), { ...model, text: "hombro", rate: 0.85 });

    // Leaving the page stops the model, as before.
    const whenHidden = L.jobs.at(-1);
    globalThis.document.visibilityState = "hidden";
    listeners.get("visibilitychange")();
    assert.equal(whenHidden.opts.signal.aborted, true);
    globalThis.document.visibilityState = "visible";

    // The learner's own choices and account state are respected.
    host.unmount();
    L.speech.source = "device";
    host.render(card());
    host.click(host.button("Listen"));
    assert.equal(L.jobs.at(-1).opts.voiceURI, DEVICE_DEFAULT_VOICE);
    assert.equal(L.jobs.at(-1).opts.cloudOnly, false);
    host.unmount();
    L.speech.source = "hd";
    L.actor = null;
    L.speech.voiceURI = DEVICE_DEFAULT_VOICE;
    host.render(card());
    host.click(host.button("Slow"));
    const guest = L.jobs.at(-1);
    assert.equal(guest.opts.recordedGender, "male", "a public recording needs no account");
    assert.equal(guest.opts.cloudOnly, true, "and a miss asks instead of using the device voice");
    assert.equal(guest.opts.unavailableReason, "sign-in");
    assert.equal(guest.opts.rate, 0.85 * 0.65);
    assert.equal(guest.opts.owner.userId, "");
    host.unmount();
    assert.equal(guest.opts.signal.aborted, true);
    assert.ok(activity > 0);
  });
});

// ─── The real provider's notice on real surfaces ──────────────────────────────
//
// From here on the speech context is the app's own SpeechProvider. A notice is what the
// provider handed to the toast, so `notice.action.onClick` and `notice.cancel.onClick` are the
// real "Try again" and "Use device voice" handlers, pressed after the learner has moved on.

const hdVoice = (name, gender) => ({
  name: `es-US-Chirp3-HD-${name}`,
  languageCodes: ["es-US"],
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
  voices: [hdVoice("Aoede", "FEMALE"), hdVoice("Charon", "MALE")],
};
const PROBE = `
 import { useSpeech } from './src/state/speech-state';
 export function Probe(){controls.speech=useSpeech();return null;}
`;

/** Mounts the real provider around `children()` and waits for the learner's HD voice. */
async function underProvider({ mod, L, S, host, jsx }, children) {
  L.catalog = async () => CATALOG;
  const app = () =>
    jsx(mod.SpeechProvider, {
      language: "Spanish",
      onXp() {},
      onAchievement() {},
      hasAchievement: () => false,
      children: [jsx(S.Probe, {}, "probe"), children()],
    });
  host.render(app());
  for (let pass = 0; pass < 4; pass++) {
    await tick();
    host.render();
  }
  assert.equal(S.controls.speech.voiceURI, HD_VOICE, "the learner's HD voice resolved");
  return {
    app,
    /** The provider's state as the app sees it now. */
    speech: () => {
      host.render();
      return S.controls.speech;
    },
    /** The playing request fails in HD; returns the notice the provider raised for it. */
    fails(reason) {
      const before = L.notices.length;
      L.jobs.at(-1).opts.onerror(reason);
      assert.equal(L.notices.length, before + 1, "the learner is told");
      return L.notices.at(-1);
    },
    /** Presses both buttons of a notice the learner has moved on from. */
    pressSaved(notice) {
      notice.cancel?.onClick();
      notice.action.onClick();
    },
  };
}

test("Say It with the real provider: a notice left on screen never plays into the microphone or onto the next word, and still works for its own word", async () => {
  const surface = await loadSurface({
    entry: "src/components/core30/LessonSayItCard.tsx",
    exports: ["LessonSayItCard"],
    replace: /^(@\/components\/ui\/dialog|@\/lib\/phone-dictation)$/,
    standins: SAY_IT + PROBE,
    provider: true,
  });
  const { mod, L, S, host, jsx } = surface;
  await sayItPage(async ({ listeners }) => {
    let shown = true;
    const card = () =>
      shown
        ? jsx(
            mod.LessonSayItCard,
            {
              words: SAY_IT_WORDS,
              language: "Spanish",
              onActivity() {},
              onOpenConversation() {},
              online: true,
            },
            "card",
          )
        : null;
    const { app, speech, fails, pressSaved } = await underProvider(surface, card);
    const word = "manguito rotador";

    // The microphone. Listen fails and its notice is on screen when the learner starts
    // speaking: the notice leaves, and its saved buttons do nothing at all.
    host.click(host.button("Listen"));
    assert.equal(L.jobs.at(-1).text, word);
    let notice = fails("offline");
    assert.equal(notice.action.label, "Try again");
    assert.equal(notice.cancel.label, "Use device voice");
    host.click(host.one("say-word-record"));
    const recognition = S.controls.recognitions.at(-1);
    assert.equal(recognition.started, true, "the microphone is open");
    let jobs = L.jobs.length;
    pressSaved(notice);
    assert.equal(L.jobs.length, jobs, "nothing is played into the open microphone");
    assert.equal(speech().listeningFallback, false, "and this device's voice is not switched on");
    assert.equal(recognition.aborted, false, "the learner is still being listened to");
    assert.ok(L.dismissed.includes(notice.id), "the notice left the screen with the model audio");
    assert.equal(host.button("Listen").props.disabled, true);
    await tick();
    recognition.onresult({ results: [{ 0: { transcript: word } }] });
    recognition.onend();
    host.render();
    assert.match(host.text(host.one("say-word-score")), /100%/, "the attempt is scored as before");

    // My recording stops the model too, and takes its notice with it.
    host.click(host.button("Listen"));
    notice = fails("offline");
    host.click(host.button("My recording"));
    assert.ok(L.dismissed.includes(notice.id));
    jobs = L.jobs.length;
    pressSaved(notice);
    assert.equal(L.jobs.length, jobs, "the model is not read over the learner's own recording");

    // The page goes to the background.
    host.click(host.button("Listen"));
    notice = fails("offline");
    globalThis.document.visibilityState = "hidden";
    listeners.get("visibilitychange")();
    globalThis.document.visibilityState = "visible";
    assert.ok(L.dismissed.includes(notice.id));
    jobs = L.jobs.length;
    pressSaved(notice);
    assert.equal(L.jobs.length, jobs);

    // Next. The notice for the previous word must never read it out on the new card.
    host.click(host.button("Listen"));
    notice = fails("offline");
    host.click(host.one("say-word-next"));
    assert.equal(host.text(host.one("say-word-target")), "hombro");
    assert.ok(L.dismissed.includes(notice.id), "the previous word's notice is gone");
    jobs = L.jobs.length;
    pressSaved(notice);
    assert.equal(L.jobs.length, jobs, "the previous word is never read on the next card");
    assert.equal(speech().listeningFallback, false);

    // For the word it belongs to, the notice works. Try again stays HD at the slow speed...
    host.click(host.button("Slow"));
    jobs = L.jobs.length;
    assert.equal(L.jobs.at(-1).text, "hombro");
    assert.equal(L.jobs.at(-1).opts.rate, 0.65);
    assert.equal(L.jobs.at(-1).opts.voiceURI, HD_VOICE);
    assert.equal(L.jobs.at(-1).opts.cloudOnly, true);
    notice = fails("busy");
    assert.equal(notice.title, "The HD voice is busy");
    assert.equal(notice.action.label, "Try again");
    assert.equal(notice.cancel.label, "Use device voice");
    assert.equal(L.dismissed.includes(notice.id), false, "it stays on screen for its own word");
    notice.action.onClick();
    assert.equal(L.jobs.length, jobs + 1);
    assert.equal(L.jobs.at(-1).text, "hombro");
    assert.equal(L.jobs.at(-1).opts.rate, 0.65, "the retry keeps the slow speed");
    assert.equal(L.jobs.at(-1).opts.cloudOnly, true, "and stays HD only");
    assert.equal(speech().listeningFallback, false);
    // ...and Use device voice is the learner's own choice, taken once, at the same speed.
    notice = fails("offline");
    notice.cancel.onClick();
    assert.equal(speech().listeningFallback, true);
    assert.equal(L.jobs.length, jobs + 2);
    assert.equal(L.jobs.at(-1).text, "hombro");
    assert.equal(L.jobs.at(-1).opts.rate, 0.65);
    assert.equal(L.jobs.at(-1).opts.cloudOnly, false, "this device's voice may fill in, as chosen");
    pressSaved(notice);
    assert.equal(L.jobs.length, jobs + 2, "a notice is used once");
    // The HD voice answers again: the fill-in ends by itself.
    L.jobs.at(-1).opts.onPlaybackStart("hd");
    assert.equal(speech().listeningFallback, false);

    // Another learner on this device: the first learner's notice is theirs alone.
    host.click(host.button("Listen"));
    assert.equal(L.jobs.at(-1).text, "hombro");
    notice = fails("offline");
    L.actor = "b";
    jobs = L.jobs.length;
    pressSaved(notice);
    assert.equal(L.jobs.length, jobs, "nothing plays for another account");
    L.actor = "a";
    assert.equal(speech().listeningFallback, false, "and its listening choice is untouched");

    // Leaving Say It (the card goes, the app stays).
    host.click(host.button("Listen"));
    notice = fails("offline");
    shown = false;
    host.render(app());
    assert.equal(host.all("lesson-say-word-practice").length, 0);
    assert.ok(L.dismissed.includes(notice.id), "the notice left with the card");
    jobs = L.jobs.length;
    pressSaved(notice);
    assert.equal(L.jobs.length, jobs, "nothing plays for a card that is gone");
    assert.equal(speech().listeningFallback, false);
    host.unmount();
  });
});

const DECK = `
 ${APP}
 export const playFlashcardSuccess=async()=>{};
`;

test("Flashcards with the real provider: grading moves on from a card's notice; the card it belongs to keeps it", async () => {
  const surface = await loadSurface({
    entry: "src/components/flashcards/FlashcardStudy.tsx",
    exports: ["FlashcardStudy"],
    replace: /^(@\/lib\/sound-effects|@\/state\/app-state)$/,
    standins: DECK + PROBE,
    provider: true,
  });
  const { mod, L, S, host, jsx } = surface;
  S.controls.app.vocabSM2 = {};
  const cards = [
    { key: "ladder", front: "ladder", back: "la escalera" },
    { key: "nail", front: "nail", back: "el clavo" },
  ];
  const deck = () =>
    jsx(
      mod.FlashcardStudy,
      { blockId: "roofing", title: "Roofing", cards, backLanguage: "Spanish", onExit() {} },
      "deck",
    );
  const { speech, fails, pressSaved } = await underProvider(surface, deck);
  const card = () =>
    host.where((el) => el.type === "button" && /min-h-\[220px\]/.test(el.props.className))[0];
  const button = (label) =>
    host.where((el) => el.type === "button" && host.text(el).trim() === label)[0];

  // Flipping reads the back; it cannot play in HD and the learner is told.
  host.click(card());
  assert.equal(L.jobs.length, 1);
  const first = L.jobs[0].text;
  assert.ok(["la escalera", "el clavo"].includes(first));
  let notice = fails("offline");

  // "Not yet" on a two-card deck moves to the other card: the notice does not follow.
  host.click(button("Not yet"));
  assert.ok(L.dismissed.includes(notice.id), "the notice left with its card");
  let jobs = L.jobs.length;
  pressSaved(notice);
  assert.equal(L.jobs.length, jobs, "the previous card's word is never read over the next card");
  assert.equal(speech().listeningFallback, false);

  // The card that is showing keeps its notice: the retry reads this card's back again.
  host.click(card());
  const second = L.jobs.at(-1).text;
  assert.notEqual(second, first);
  notice = fails("offline");
  assert.equal(L.dismissed.includes(notice.id), false);
  notice.action.onClick();
  assert.equal(L.jobs.at(-1).text, second);
  assert.equal(L.jobs.at(-1).opts.cloudOnly, true);
  host.unmount();
});

const READER = `
 controls.app={activeModuleId:null,selectedLanguage:'Spanish',nativeLanguage:'English',cultureRead:[],achievements:[]};
 controls.dispatches=[];
 export const useApp=()=>({state:controls.app,dispatch:action=>controls.dispatches.push(action)});
 const pair=(target,en='English')=>({target,en});
 const text=(id,title,sentences)=>({id,title,language:'Spanish',section:'custom',available:true,sentences:sentences.map(target=>pair(target))});
 controls.entries=[
  text('text-a','Texto A',['Primera frase del texto A.','Segunda frase del texto A.']),
  text('text-b','Texto B',['Otra historia empieza aquí.']),
  {...text('book','Libro',[]),chapters:[{title:'Uno',sentences:[pair('Capítulo uno.')]},{title:'Dos',sentences:[pair('Capítulo dos.')]}]}];
 controls.selectedId='text-a';
 // What the library drawer does when the learner opens another text.
 const dispatch=action=>{if(action.type==='SELECT')controls.selectedId=action.payload;};
 export const useLibrary=()=>({selected:controls.entries.find(entry=>entry.id===controls.selectedId),state:{entries:controls.entries,selectedId:controls.selectedId,selectionScope:null},dispatch,readyToSelect:true,seedError:null,retrySeeds(){}});
 const notes={add(){},forText:()=>[],annotations:[]},tutor={contextFor:()=>undefined,clearSourceContext(){}};
 export const useNotes=()=>notes,useTutor=()=>tutor,useOverlayHistory=()=>{};
 export const AnnotatedSentence='annotated-sentence',FuriganaText='furigana',HangulText='hangul',PinyinText='pinyin',WordCard='word-card',SelectionMenu='selection-menu',NoteBubble='note-bubble',NotesPanel='notes-panel',MiniPlayer='mini-player',LibraryDrawer='library-drawer',ModuleMatchPanel='module-match',ModuleStudyGuide='module-guide',ActionHint='action-hint',LessonReturnPill='return-pill';
 export const getAvailableModuleLessons=()=>[],recordPaneTap=()=>{},browserReturnStorage=()=>null,readLessonReturn=()=>null,pointAddressAtLessonReturn=()=>{},moduleReaderSelection=()=>null,readerSelectionScope=()=>'scope';
`;

test("Reader (the real ParallelReader and provider): opening another text or chapter withdraws the notice for the sentence that could not play", async () => {
  const surface = await loadSurface({
    entry: "src/components/reader/ParallelReader.tsx",
    exports: ["ParallelReader"],
    replace:
      /^(@\/hooks\/use-overlay-history|@\/state\/(app|library|notes|tutor)-state|\.\/(AnnotatedSentence|FuriganaText|HangulText|PinyinText|WordCard|SelectionMenu|NoteBubble|NotesPanel|MiniPlayer)|@\/components\/library\/LibraryDrawer|@\/components\/modules\/(ModuleMatchPanel|ModuleStudyGuide)|@\/data\/module-starters|@\/components\/onboarding\/AppTour|@\/lib\/(learning-guidance|lesson-return|learning-link|reader-selection)|@\/components\/core30\/LessonReturnPill)$/,
    standins: READER + PROBE,
    provider: true,
  });
  const { mod, L, S, host, jsx } = surface;
  const keys = ["setTimeout", "clearTimeout", "window", "document"];
  const saved = keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  const clock = fakeTimers();
  globalThis.setTimeout = clock.setTimeout;
  globalThis.clearTimeout = clock.clearTimeout;
  globalThis.window = {};
  globalThis.document = { addEventListener() {}, removeEventListener() {} };
  try {
    let open = true;
    const reader = () => (open ? jsx(mod.ParallelReader, {}, "reader") : null);
    const { app, speech, fails, pressSaved } = await underProvider(surface, reader);
    /** Opens another text, as picking it in the library does. */
    const openText = (id) => {
      S.controls.selectedId = id;
      host.render();
    };
    /** Taps the speaker beside a sentence and lets the reading start. */
    const listen = (phrase) => {
      host.click(host.button(`Listen to phrase ${phrase}`));
      clock.run(30);
      return L.jobs.at(-1);
    };
    /** Presses both saved buttons, lets any reading they started begin, and counts it. */
    const startedBySaved = (notice) => {
      const before = L.jobs.length;
      pressSaved(notice);
      clock.run(30);
      host.render();
      return L.jobs.length - before;
    };
    const lit = () => host.where((el) => el.type === "p" && el.props["data-speaking"]);

    // While the text is on screen, the notice retries the sentence that could not play.
    assert.equal(listen(2).text, "Segunda frase del texto A.");
    assert.equal(L.jobs.at(-1).opts.cloudOnly, true);
    let notice = fails("offline");
    assert.equal(speech().playing, false);
    notice.action.onClick();
    clock.run(30);
    assert.equal(L.jobs.at(-1).text, "Segunda frase del texto A.", "Try again reads it again");
    assert.equal(speech().activeSentenceIndex, 1);

    // The learner opens another text while the notice is still on screen.
    notice = fails("offline");
    openText("text-b");
    assert.equal(host.where((el) => el.type === "annotated-sentence")[0].props.text, "English");
    assert.ok(L.dismissed.includes(notice.id), "the notice left with its text");
    assert.equal(startedBySaved(notice), 0, "the old text is never read over the new one");
    assert.equal(speech().listeningFallback, false, "and this device's voice is not switched on");
    assert.equal(speech().playing, false);
    assert.equal(lit().length, 0, "no sentence of the new text is lit up for the old one");

    // Another chapter of the same book.
    openText("book");
    assert.equal(listen(1).text, "Capítulo uno.");
    notice = fails("offline");
    host.click(host.button("Next →"));
    assert.ok(L.dismissed.includes(notice.id), "the notice left with its chapter");
    assert.equal(startedBySaved(notice), 0, "the old chapter is never read over the new one");
    assert.equal(speech().listeningFallback, false);
    assert.equal(lit().length, 0);
    // In the chapter that is showing, its own notice works.
    assert.equal(listen(1).text, "Capítulo dos.");
    notice = fails("busy");
    notice.cancel.onClick();
    clock.run(30);
    assert.equal(
      speech().listeningFallback,
      true,
      "the learner's own choice, for what is on screen",
    );
    L.jobs.at(-1).opts.onPlaybackStart("hd");
    assert.equal(speech().listeningFallback, false);
    speech().stop();
    host.render();

    // Leaving the Reader for another tab.
    assert.equal(listen(1).text, "Capítulo dos.");
    notice = fails("offline");
    open = false;
    host.render(app());
    assert.ok(L.dismissed.includes(notice.id), "the notice left with the Reader");
    assert.equal(startedBySaved(notice), 0);
    assert.equal(speech().listeningFallback, false);
    host.unmount();
  } finally {
    for (const [key, descriptor] of saved)
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
  }
});
