// Reduce the exact-pair module audit to a durable Japanese→English work queue.
// Run the read-only add-language-threshold-module audit first; this never
// changes catalog support, review flags, course content, or learner progress.
import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw Error("Usage: node scripts/qa/compact-japanese-audit.mjs audit.json coverage.json");
const source = JSON.parse(readFileSync(input, "utf8"));
const pair = source.pairSummary.find((item) =>
  item.targetLanguage === "Japanese" && item.nativeLanguage === "English");
if (!pair) throw Error("Japanese→English audit summary is missing");
const tracks = source.tracks.filter((item) => item.targetLanguage === "Japanese" &&
  item.nativeLanguage === "English" && item.catalogSupported).map((item) => ({
    id: item.moduleId,
    name: item.name,
    state: item.state,
    hasAuthoredMaterials: item.hasAuthoredMaterials,
    mapped60Draft: item.stages.every((stage) => stage.mappedComplete),
    stages: item.stages.map((stage) => ({
      id: stage.moduleId,
      expectedLessons: stage.expectedLessons,
      validAuthoredLessons: stage.counts.validAuthoredLessons,
      readingPassages: stage.counts.alignedReadings,
      speakingCards: stage.counts.speakingCards,
      readerPassages: stage.counts.fullReaderPassages,
      offlinePackRegistration: stage.offlinePackRegistration ?? null,
      reviewed: stage.publicFileReviewFlag === true,
    })),
  }));
const remaining = tracks.filter((item) => !item.mapped60Draft);
const report = {
  schema: 1,
  sourceRevision: source.revision,
  auditedAt: source.auditedAt,
  targetLanguage: "Japanese",
  nativeLanguage: "English",
  scope: source.scope,
  compatibleTracks: tracks.length,
  mapped60Drafts: tracks.length - remaining.length,
  remainingWithoutMapped60: remaining.length,
  partialRemaining: remaining.filter((item) => item.hasAuthoredMaterials).length,
  emptyRemaining: remaining.filter((item) => !item.hasAuthoredMaterials).length,
  releaseEvidence: "Not established by this source audit; verify human review and deployment separately.",
  tracks,
};
if (tracks.length !== pair.catalogModules || report.mapped60Drafts !== pair.mapped60 ||
    report.partialRemaining + report.emptyRemaining !== remaining.length) {
  throw Error("Audit summary and tracks disagree");
}
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({compatibleTracks: report.compatibleTracks,
  mapped60Drafts: report.mapped60Drafts, remainingWithoutMapped60: report.remainingWithoutMapped60,
  partialRemaining: report.partialRemaining, emptyRemaining: report.emptyRemaining}));
