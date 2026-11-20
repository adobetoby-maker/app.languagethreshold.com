// The real Listening Drill, battle review, saved-words drawer and Sound Practice components on
// the real listening hooks and rules. Each test taps what a learner taps and reads what the
// audio router was asked to play: the learner's listening voice (recorded HD audio, then the
// HD voice, never a silent device voice), with playback tied to the item it belongs to.
import assert from "node:assert/strict";
import nodeTest from "node:test";
import { HD_VOICE, loadSurface } from "./helpers/listening-surface.mjs";
import { DEVICE_DEFAULT_VOICE } from "../src/data/mobile-voice.ts";
import { soundLesson } from "../src/data/sound-like-a-native.ts";

const test = (name, fn) => nodeTest(name, { timeout: 30_000 }, fn);
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
  L.issues.at(-1).retry();
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
  L.issues.at(-1).retry();
  assertHd(L.jobs.at(-1), { text: "la teja", gender: "male" });
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
