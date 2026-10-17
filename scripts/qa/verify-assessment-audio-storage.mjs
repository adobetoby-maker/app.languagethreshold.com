/** Hosted storage boundary trial. Creates/removes only one unique synthetic non-speech clip. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { ASSESSMENT_AUDIO_BUCKET, assessmentAudioPath } from "../../src/lib/assessments/audio.ts";
const qa = JSON.parse(
  readFileSync("/Users/drive/.codex/tmp/language-threshold-qa/roofing-20261015.json", "utf8"),
);
assert.equal(qa.project, "pollhlkgltdkdskdzsgd");
assert.equal(qa.run, "roofing-20261015");
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", qa.project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const url = `https://${qa.project}.supabase.co`,
  publicKey = keys.find((row) => row.name === "anon")?.api_key;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(
  url,
  keys.find((row) => row.name === "service_role" && !row.disabled)?.api_key,
  options,
);
const anonymous = createClient(url, publicKey, options),
  admin = createClient(url, publicKey, options);
assert.equal(
  (await admin.auth.signInWithPassword({ email: qa.adminEmail, password: qa.adminPassword })).error,
  null,
);
// Valid silent WAV header, plus random test metadata so this run owns a unique immutable path.
const bytes = Buffer.alloc(444);
bytes.write("RIFF");
bytes.writeUInt32LE(436, 4);
bytes.write("WAVEfmt ", 8);
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(1, 22);
bytes.writeUInt32LE(8000, 24);
bytes.writeUInt32LE(16000, 28);
bytes.writeUInt16LE(2, 32);
bytes.writeUInt16LE(16, 34);
bytes.write("data", 36);
bytes.writeUInt32LE(400, 40);
randomBytes(32).copy(bytes, 44);
const asset = {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    mime: "audio/wav",
  },
  path = assessmentAudioPath(asset);
let uploaded = false;
try {
  const bucket = await service.storage.getBucket(ASSESSMENT_AUDIO_BUCKET);
  assert.equal(bucket.error, null);
  assert.equal(bucket.data.public, false);
  assert.equal(bucket.data.file_size_limit, 4194304);
  const upload = await service.storage
    .from(ASSESSMENT_AUDIO_BUCKET)
    .upload(path, bytes, { contentType: asset.mime, upsert: false });
  assert.equal(upload.error, null);
  uploaded = true;
  const read = await service.storage.from(ASSESSMENT_AUDIO_BUCKET).download(path);
  assert.equal(read.error, null);
  assert.equal(
    createHash("sha256")
      .update(new Uint8Array(await read.data.arrayBuffer()))
      .digest("hex"),
    asset.sha256,
  );
  for (const client of [anonymous, admin]) {
    assert.ok(
      (await client.storage.from(ASSESSMENT_AUDIO_BUCKET).download(path)).error,
      "No direct browser clip read",
    );
    const listed = await client.storage
      .from(ASSESSMENT_AUDIO_BUCKET)
      .list("sha256", { search: asset.sha256 });
    assert.ok(listed.error || listed.data?.length === 0, "No direct browser clip listing");
    assert.ok(
      (await client.storage.from(ASSESSMENT_AUDIO_BUCKET).createSignedUrl(path, 30)).error,
      "No signed-URL escape",
    );
  }
  const publicUrl = anonymous.storage.from(ASSESSMENT_AUDIO_BUCKET).getPublicUrl(path)
    .data.publicUrl;
  assert.equal((await fetch(publicUrl)).ok, false, "No public URL escape");
  const report = {
    project: qa.project,
    bucketPrivate: true,
    sizeLimit: 4194304,
    serviceRoundtrip: true,
    anonymousAndAdminReadListSignDenied: true,
    publicUrlDenied: true,
    syntheticOnly: true,
    formsChanged: false,
    learnerRecordings: false,
  };
  if (process.env.LT_QA_REPORT_PATH)
    writeFileSync(process.env.LT_QA_REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
} finally {
  if (uploaded)
    assert.equal(
      (await service.storage.from(ASSESSMENT_AUDIO_BUCKET).remove([path])).error,
      null,
      "Remove only this run’s synthetic clip",
    );
  await admin.auth.signOut({ scope: "local" });
}
