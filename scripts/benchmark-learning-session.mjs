import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { receiptCostUsd, ttsCostUsd, RATE_DATE, RATE_SOURCE } from "../src/lib/usage-cost.ts";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv.slice(2).map((x) => {
    const [k, ...v] = x.replace(/^--/, "").split("=");
    return [k, v.join("=") || true];
  }),
);
const output = resolve(String(args.output || "artifacts/learner-cost-test"));
await mkdir(output, { recursive: true });
const base = String(args["base-url"] || "https://app.languagethreshold.com").replace(/\/$/, "");
const live = args.live === true;
const turns = args.heavy === true ? 15 : 5;
const records = [];
let requests = 0,
  token;
const contract = {
  durationMinutes: 30,
  existingCards: 25,
  newWordLookups: 5,
  repeatedLookups: 2,
  stories: 1,
  customCardBatches: 1,
  grammarLessons: 1,
  tutorTurns: turns,
  speakingTurns: turns,
  maxRequests: 50,
  rateDate: RATE_DATE,
  pricingSource: RATE_SOURCE,
};
if (!live) {
  await writeFile(
    resolve(output, "session-plan.json"),
    JSON.stringify({ mode: "dry-run", contract, base }, null, 2),
  );
  console.log("Dry run: saved session-plan.json. Add --live for bounded real API requests.");
  process.exit(0);
}
if (!args["profile-config"])
  throw Error(
    "--profile-config=/absolute/private-fixture.json is required; never pass passwords on the command line.",
  );
const cfg = JSON.parse(await readFile(resolve(String(args["profile-config"])), "utf8"));
const account = cfg.accounts.admin;
const auth = await fetch(cfg.supabaseUrl + "/auth/v1/token?grant_type=password", {
  method: "POST",
  headers: { apikey: cfg.publicKey, "Content-Type": "application/json" },
  body: JSON.stringify({ email: account.email, password: account.password }),
});
const session = await auth.json();
if (!auth.ok) throw Error("Dedicated test account sign-in failed (HTTP " + auth.status + ")");
token = session.access_token;
const bundle = await readFile(
  resolve(root, ".vercel/output/functions/index.func/server.cjs"),
  "utf8",
);
const ids = new Map(
  [...bundle.matchAll(/id: "([a-f0-9]+)",\s+name: "([^"]+)",\s+filename: "src\/fns/g)].map((m) => [
    m[2],
    m[1],
  ]),
);
const { callLearningServerFn } = await import("./learning-session-transport.mjs");
const headers = { Origin: base, Authorization: "Bearer " + token };
const save = () =>
  writeFile(
    resolve(output, "session-measurements.json"),
    JSON.stringify({ contract, base, measuredAt: new Date().toISOString(), records }, null, 2),
  );
function guard() {
  if (++requests > 50) throw Error("Request cap reached");
  const priced = records.reduce((s, r) => s + (r.costUsd ?? 0), 0);
  if (priced > 1) throw Error("Measured API spend exceeded $1; stopping further requests");
}
async function fn(feature, name, data) {
  if (!ids.has(name)) throw Error("Build artifact is missing the requested server function");
  guard();
  let metering, status, returned;
  const start = Date.now();
  try {
    const value = await callLearningServerFn(
      base + "/_serverFn/" + ids.get(name),
      { data, headers },
      async (url, init) => {
        const r = await fetch(url, { ...init, signal: AbortSignal.timeout(90000) });
        status = r.status;
        const h = r.headers.get("x-lt-ai-usage");
        if (h) metering = JSON.parse(h);
        return r;
      },
    );
    const result = value?.result ?? value;
    returned = result;
    if (result?.error) throw Error("Application returned an error");
    if (!metering) throw Error("Missing usage receipt; do not count as free");
    records.push({
      feature,
      status: "PASS",
      httpStatus: status,
      elapsedMs: Date.now() - start,
      metering,
      costUsd: receiptCostUsd(metering),
    });
  } catch (e) {
    records.push({
      feature,
      status: "FAIL",
      httpStatus: status,
      elapsedMs: Date.now() - start,
      metering,
      costUsd: metering ? receiptCostUsd(metering) : null,
      error: e.message,
    });
  }
  await save();
  console.log(feature, records.at(-1).status);
  if (!metering || receiptCostUsd(metering) == null)
    throw Error("Usage receipt or verified model rate unavailable; stopping further calls");
  return returned;
}
async function chat(feature, path, body, turn) {
  guard();
  const start = Date.now();
  let text = "",
    metering,
    status;
  try {
    const r = await fetch(base + path, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });
    status = r.status;
    if (!r.ok) throw Error("HTTP " + r.status);
    const s = await r.text();
    for (const frame of s.split("\n\n")) {
      if (!frame.startsWith("data: {")) continue;
      const v = JSON.parse(frame.slice(6));
      text += v.choices?.[0]?.delta?.content || "";
      if (v.metering) metering = v.metering;
    }
    if (!text || !metering) throw Error("Missing text or complete usage receipt");
    records.push({
      feature,
      turn,
      status: "PASS",
      httpStatus: status,
      elapsedMs: Date.now() - start,
      metering,
      costUsd: receiptCostUsd(metering),
    });
  } catch (e) {
    records.push({
      feature,
      turn,
      status: "FAIL",
      httpStatus: status,
      elapsedMs: Date.now() - start,
      metering,
      costUsd: metering ? receiptCostUsd(metering) : null,
      error: e.message,
    });
  }
  await save();
  console.log(feature, turn, records.at(-1).status);
  if (!metering || receiptCostUsd(metering) == null)
    throw Error("Complete chat usage receipt or verified rate unavailable; stopping further calls");
  return text;
}
const sentence = "La cuadrilla revisa el techo, las tejas, la escalera y la canaleta.";
for (const word of ["cuadrilla", "techo", "tejas", "escalera", "canaleta"])
  await fn("word-lookup", "lookupWord", {
    word,
    sentence,
    language: "Spanish",
    nativeLanguage: "English",
  });
