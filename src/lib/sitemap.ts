export const SITEMAP_ORIGIN = "https://app.languagethreshold.com";
export interface SitemapPage {
  path: string;
  lastmod?: string;
}
export interface SitemapArticle {
  slug: string;
  updated?: string;
  published_at?: string;
  published?: string;
}
const xml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
export function sourceDate(value?: string): string | undefined {
  // Accept machine dates only. Human labels and invalid dates never become build dates.
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)
  )
    return;
  const calendarDate = new Date(value.slice(0, 10) + "T00:00:00Z");
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== value.slice(0, 10)) return;
  return date.toISOString();
}
export function sitemapPages(pages: SitemapPage[], articles: SitemapArticle[]): SitemapPage[] {
  const result = pages.map((page) => ({ ...page, lastmod: sourceDate(page.lastmod) }));
  for (const article of articles) {
    const lastmod =
      sourceDate(article.updated) ??
      sourceDate(article.published_at) ??
      sourceDate(article.published);
    result.push({ path: `/blog/${encodeURIComponent(article.slug)}`, lastmod });
  }
  const blog = result.find((page) => page.path === "/blog");
  const dates = result
    .filter((page) => page.path.startsWith("/blog/") || page.path === "/blog")
    .flatMap((page) => (page.lastmod ? [page.lastmod] : []));
  if (blog && dates.length) blog.lastmod = dates.sort().at(-1);
  return result;
}
export function renderSitemap(pages: SitemapPage[], articles: SitemapArticle[]): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    sitemapPages(pages, articles)
      .map(
        (page) =>
          `  <url><loc>${xml(SITEMAP_ORIGIN + page.path)}</loc>${page.lastmod ? `<lastmod>${xml(page.lastmod)}</lastmod>` : ""}</url>`,
      )
      .join("\n") +
    "\n</urlset>\n"
  );
}
