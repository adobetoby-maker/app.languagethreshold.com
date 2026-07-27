import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const MISSION_ID = "fb5416a6-7000-46b9-bea3-bce25c654c2c";
const requiredArtifacts = [
  ["CODEX_PLAN.md", "independent-complete"],
  ["BUILD_STAGE_ARTIFACT.md", MISSION_ID],
  ["REPAIR_STAGE_ARTIFACT.md", MISSION_ID],
  ["FINAL_HANDOFF.md", MISSION_ID],
  ["marketing/reader-tutor-demo/SCREENPLAY.md", "Reader"],
  ["marketing/reader-tutor-demo/SHOT_LIST.md", "Tutor"],
  ["marketing/reader-tutor-demo/CAPTION_COPY.md", "Remember"],
];

const failures = [];

for (const [path, marker] of requiredArtifacts) {
  if (!existsSync(path) || !statSync(path).isFile()) {
    failures.push(`${path}: missing`);
    continue;
  }

  const content = readFileSync(path, "utf8");
  if (content.trim().length === 0) failures.push(`${path}: empty`);
  if (!content.includes(marker)) failures.push(`${path}: missing required marker "${marker}"`);
  if (/^(?:<{7}|={7}|>{7})/m.test(content)) failures.push(`${path}: unresolved merge marker`);
}

const marketingDir = "marketing/reader-tutor-demo";
if (existsSync(marketingDir)) {
  const nonDocumentArtifacts = readdirSync(marketingDir)
    .map((name) => join(marketingDir, name))
    .filter((path) => statSync(path).isFile() && extname(path).toLowerCase() !== ".md");

  if (nonDocumentArtifacts.length > 0) {
    failures.push(`raw marketing artifacts must stay outside git: ${nonDocumentArtifacts.join(", ")}`);
  }
}

const aiGate = readFileSync("src/lib/ai-gate.ts", "utf8");
if (!aiGate.includes('return "open";')) {
  failures.push("src/lib/ai-gate.ts: approved demo-mode baseline changed");
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });
}

const learnerDiagnosticPattern = /Filter check|filter inactive|No active module/i;
for (const path of sourceFiles("src")) {
  if (!/\.(?:ts|tsx|css)$/.test(path)) continue;
  if (learnerDiagnosticPattern.test(readFileSync(path, "utf8"))) {
    failures.push(`${path}: contains learner-facing filter diagnostic language`);
  }
}

if (failures.length > 0) {
  console.error("Rosetta check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Rosetta check passed: ${requiredArtifacts.length} required artifacts verified.`);
console.log("No raw reader-tutor demo media is present in the repository.");
console.log("Protected AI-gate baseline and learner-diagnostic invariants verified.");