for (const word of ["cuadrilla", "techo"])
  await fn("repeat-lookup", "lookupWord", {
    word,
    sentence,
    language: "Spanish",
    nativeLanguage: "English",
  });
const generatedStory = await fn("story", "generateDailyStory", {
  language: "Spanish",
  level: "Beginner",
  nativeLanguage: "English",
  moduleId: "roofing",
  vocabWords: ["techo", "tejas", "cuadrilla"],
  patternName: "",
  patternFormula: "",
});
await fn("custom-cards", "translatePhrases", {
  phrases: [
    "Check the roof anchor",
    "Where are the shingles?",
    "We need more nails",
    "Please repeat that",
    "The crew arrives at seven",
    "Move the ladder",
    "Bring the materials",
    "We are ready",
  ],
  targetLanguage: "Spanish",
  context: "roofing foreman language practice",
});
await fn("grammar", "generateLessonContent", {
  language: "Spanish",
  nativeLanguage: "English",
  level: "A1",
  concept: "Present tense of necesitar in jobsite conversation",
});
for (const feature of ["tutor", "speaking"]) {
  const messages = [];
  for (let turn = 1; turn <= turns; turn++) {
    const prompts =
      feature === "tutor"
        ? [
            "Help me practice a short Spanish conversation about scheduling a roofing crew.",
            "How do I ask when the materials arrive?",
            "Give me a short reply to practice.",
            "Correct my Spanish: Necesitamos las tejas mañana.",
            "Ask me another short jobsite question.",
          ]
        : [
            "Hola, soy el encargado de la cuadrilla.",
            "Los materiales llegan a las siete.",
            "¿Puedes repetir la pregunta, por favor?",
            "Necesitamos más tejas para mañana.",
            "Sí, la cuadrilla está lista.",
          ];
    messages.push({ role: "user", content: prompts[(turn - 1) % prompts.length] });
    const body =
      feature === "tutor"
        ? {
            messages,
            context: {
              language: "Spanish",
              level: "Beginner",
              nativeLanguage: "English",
              module: { id: "roofing", name: "Roofing Foreman", userRole: "Roofing crew foreman" },
            },
          }
        : {
            mode: "chat",
            language: "Spanish",
            level: "Beginner",
            nativeLanguage: "English",
            userVocabWords: ["techo", "tejas", "cuadrilla"],
            messages,
          };
    const answer = await chat(
      feature,
      feature === "tutor" ? "/api/tutor" : "/api/speak",
      body,
      turn,
    );
    if (!answer) break;
    messages.push({ role: "assistant", content: answer });
    await new Promise((r) => setTimeout(r, feature === "speaking" ? 6000 : 1200));
  }
}
// Voice capability check is read-only. Voice pricing is modeled separately from actual text generation.
const vr = await fetch(base + "/api/mission-tts?languageCode=es-US", {
  headers,
  signal: AbortSignal.timeout(30000),
});
const caps = await vr.json();
records.push({
  feature: "cloud-voice-capability",
  status: vr.ok ? "PASS" : "FAIL",
  ready: Boolean(caps.ready),
  voices: Array.isArray(caps.voices) ? caps.voices.length : 0,
  costUsd: null,
});
if (caps.ready && Array.isArray(caps.voices) && caps.voices.length) {
  const voice = caps.voices.find((v) => /Neural2/.test(v.name)) ?? caps.voices[0];
  const sample = String(
    generatedStory?.data?.story ||
      "La cuadrilla llega temprano. Necesitamos las tejas y los materiales para el trabajo de hoy.",
  ).slice(0, 1000);
  guard();
  const started = Date.now();
  const r = await fetch(base + "/api/mission-tts", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: sample,
      voiceName: voice.name,
      languageCode: voice.languageCodes[0],
      speakingRate: 1,
      usage: "learning",
    }),
    signal: AbortSignal.timeout(60000),
  });
  const characterHeader = r.headers.get("x-tts-characters");
  const characters = characterHeader == null ? null : Number(characterHeader);
  await r.arrayBuffer();
  records.push({
    feature: "cloud-voice-sample",
    status: r.ok && characters === Array.from(sample).length ? "PASS" : "FAIL",
    httpStatus: r.status,
    elapsedMs: Date.now() - started,
    voice: voice.name,
    characters,
    costUsd: characters == null ? null : ttsCostUsd(voice.name, characters),
  });
}
await save();
console.log(
  "Saved measurements. No prompt, conversation, password or token is included in the report.",
);
