/* Public lesson downloads only. Never accepts arbitrary URLs or learner/exam responses. */
const LESSON_PACK_PREFIX = "lt-lesson-pack-";
const LESSON_PACK_MANIFEST = "/lesson-packs/roofing-es-en.json";
const LESSON_PACK_READY = "/.lt-lesson-pack-ready";
let lessonPackInstallation = null;

async function lessonPackHash(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}

function validateLessonPackManifest(manifest) {
  if (
    manifest?.schema !== 1 ||
    manifest.packId !== "roofing-es-en" ||
    !/^[a-f0-9]{64}$/.test(manifest.version) ||
    !/^[a-f0-9]{64}$/.test(manifest.appVersion) ||
    manifest.shell !== "/" ||
    !Array.isArray(manifest.assets) ||
    !manifest.assets.length ||
    manifest.assets.length > 512 ||
    !/^\/lesson-packs\/roofing-es-en-[a-f0-9]{64}\.json$/.test(manifest.content?.url)
  )
    throw new Error("Invalid lesson download manifest.");
  const files = [...manifest.assets, manifest.content];
  const urls = new Set();
  for (const file of files) {
    if (
      !Number.isInteger(file.bytes) ||
      file.bytes <= 0 ||
      file.bytes > 64 * 1024 * 1024 ||
      !/^[a-f0-9]{64}$/.test(file.sha256) ||
      urls.has(file.url) ||
      (file !== manifest.content &&
        !/^\/assets\/[A-Za-z0-9_.\/-]+\.(?:js|mjs|css|woff2?|png|svg|jpg|webp|ico)$/.test(
          file.url,
        )) ||
      file.url.includes("..") ||
      file.url.includes("//")
    )
      throw new Error("Unsafe or incomplete lesson download file.");
    urls.add(file.url);
  }
  const bytes = files.reduce((sum, file) => sum + file.bytes, 0);
  if (bytes !== manifest.totalBytes || bytes > 64 * 1024 * 1024)
    throw new Error("Lesson download exceeds its size limit.");
  return files;
}

async function lessonPackFetch(url, deadline = Date.now() + 30000) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error("Lesson download timed out. Try again when connected.");
  const response = await fetch(url, {
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(Math.min(30000, remaining)),
  });
  if (!response.ok || response.type === "opaque")
    throw new Error("A lesson download file is unavailable.");
  return response;
}

async function installedLessonPack(verifyHashes = false) {
  const names = (await caches.keys()).filter((name) => name.startsWith(LESSON_PACK_PREFIX));
  for (const name of names.reverse()) {
    const cache = await caches.open(name);
    const ready = await cache.match(LESSON_PACK_READY);
    if (!ready) continue;
    try {
      const manifest = await ready.json();
      const files = validateLessonPackManifest(manifest);
      const present = await Promise.all(
        ["/", ...files.map((f) => f.url)].map((url) => cache.match(url)),
      );
      if (!present.every(Boolean)) continue;
      if (verifyHashes) {
        const checked = await Promise.all(
          files.map(async (file, i) => {
            const bytes = await present[i + 1].clone().arrayBuffer();
            return bytes.byteLength === file.bytes && (await lessonPackHash(bytes)) === file.sha256;
          }),
        );
        if (!checked.every(Boolean)) continue;
      }
      return { cache, manifest };
    } catch {
      /* Damaged/evicted content never earns an available label. */
    }
  }
  return null;
}

async function offlineLessonShell() {
  return (await installedLessonPack())?.cache.match("/");
}

async function installLessonPack() {
  const deadline = Date.now() + 180000;
  const manifestResponse = await lessonPackFetch(LESSON_PACK_MANIFEST, deadline);
  const manifestText = await manifestResponse.text();
  if (manifestText.length > 256000) throw new Error("Lesson manifest is too large.");
  const manifest = JSON.parse(manifestText);
  const files = validateLessonPackManifest(manifest);
  if (
    (await lessonPackHash(new TextEncoder().encode(JSON.stringify(manifest.assets)))) !==
      manifest.appVersion ||
    (await lessonPackHash(
      new TextEncoder().encode(`${manifest.content.sha256}:${manifest.appVersion}`),
    )) !== manifest.version
  )
    throw new Error("Lesson manifest version does not match its files.");
  const name = LESSON_PACK_PREFIX + manifest.version;
  const existing = await installedLessonPack(true);
  if (existing?.manifest.version === manifest.version) return manifest;
  const cache = await caches.open(name);
  try {
    // No ready marker is written until the full download and shell agree.
    let next = 0;
    const transfers = await Promise.allSettled(
      Array.from({ length: 4 }, async () => {
        while (next < files.length) {
          const file = files[next++];
          const response = await lessonPackFetch(file.url, deadline);
          const bytes = await response.clone().arrayBuffer();
          if (bytes.byteLength !== file.bytes || (await lessonPackHash(bytes)) !== file.sha256)
            throw new Error("A lesson file failed its integrity check. Try downloading again.");
          await cache.put(file.url, response);
        }
      }),
    );
    const failed = transfers.find((result) => result.status === "rejected");
    if (failed) throw failed.reason;
    const shell = await lessonPackFetch("/", deadline);
    const html = await shell.clone().text();
    const referenced = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map(
      (match) => match[1],
    );
    const expected = new Set(manifest.assets.map((file) => file.url));
    if (!referenced.length || referenced.some((url) => !expected.has(url)))
      throw new Error("The app changed during download. Reload and download again.");
    await cache.put("/", shell);
    await cache.put(
      LESSON_PACK_READY,
      new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/json" } }),
    );
    // Retain the previous complete release until its replacement has committed.
    for (const old of await caches.keys()) {
      if (old.startsWith(LESSON_PACK_PREFIX) && old !== name) await caches.delete(old);
    }
    return manifest;
  } catch (error) {
    await caches.delete(name);
    throw error;
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "LESSON_PACK_PING" && event.ports?.[0]) {
    event.ports[0].postMessage({ ok: true, protocol: 1 });
    return;
  }

  if (
    !["LESSON_PACK_STATUS", "LESSON_PACK_INSTALL", "LESSON_PACK_REMOVE"].includes(
      event.data?.type,
    ) ||
    !event.ports?.[0]
  )
    return;
  event.waitUntil(
    (async () => {
      try {
        if (event.data.type === "LESSON_PACK_INSTALL") {
          if (!lessonPackInstallation)
            lessonPackInstallation = installLessonPack().finally(() => {
              lessonPackInstallation = null;
            });
          await lessonPackInstallation;
        } else if (event.data.type === "LESSON_PACK_REMOVE") {
          if (lessonPackInstallation) throw new Error("Wait for the current download to finish.");
          await Promise.all(
            (await caches.keys())
              .filter((name) => name.startsWith(LESSON_PACK_PREFIX))
              .map((name) => caches.delete(name)),
          );
        }
        const installed = await installedLessonPack(event.data.type === "LESSON_PACK_STATUS");
        event.ports[0].postMessage({
          ok: true,
          ready: !!installed,
          version: installed?.manifest.version ?? null,
          bytes: installed?.manifest.totalBytes ?? 0,
        });
      } catch (error) {
        event.ports[0].postMessage({
          ok: false,
          error: error instanceof Error ? error.message : "Download could not finish.",
        });
      }
    })(),
  );
});
