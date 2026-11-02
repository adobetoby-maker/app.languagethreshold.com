import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
export function urlsFromSitemap(xml, origin) {
  if (!/<urlset\b/.test(xml)) throw new Error("Expected a sitemap urlset");
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replaceAll("&amp;", "&"));
  if (!urls.length || urls.length > 10000) throw new Error("Expected 1–10,000 published URLs");
  for (const value of urls)
    if (new URL(value).origin !== origin) throw new Error("Sitemap URL is outside this site");
  return [...new Set(urls)];
}
export async function publishIndexNow(config, fetcher = fetch) {
  const origin = `https://${config.host}`;
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(config.key)) throw new Error("Invalid IndexNow key");
  const keyLocation = `${origin}/${config.key}.txt`;
  const keyResponse = await fetcher(keyLocation, { signal: AbortSignal.timeout(20000) });
  if (!keyResponse.ok || (await keyResponse.text()).trim() !== config.key)
    throw new Error(
      "The verification key is not live. Publish this revision before notifying IndexNow.",
    );
  const sitemap = await fetcher(`${origin}/sitemap.xml`, {
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!sitemap.ok) throw new Error("Live sitemap could not be read");
  const urlList = urlsFromSitemap(await sitemap.text(), origin);
  const response = await fetcher("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ host: config.host, key: config.key, keyLocation, urlList }),
    signal: AbortSignal.timeout(20000),
  });
  if (![200, 202].includes(response.status))
    throw new Error(`IndexNow rejected the submission (${response.status})`);
  console.log(`IndexNow accepted ${urlList.length} URLs for ${config.host} (${response.status}).`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await publishIndexNow(JSON.parse(readFileSync(new URL("./site.json", import.meta.url), "utf8")));
}
