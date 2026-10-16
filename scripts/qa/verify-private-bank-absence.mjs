/** Owner-local release check. Never prints question text, answers, keys, or file contents. */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
try {
  if (!process.argv[2]) throw new Error("Private bank argument required");
  const bank = JSON.parse(readFileSync(process.argv[2], "utf8"));
  const markers = [
    ...new Set(
      bank.forms.flatMap((form) =>
        form.items.flatMap((item) =>
          [item.id, item.prompt, item.audioText, item.passage].filter(
            (value) =>
              typeof value === "string" && value && (value === item.id || value.length > 80),
          ),
        ),
      ),
    ),
  ];
  if (!markers.length) throw new Error("No audit markers");
  const source = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter((file) => /\.(?:[cm]?js|tsx?|json|md|html|css|sql|ya?ml|txt|csv)$/.test(file));
  const walk = (directory) =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)],
    );
  const artifact = walk(".vercel/output/static").filter((file) => /\.(?:js|html|json)$/.test(file));
  if (!artifact.length) throw new Error("No static artifact");
  const hits = [];
  for (const file of [...source, ...artifact]) {
    const content = readFileSync(file, "utf8");
    if (
      markers.some(
        (marker) =>
          content.includes(marker) || content.includes(JSON.stringify(marker).slice(1, -1)),
      )
    )
      hits.push(file);
  }
  const report = {
    testedAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    checkedPrivateMarkers: markers.length,
    checkedSourceFiles: source.length,
    checkedStaticFiles: artifact.length,
    privateContentHits: hits.length,
  };
  if (hits.length) {
    console.error("Private exam content detected in source/static artifact. Release blocked.");
    process.exitCode = 1;
  } else {
    writeFileSync(
      "docs/reviews/qa-private-bank-absence-2026-10-16.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report));
  }
} catch {
  console.error(
    "Private-content audit could not complete. No content has been printed; release verification is incomplete.",
  );
  process.exitCode = 1;
}
