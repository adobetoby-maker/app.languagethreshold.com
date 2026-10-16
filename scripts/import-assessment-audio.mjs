/** Upload an authored clip without publishing or approving any form. No learner recordings. */
import { readFileSync, realpathSync, statSync } from "node:fs";
import { extname } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  ASSESSMENT_AUDIO_BUCKET,
  MAX_ASSESSMENT_AUDIO_BYTES,
  assessmentAudioPath,
  audioSignatureMatches,
} from "../src/lib/assessments/audio.ts";
const path = process.argv[2];
if (!path?.startsWith("/"))
  throw new Error("Pass an absolute authored clip path outside the public repository.");
const file = realpathSync(path),
  repo = realpathSync(process.cwd());
if (file.startsWith(repo + "/"))
  throw new Error("Assessment media must remain outside the public repository.");
const mime = { ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg" }[
  extname(file).toLowerCase()
];
const size = statSync(file).size;
if (!mime || size < 32 || size > MAX_ASSESSMENT_AUDIO_BYTES)
  throw new Error("Use a WAV, MP3 or Ogg authored clip between 32 bytes and 4 MiB.");
const bytes = readFileSync(file);
if (!audioSignatureMatches(bytes, mime))
  throw new Error("The file signature does not match its audio type.");
const asset = {
  sha256: createHash("sha256").update(bytes).digest("hex"),
  bytes: bytes.length,
  mime,
};
const project = "pollhlkgltdkdskdzsgd";
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const key = keys.find((row) => row.name === "service_role" && !row.disabled)?.api_key;
if (!key) throw new Error("Existing project service credentials are unavailable.");
const db = createClient(`https://${project}.supabase.co`, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = await db.storage.getBucket(ASSESSMENT_AUDIO_BUCKET);
if (
  bucket.error ||
  bucket.data?.public !== false ||
  bucket.data.file_size_limit !== MAX_ASSESSMENT_AUDIO_BYTES
)
  throw new Error(
    "The protected assessment bucket is not ready. Apply its reviewed migration first.",
  );
const storage = db.storage.from(ASSESSMENT_AUDIO_BUCKET),
  objectPath = assessmentAudioPath(asset);
const existing = await storage.download(objectPath);
if (existing.data) {
  if (
    existing.data.size !== asset.bytes ||
    createHash("sha256")
      .update(new Uint8Array(await existing.data.arrayBuffer()))
      .digest("hex") !== asset.sha256
  )
    throw new Error("Existing immutable clip does not match. Do not overwrite it.");
} else {
  // upsert:false protects immutable assets against concurrent or accidental replacement.
  const uploaded = await storage.upload(objectPath, bytes, {
    contentType: mime,
    upsert: false,
    cacheControl: "0",
  });
  if (uploaded.error) throw new Error("Clip upload failed; no existing clip was replaced.");
}
console.log(JSON.stringify({ project, audioAsset: asset, published: false, approved: false }));
