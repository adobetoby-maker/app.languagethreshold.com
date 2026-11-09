import test from "node:test";
import assert from "node:assert/strict";
import {
  PICTURE_ACTION_DOWNLOAD_ROUTE as route,
  verifyPictureActionDownloadRoute,
} from "../scripts/picture-action-download-route.mjs";
test("archive routes to a real static download before fallback; other downloads stay unexposed", () => {
  const fallback = { src: "/(.*)", dest: "/" };
  assert.doesNotThrow(() => verifyPictureActionDownloadRoute([route, fallback]));
  assert.throws(
    () => verifyPictureActionDownloadRoute([fallback, route]),
    /before the app fallback/,
  );
  assert.throws(() => verifyPictureActionDownloadRoute([fallback]), /static ZIP/);
  const re = new RegExp(`^(?:${route.src})$`);
  assert.ok(re.test("/downloads/picture-action-app-assets.zip"));
  for (const path of [
    "/downloads/private.zip",
    "/downloads/picture-action-app-assetsXzip",
    "/downloads/picture-action-app-assets.zip/extra",
    "/private/picture-action-app-assets.zip",
  ])
    assert.equal(re.test(path), false, path);
});
