/** Serve only the intended public archive, before the application fallback. */
export const PICTURE_ACTION_DOWNLOAD_ROUTE = {
  src: "/downloads/picture-action-app-assets\\.zip",
  dest: "/downloads/picture-action-app-assets.zip",
  headers: {
    "content-type": "application/zip",
    "content-disposition": 'attachment; filename="picture-action-app-assets.zip"',
    "cache-control": "no-store",
  },
};
export function verifyPictureActionDownloadRoute(routes) {
  const path = "/downloads/picture-action-app-assets.zip";
  const first = routes?.find(
    (route) => typeof route.src === "string" && new RegExp(`^(?:${route.src})$`).test(path),
  );
  if (first?.dest !== path || first?.headers?.["content-type"] !== "application/zip")
    throw new Error(
      "Picture & Action image archive must route to its static ZIP before the app fallback.",
    );
}
