// The real Verb Games series (VerbSeries with its Listen and Cards steps) on the real
// listening hooks and rules. Shows that each verb form is read by the learner's listening
// voice, and how Listen's own "read it instead" behaves when HD audio cannot play.
import assert from "node:assert/strict";
import nodeTest from "node:test";
import { fakeTimers, HD_VOICE, loadSurface } from "./helpers/listening-surface.mjs";
import { miniData } from "./helpers/verb-fixture.mjs";
import { EMPTY_VERB_DEVICE, recordSeriesStep } from "../src/lib/verb-games/device.ts";
import { DEVICE_DEFAULT_VOICE } from "../src/data/mobile-voice.ts";

const test = (name, fn) => nodeTest(name, { timeout: 30_000 }, fn);
const FAMILY = "es.present.go-yo";
const SERIES = "src/components/games/verbs/series";
const VOICE_WAIT_MS = 1500;

async function fixture(run) {
  const saved = Object.getOwnPropertyDescriptor(globalThis, "window");
  const clock = fakeTimers();
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
    speechSynthesis: {},
  };
  try {
    const { mod, L, host, jsx } = await loadSurface({
      entry: `${SERIES}/VerbSeries.tsx`,
      exports: ["VerbSeries"],
      files: ["VerbSeries", "ChoiceStep", "CardsStep", "MatchStep", "TypeStep", "SeriesParts"]
        .map((name) => `${SERIES}/${name}.tsx`)
        .concat(`${SERIES}/series-meta.ts`),
    });
    const data = miniData();
    // Pick it, Match it and Cards are passed, so Listen is open.
    let device = ["pick", "match", "cards"].reduce(
      (state, step) =>
        recordSeriesStep(state, FAMILY, step, { score: 10, passed: true, at: "2026-11-20" }),
      EMPTY_VERB_DEVICE,
    );
    const mount = () =>
      host.render(
        jsx(mod.VerbSeries, {
          data,
          device,
          moduleId: null,
          family: FAMILY,
          devSeed: 7,
          update: (fn) => {
            device = fn(device);
          },
          onBack() {},
        }),
      );
    const startListen = () => {
      mount();
      host.click(host.one("series-start-listen"));
      return host;
    };
    await run({ L, host, clock, mount, startListen });
    host.unmount();
  } finally {
    if (saved) Object.defineProperty(globalThis, "window", saved);
    else delete globalThis.window;
  }
}
const listening = (host) => host.all("series-listen-prompt").length === 1;
const reading = (host) => host.all("series-read-prompt").length === 1;

test("Listen reads each form in the learner's listening voice: HD only, their accent and gender, never faster than 0.9", () =>
  fixture(async ({ L, host, startListen }) => {
    L.speech.voiceURI = HD_VOICE;
    L.speech.accent = "es-MX";
    L.speech.gender = "man";
    startListen();
    assert.ok(listening(host));
    assert.equal(L.jobs.length, 1, "the first form plays by itself");
    const job = L.jobs[0];
    assert.match(job.text, /go$/, "a yo form of the -go family");
    assert.equal(job.locale, "es-MX");
    assert.equal(job.opts.voiceURI, HD_VOICE);
    assert.equal(job.opts.cloudOnly, true, "HD only");
    assert.equal(job.opts.recordedGender, "male");
    assert.equal(job.opts.rate, 0.9, "normal speed is held to 0.9 for a single verb form");
    assert.equal(job.opts.owner.userId, "a");

    // Replay asks again for the same form; a learner's slower speed is respected.
    L.speech.rate = 0.75;
    host.render();
    const afterSpeedChange = L.jobs.length;
    host.click(host.one("series-replay"));
    assert.equal(L.jobs.length, afterSpeedChange + 1);
    assert.equal(L.jobs.at(-1).text, job.text);
    assert.equal(L.jobs.at(-1).opts.rate, 0.75);
    L.jobs.at(-1).opts.onPlaybackStart("recording");
    assert.deepEqual(L.played, ["recording"]);
    assert.ok(listening(host), "audio that plays keeps the step on listening");
    assert.equal(L.issues.length, 0);
  }));

