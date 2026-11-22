// Drives the real LessonPracticeKit component (its JSX, state and handlers) with the real
// matching, recall and class-merging code. React is replaced by a small host that renders the
// element tree and lets the test tap elements; only the speaker and unrelated child components
// are stand-ins.
import assert from "node:assert/strict";
import nodeTest from "node:test";
import { build } from "esbuild";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";

const test = (name, fn) => nodeTest(name, { timeout: 30_000 }, fn);

const FIXTURE = `
 export const R={instances:new Map(),current:null,effects:[],spoken:[],speakers:[],activities:[]};
 const changed=(a,b)=>!a||!b||a.length!==b.length||a.some((v,i)=>v!==b[i]);
 const slot=()=>{const inst=R.current;return [inst,inst.cursor++];};
 export function useState(initial){const [inst,i]=slot();if(!(i in inst.slots))inst.slots[i]=typeof initial==='function'?initial():initial;return [inst.slots[i],v=>{inst.slots[i]=typeof v==='function'?v(inst.slots[i]):v;}];}
 export function useRef(initial){const [inst,i]=slot();if(!(i in inst.slots))inst.slots[i]={current:initial};return inst.slots[i];}
 export function useMemo(fn,deps){const [inst,i]=slot(),old=inst.slots[i];if(!old||changed(old.deps,deps))inst.slots[i]={deps,value:fn()};return inst.slots[i].value;}
 export const useCallback=(fn,deps)=>useMemo(()=>fn,deps);
 export function useEffect(fn,deps){const [inst,i]=slot(),old=inst.slots[i];if(!old||changed(old.deps,deps))R.effects.push(()=>{old?.cleanup?.();inst.slots[i]={deps,cleanup:fn()};});}
 export function createContext(value){const ctx={value,stack:[]};ctx.Provider={provider:ctx};return ctx;}
 export const useContext=ctx=>ctx.stack.length?ctx.stack.at(-1):ctx.value;
 export const Fragment='fragment',jsx=(type,props,key)=>({type,props:props??{},key}),jsxs=jsx;
 const icon=name=>'icon-'+name;
 export const BookOpen=icon('book'),Check=icon('check'),CheckCircle2=icon('check-circle'),Headphones=icon('headphones'),Keyboard=icon('keyboard'),Layers=icon('layers'),Loader2=icon('loader'),PenLine=icon('pen'),Puzzle=icon('puzzle'),RotateCcw=icon('rotate'),Repeat=icon('repeat'),Volume2=icon('volume'),XCircle=icon('x');
 export const playFlashcardSuccess=async()=>{};
 export const useHandwritingReader=()=>async()=>({kind:'manual',message:null});
 export const AnswerFeedback='stub-answer-feedback',HandwritingPad='stub-pad',Dialog='stub-dialog',DialogContent='stub-dialog-content',DialogTitle='stub-dialog-title',DialogDescription='stub-dialog-description',VerbPractice='stub-verb-practice',GameRound='stub-game-round';
 export const useApp=()=>({state:{vocabByLanguage:{},userVocab:[],selectedLanguage:'Spanish'},dispatch(){}});
 export const useFlashcards=()=>({addCard(){},hasCard:()=>false});
 export const ACCENTS_BY_LANGUAGE={Spanish:[{code:'es-CR'}],English:[{code:'en-US'}]};
 export const useListeningSpeaker=(scope,language,card)=>{R.speakers.push({scope,language,card});return {speak:text=>R.spoken.push(text),stop(){},locale:'es-CR'};};
`;

