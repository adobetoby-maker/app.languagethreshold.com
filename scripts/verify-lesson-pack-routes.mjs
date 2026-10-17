/** Check first-match routing, not merely the presence of files in the build. */
export function verifyLessonPackRoutes(routes, manifests) {
  if (!manifests.length) throw new Error("No public lesson pack manifests were built.");
  for (const manifest of manifests) {
    for (const [path, cache] of [
      [`/lesson-packs/${manifest.packId}.json`, "no-store"],
      [manifest.content.url, "public, max-age=31536000, immutable"],
    ]) {
      const route = routes.find(route => new RegExp(`^(?:${route.src})$`).test(path));
      if (!route || path.replace(new RegExp(`^(?:${route.src})$`), route.dest) !== path || route.headers?.["cache-control"] !== cache)
        throw new Error(`Public lesson pack has no exact static route/cache policy: ${manifest.packId}`);
    }
  }
}