test("HD audio that cannot play is put to the learner; Listen keeps listening while a device voice could fill in", () =>
  fixture(async ({ L, host, startListen }) => {
    L.speech.voiceURI = HD_VOICE;
    startListen();
    L.jobs[0].opts.onerror("offline");
    host.render();
    assert.equal(L.issues.length, 1, "the learner is told, with a retry");
    assert.equal(L.issues[0].reason, "offline");
    assert.ok(listening(host), "not switched to reading behind the learner's back");
    assert.equal(reading(host), false);

    // "Use device voice": the same form again, HD first and then this device's voice.
    assert.equal(L.issues[0].useDeviceVoice(), true);
    const retried = L.jobs.at(-1);
    assert.equal(retried.text, L.jobs[0].text);
    assert.equal(retried.opts.cloudOnly, false);
    assert.equal(retried.opts.voiceURI, HD_VOICE);
    // If even that cannot play, audio really is unavailable: read instead, by itself.
    retried.opts.onerror();
    host.render();
    assert.ok(reading(host));
    assert.match(host.text(host.one("series-read-prompt")), /Audio is off/);
    assert.equal(host.all("series-listen-instead").length, 0);
    assert.equal(L.issues.length, 1, "a device-voice failure is not an HD notice");
  }));

test("with no voice on the device, an HD miss switches Listen to reading by itself", () =>
  fixture(async ({ L, host, startListen }) => {
    // Signed out, no installed Spanish voice, and this form has no recording to play.
    L.actor = null;
    L.speech.voiceURI = DEVICE_DEFAULT_VOICE;
    L.voices = [];
    startListen();
    const job = L.jobs[0];
    assert.equal(job.opts.cloudOnly, true, "HD only, also when signed out");
    assert.equal(job.opts.recordedGender, "female", "a public recording may play");
    assert.equal(job.opts.unavailableReason, "sign-in");
    assert.equal(job.opts.owner.userId, "");
    assert.ok(listening(host), "recordings need no installed voice, so nothing is assumed missing");
    job.opts.onerror("sign-in");
    host.render();
    assert.ok(reading(host), "nothing here can play the form, so it is shown to read");
    assert.match(host.text(host.one("series-read-prompt")), /Audio is off/);
    assert.equal(L.issues.at(-1).reason, "sign-in", "and the learner is still told why");
    // Reading never asks for audio again.
    const jobs = L.jobs.length;
    host.click(host.where((el) => el.props["data-choice"] !== undefined)[0]);
    assert.equal(L.jobs.length, jobs);
  }));

test("a voice that is still loading never switches Listen to reading; once ready, the form plays in HD", () =>
  fixture(async ({ L, host, startListen }) => {
    L.voices = [];
    L.speech.voiceURI = null;
    startListen();
    const early = L.jobs[0];
    assert.equal(early.opts.unavailableReason, "loading");
    assert.equal(early.opts.voiceURI, DEVICE_DEFAULT_VOICE, "no unresolved cloud voice is used");
    assert.equal(early.opts.recordedGender, "female", "a recording can already play");
    early.opts.onerror("loading");
    host.render();
    assert.ok(listening(host), "still listening while the HD voice resolves");
    assert.equal(L.issues.at(-1).reason, "loading", "the learner is told it is getting ready");

    // The HD voice resolves. Nothing is replayed by itself, the notice still stands for the
    // retry it promised, and that retry (like Replay) is read by the HD voice.
    const notice = L.issues.at(-1);
    const before = L.jobs.length;
    L.speech.voiceURI = HD_VOICE;
    host.render();
    assert.equal(L.jobs.length, before, "the form is not read twice when the voice arrives");
    assert.equal(notice.standing, true);
    assert.equal(notice.tryAgain(), true);
    const ready = L.jobs.at(-1);
    assert.equal(ready.text, early.text);
    assert.equal(ready.opts.voiceURI, HD_VOICE);
    assert.equal(ready.opts.cloudOnly, true);
    assert.equal(ready.opts.unavailableReason, undefined);
    host.click(host.one("series-replay"));
    assert.equal(L.jobs.at(-1).opts.voiceURI, HD_VOICE);
    assert.equal(ready.opts.signal.aborted, true, "Replay takes over from the retry");
    assert.ok(listening(host));
  }));

test("a recorded form that is already playing is not cut off when the HD voice list finishes loading", () =>
  fixture(async ({ L, host, startListen }) => {
    L.speech.voiceURI = null;
    startListen();
    const recording = L.jobs[0];
    assert.equal(recording.opts.recordedGender, "female", "the reviewed recording plays first");
    recording.opts.onPlaybackStart("recording");
    L.speech.voiceURI = HD_VOICE;
    host.render();
    assert.equal(recording.opts.signal.aborted, false, "the form plays to its end");
    assert.equal(recording.opts.owner.isCurrent(), true);
    assert.equal(L.jobs.length, 1, "and is not started a second time");
    assert.ok(listening(host));
    // The learner's own choice of another voice still ends it.
    L.speech.gender = "man";
    host.render();
    assert.equal(recording.opts.signal.aborted, true);
  }));