/** Renders an element tree the way React would, keeping each component's state by position/key. */
function createHost(R) {
  const instanceAt = (path) => {
    let inst = R.instances.get(path);
    if (!inst) R.instances.set(path, (inst = { slots: [], cursor: 0 }));
    inst.cursor = 0;
    return inst;
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
      const output = type(props);
      R.current = null;
      walk(output, where, parent, all);
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
  const host = {
    render(element) {
      host.element = element;
      elements = [];
      walk(element, "root", { text: [] }, elements);
      for (const effect of R.effects.splice(0)) effect();
      return host;
    },
    all: (testid) => elements.filter((el) => el.props["data-testid"] === testid),
    one(testid) {
      const found = host.all(testid);
      assert.equal(found.length, 1, `exactly one ${testid}`);
      return found[0];
    },
    button: (label) =>
      elements.find(
        (el) => el.type === "button" && (el.props["aria-label"] ?? el.text.join("")) === label,
      ),
    text: (el) => el.text.join(""),
    /** A tap, then the re-render React would do. */
    click(el) {
      assert.ok(el, "element to tap exists");
      assert.notEqual(el.props.disabled, true, "a disabled control cannot be tapped");
      el.props.onClick?.({ stopPropagation() {}, preventDefault() {} });
      return host.render(host.element);
    },
  };
  return host;
}

async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/lesson-kit-"));
  const saved = { set: globalThis.setTimeout, clear: globalThis.clearTimeout };
  const timers = new Map();
  let timerId = 0;
  globalThis.setTimeout = (fn, ms) => {
    const id = ++timerId;
    timers.set(id, { fn, ms });
    return id;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
  try {
    const outfile = join(dir, "kit.mjs");
    await build({
      stdin: {
        contents: `export {LessonPracticeKit} from './src/components/core30/LessonPracticeKit';export {R,jsx} from 'fixture';`,
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
          name: "kit-host",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|react\/jsx-runtime|lucide-react|@\/lib\/sound-effects|@\/hooks\/(use-handwriting-reader|use-listening-speaker)|@\/components\/core30\/(AnswerFeedback|HandwritingPad|VerbPractice|LessonVerbGames)|@\/components\/ui\/dialog|@\/state\/(app|flashcard|speech)-state)$/,
              },
              () => ({ path: "host", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: FIXTURE }));
          },
        },
      ],
    });
    const { LessonPracticeKit, R, jsx } = await import(outfile);
    const host = createHost(R);
    const mount = (props) =>
      host.render(
        jsx(LessonPracticeKit, {
          moduleId: "electrician",
          lessonNumber: 2,
          language: "Spanish",
          nativeLanguage: "English",
          onModeChange() {},
          onActivity: (activity) => R.activities.push(activity),
          ...props,
        }),
      );
    /** Run timers of one duration (the red feedback, or the card's grading pause). */
    const elapse = (ms) => {
      const due = [...timers].filter(([, timer]) => timer.ms === ms);
      for (const [id, timer] of due) {
        timers.delete(id);
        timer.fn();
      }
      host.render(host.element);
      return due.length;
    };
    await run({ R, host, mount, elapse, timers });
  } finally {
    globalThis.setTimeout = saved.set;
    globalThis.clearTimeout = saved.clear;
    rmSync(dir, { recursive: true, force: true });
  }
}

const electrician = JSON.parse(
  readFileSync(new URL("../public/lesson-content/es/electrician.json", import.meta.url), "utf8"),
);
const conectar = Object.values(electrician.lessons)
  .flatMap((lesson) => lesson.verbs)
  .find((verb) => verb.infinitive === "conectar");
const TERMS = [
  { es: "el cable", en: "wire", kind: "term" },
  { es: "el panel", en: "panel", kind: "term" },
  { es: "la tierra", en: "ground", kind: "term" },
];

