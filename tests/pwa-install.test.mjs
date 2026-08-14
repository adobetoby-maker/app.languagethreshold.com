import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isIosDevice } from "../src/lib/pwa-install.ts";

test("iPhone and touch-mode iPad are recognized for manual install guidance", () => {
  assert.equal(
    isIosDevice(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15",
      "iPhone",
      5,
    ),
    true,
  );
  assert.equal(
    isIosDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", "MacIntel", 5),
    true,
  );
  assert.equal(
    isIosDevice("Mozilla/5.0 (Linux; Android 15; Pixel 9)", "Linux armv8l", 5),
    false,
  );
});

test("manifest declares a stable standalone install identity and required icons", async () => {
  const manifest = JSON.parse(await readFile("public/manifest.webmanifest", "utf8"));

  assert.equal(manifest.id, "/");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.prefer_related_applications, false);
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.type === "image/png"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.type === "image/png"));
});

test("service worker bypasses dynamic APIs and retains an offline navigation shell", async () => {
  const serviceWorker = await readFile("public/sw.js", "utf8");

  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /request\.method !== "GET"/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /caches\.match\("\/"\)/);
});