test("the Device voice choice keeps the existing rule: no installed voice means reading after a short wait", () =>
  fixture(async ({ L, host, clock, startListen }) => {
    L.speech.voiceURI = HD_VOICE;
    L.speech.source = "device";
    startListen();
    const job = L.jobs[0];
    assert.equal(job.opts.cloudOnly, false);
    assert.equal(job.opts.recordedGender, undefined, "no recording or HD voice on a device choice");
    assert.equal(job.opts.voiceURI, DEVICE_DEFAULT_VOICE);
    assert.equal(clock.run(VOICE_WAIT_MS), 0, "an installed voice: nothing to wait for");
    assert.ok(listening(host));
    host.unmount();

    L.voices = [];
    startListen();
    assert.ok(listening(host), "voices can load late, so reading waits a moment");
    assert.equal(clock.run(VOICE_WAIT_MS), 1);
    host.render();
    assert.ok(reading(host));
  }));

test("playback belongs to the series: leaving it or another learner stops the form and its retry", () =>
  fixture(async ({ L, host, startListen }) => {
    L.speech.voiceURI = HD_VOICE;
    startListen();
    const job = L.jobs[0];
    assert.equal(job.opts.owner.isCurrent(), true);
    job.opts.onerror("busy");
    const notice = L.issues[0];
    host.unmount();
    assert.equal(job.opts.signal.aborted, true);
    assert.equal(job.opts.owner.isCurrent(), false);
    const jobs = L.jobs.length;
    assert.equal(notice.standing, false, "the notice left with the series");
    assert.equal(notice.useDeviceVoice(), false);
    assert.equal(notice.tryAgain(), false);
    notice.retry();
    assert.equal(L.jobs.length, jobs, "a retry from the series that was left does nothing");
    assert.equal(L.speech.fallback, false);

    startListen();
    const mine = L.jobs.at(-1);
    L.actor = "b";
    assert.equal(mine.opts.owner.isCurrent(), false, "another learner never hears it");
  }));

test("Cards: Hear it reads the form through the same listening voice", () =>
  fixture(async ({ L, host, mount }) => {
    L.speech.voiceURI = HD_VOICE;
    mount();
    host.click(host.one("series-start-cards"));
    host.click(
      host.where((el) => el.type === "button" && /Tap or press Space/.test(host.text(el)))[0],
    );
    const form = host.text(host.one("series-card-form"));
    assert.equal(L.jobs.length, 0, "nothing is read until the learner asks");
    host.click(host.one("series-card-hear"));
    assert.equal(L.jobs.length, 1);
    assert.equal(L.jobs[0].text, form);
    assert.equal(L.jobs[0].opts.cloudOnly, true);
    assert.equal(L.jobs[0].opts.voiceURI, HD_VOICE);
    assert.equal(L.jobs[0].opts.recordedGender, "female");
  }));

test("Cards: a 'could not play in HD' notice belongs to its card and does not follow the learner to the next one", () =>
  fixture(async ({ L, host, mount }) => {
    L.speech.voiceURI = HD_VOICE;
    mount();
    host.click(host.one("series-start-cards"));
    const flip = () =>
      host.click(
        host.where((el) => el.type === "button" && /Tap or press Space/.test(host.text(el)))[0],
      );
    const rate = (rating) => host.click(host.where((el) => el.props["data-rating"] === rating)[0]);
    flip();
    const first = host.text(host.one("series-card-form"));
    host.click(host.one("series-card-hear"));
    L.jobs.at(-1).opts.onerror("offline");
    const notice = L.issues.at(-1);
    assert.equal(notice.standing, true);
    // The same card, looked at again: its notice is still about what is on screen.
    host.render();
    assert.equal(notice.standing, true);

    // Rated: the next card is showing. The saved buttons read nothing and switch nothing.
    rate("good");
    assert.equal(host.one("series-card").props["data-side"], "front", "a new card");
    const jobs = L.jobs.length;
    assert.equal(notice.standing, false, "the notice left with its card");
    assert.equal(notice.useDeviceVoice(), false);
    assert.equal(notice.tryAgain(), false);
    assert.equal(L.jobs.length, jobs, "the previous form is never read over the next card");
    assert.equal(L.speech.fallback, false);

    // On the card that is showing, its own notice works.
    flip();
    const second = host.text(host.one("series-card-form"));
    assert.notEqual(second, first);
    host.click(host.one("series-card-hear"));
    L.jobs.at(-1).opts.onerror("offline");
    assert.equal(L.issues.at(-1).tryAgain(), true);
    assert.equal(L.jobs.at(-1).text, second);
    // Leaving the step takes the notice with it.
    L.jobs.at(-1).opts.onerror("offline");
    const last = L.issues.at(-1);
    host.click(host.one("series-step-pick"));
    assert.equal(last.standing, false);
    assert.equal(last.useDeviceVoice(), false);
    assert.equal(L.speech.fallback, false);
  }));