test("matching: both mismatched tiles turn red, taps wait, then the same tiles can be retried and matched", () =>
  fixture(async ({ R, host, mount, elapse }) => {
    mount({ words: TERMS, mode: "match" });
    const tiles = () => host.all("match-tile");
    const tile = (text) => tiles().find((el) => host.text(el) === text);
    assert.equal(tiles().length, 6);
    assert.deepEqual(
      tiles()
        .filter((el) => el.props.lang === "es")
        .map(host.text)
        .sort(),
      ["el cable", "el panel", "la tierra"],
    );

    // Tap a Spanish tile: it is read aloud and becomes the selection.
    host.click(tile("el cable"));
    assert.deepEqual(R.spoken, ["el cable"]);
    assert.equal(tile("el cable").props["aria-pressed"], true);
    assert.match(tile("el cable").props.className, /border-gold/);

    // Tap the wrong meaning: BOTH tiles show red, and red replaces the selection highlight.
    host.click(tile("panel"));
    for (const text of ["el cable", "panel"]) {
      const el = tile(text);
      assert.equal(el.props["data-wrong"], "true", `${text} is marked wrong`);
      assert.match(el.props.className, /border-red-500\/60/, `${text} has the red border`);
      assert.match(el.props.className, /bg-red-500\/10/, `${text} has the red fill`);
      assert.doesNotMatch(el.props.className, /border-gold|bg-gold/, `${text} is not gold`);
      assert.equal(el.props["data-matched"], "false");
      assert.notEqual(el.props.disabled, true, `${text} stays available`);
    }
    for (const el of tiles().filter((el) => !["el cable", "panel"].includes(host.text(el)))) {
      assert.equal(el.props["data-wrong"], "false");
      assert.doesNotMatch(el.props.className, /red-500/);
    }
    const live = () =>
      host
        .all(undefined)
        .filter((el) => el.props["aria-live"] === "polite" && el.props.className === "sr-only")
        .map(host.text);
    assert.deepEqual(live(), ["Not a match. Try again."], "the miss is announced, not only coloured");

    // While the red shows, other taps do nothing (and read nothing).
    host.click(tile("la tierra"));
    assert.deepEqual(R.spoken, ["el cable"]);
    assert.equal(tile("la tierra").props["aria-pressed"], false);
    assert.equal(tile("el cable").props["data-wrong"], "true");

    // The red clears by itself and every tile is back to normal.
    assert.equal(elapse(600), 1);
    for (const el of tiles()) {
      assert.equal(el.props["data-wrong"], "false");
      assert.equal(el.props["aria-pressed"], false);
      assert.doesNotMatch(el.props.className, /red-500/);
      assert.notEqual(el.props.disabled, true);
    }
    assert.deepEqual(live(), [""]);

    // Retry with the same two tiles, each against its real partner.
    host.click(tile("el cable"));
    host.click(tile("wire"));
    for (const text of ["el cable", "wire"]) {
      assert.equal(tile(text).props["data-matched"], "true");
      assert.equal(tile(text).props.disabled, true);
    }
    host.click(tile("panel"));
    host.click(tile("el panel"));
    assert.equal(tile("panel").props["data-matched"], "true");
    assert.deepEqual(R.spoken, ["el cable", "el cable", "el panel"]);
    assert.deepEqual(R.activities, []);
    host.click(tile("ground"));
    host.click(tile("la tierra"));
    assert.deepEqual(R.activities, ["match"], "the round completes after a miss");
    assert.ok(
      host
        .all(undefined)
        .some((el) => host.text(el) === "All 3 terms matched with 1 miss."),
    );
  }));

test("verb card: the back spells out the authored conjugations, each line is read aloud, the card still flips and grades", () =>
  fixture(async ({ R, host, mount, elapse }) => {
    mount({
      words: [{ es: "conectar", en: "to connect", kind: "term" }],
      verbs: [conectar],
      mode: "study",
    });
    const cardText = () => host.text(host.one("recall-card-text"));
    /** Each row as the learner sees it: person on the left, authored form on the right. */
    const rows = () =>
      host.all("recall-verb-form").map((row) => {
        const cells = host
          .all("recall-verb-person")
          .concat(host.all("recall-verb-answer"))
          .filter((cell) => cell.parent === row);
        assert.deepEqual(
          cells.map((cell) => cell.props["data-testid"]),
          ["recall-verb-person", "recall-verb-answer"],
          "person first (left), form second (right)",
        );
        assert.match(row.props.className, /justify-between/, "the two columns sit apart");
        return { person: host.text(cells[0]), form: host.text(cells[1]), label: row.props["aria-label"] };
      });
    const lines = () => rows().map((row) => row.label.replace(", play Spanish audio", ""));

    // Front: the meaning, no conjugations yet.
    assert.equal(host.one("recall-step").props["data-kind"], "card");
    assert.equal(cardText(), "to connect");
    assert.equal(host.one("flashcard").props["aria-label"], "Flip the card");
    assert.equal(host.all("recall-verb-form").length, 0);

    // Flip: the infinitive, then every authored form written out with its subject.
    host.click(host.one("flashcard"));
    assert.equal(cardText(), "conectar", "the card's own text is still only the verb");
    assert.equal(host.one("flashcard").props["aria-label"], "Show the front of the card");
    assert.deepEqual(lines(), [
      "yo conecto",
      "tú conectas",
      "él / ella / usted conecta",
      "nosotros conectamos",
      "ellos / ustedes conectan",
    ]);
    assert.deepEqual(
      rows().map(({ person, form }) => [person, form]),
      [
        ["yo", "conecto"],
        ["tú", "conectas"],
        ["él / ella / usted", "conecta"],
        ["nosotros", "conectamos"],
        ["ellos / ustedes", "conectan"],
      ],
      "the table keeps person and form in their own columns",
    );
    assert.equal(rows()[0].label, "yo conecto, play Spanish audio", "read out as the whole line");
    assert.equal(host.one("recall-verb-forms").props["aria-label"], "Forms of conectar");
    for (const el of host.all("recall-verb-form")) {
      assert.equal(el.type, "button");
      // The conjugations sit beside the flip button, never inside it.
      for (let up = el.parent; up?.props; up = up.parent)
        assert.notEqual(up.props["data-testid"], "flashcard");
    }

    // Tapping a line reads that authored form (the recorded word), and does not flip the card.
    host.click(host.all("recall-verb-form")[1]);
    host.click(host.all("recall-verb-form")[4]);
    assert.deepEqual(R.spoken, ["conectas", "conectan"]);
    assert.equal(cardText(), "conectar");
    assert.equal(host.all("recall-verb-form").length, 5);
    // The card's speaker still reads the verb itself.
    host.click(host.button("Play Spanish audio: conectar"));
    assert.deepEqual(R.spoken, ["conectas", "conectan", "conectar"]);

    // The face still flips back, and the forms go with the back.
    elapse(300);
    host.click(host.one("flashcard"));
    assert.equal(cardText(), "to connect");
    assert.equal(host.all("recall-verb-form").length, 0);

    // Reversed direction: Spanish first, and the forms still appear on the revealed side.
    elapse(300);
    host.click(host.button("Reverse card direction"));
    assert.equal(cardText(), "conectar");
    elapse(300);
    host.click(host.button("Reveal English"));
    assert.equal(cardText(), "to connect");
    assert.equal(lines().length, 5);

    // Grading is unchanged: Got it finishes the one-card round.
    elapse(300);
    host.click(host.button("Got it"));
    assert.deepEqual(R.activities, ["study"]);
    // Every kit surface speaks through the learner's listening voice for the lesson language.
    assert.ok(R.speakers.length > 0);
    for (const speaker of R.speakers) {
      assert.equal(speaker.scope, "lesson-kit");
      // The kit hands its speaker the lesson's pack, never a language name.
      assert.equal(speaker.language?.code, "es");
    }
  }));

test("Recall: the card's speaker is told which card it speaks for, so a notice never follows the learner to the next card", () =>
  fixture(async ({ R, host, mount, elapse }) => {
    mount({ words: TERMS, verbs: [], mode: "study" });
    const current = () => host.one("lesson-recall-deck").props["data-current-id"];
    /** The step the Recall deck's own speaker was given on the latest render (a step id). */
    const spokenFor = () =>
      R.speakers.filter((speaker) => typeof speaker.card === "string").at(-1)?.card;
    const first = current();
    assert.match(first, /^card:/);
    assert.equal(spokenFor(), first);

    // Flipping, hearing and reversing the card keep it the same card.
    host.click(host.one("flashcard"));
    assert.equal(spokenFor(), first);
    host.click(host.all(undefined).find((el) => /^Play Spanish audio: /.test(el.props["aria-label"] ?? "")));
    assert.equal(R.spoken.length, 1);
    assert.equal(spokenFor(), first);

    // Got it: the deck moves on, and so does what its speaker speaks for.
    elapse(300);
    host.click(host.button("Got it"));
    const second = current();
    assert.notEqual(second, first);
    assert.equal(spokenFor(), second, "the next card is a new card to the speaker");

    // Again on the new card re-queues it: another step is showing, and the speaker follows.
    elapse(300);
    host.click(host.button("Again"));
    assert.notEqual(current(), second);
    assert.equal(spokenFor(), current());
    // The matching break inside the deck speaks for its own round.
    assert.equal(host.one("recall-step").props["data-kind"], "match");
    assert.equal(R.speakers.at(-1).card, 0, "the match step's speaker is told its round");
  }));

test("a plain vocabulary card has no conjugation list, and an unknown lesson language fails closed", () =>
  fixture(async ({ R, host, mount }) => {
    mount({ words: TERMS, verbs: [], mode: "study" });
    host.click(host.one("flashcard"));
    assert.equal(host.all("recall-verb-forms").length, 0);
    assert.equal(host.all("recall-verb-form").length, 0);
    R.speakers.length = 0;
    mount({ words: TERMS, verbs: [], mode: "study", language: "Klingon" });
    // No pack for the language: the speaker gets no pack (no voice), never a Spanish one.
    assert.ok(R.speakers.length > 0);
    assert.ok(R.speakers.every((speaker) => speaker.language === null));
  }));
