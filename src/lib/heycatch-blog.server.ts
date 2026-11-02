import sanitizeHtml from "sanitize-html";

export const BLOG_ORIGIN = "https://app.languagethreshold.com";
export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  meta_description?: string;
  published?: string;
  updated?: string;
  published_at?: string;
  read_time?: number;
  language?: string;
  content_html?: string;
  jsonLd?: Record<string, unknown>;
}
const cache = new Map<string, { value: unknown; expires: number }>();
const pending = new Map<string, Promise<unknown>>();
async function readApi<T>(path: string): Promise<T | null> {
  const key = process.env.HEYCATCH_API_KEY;
  if (!key) return null;
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now()) return cached.value as T;
  if (pending.has(path)) return pending.get(path) as Promise<T | null>;
  const work = (async () => {
    try {
      const url = new URL(`https://api.heycatch.ai/v1/${path}`);
      url.searchParams.set("key", key);
      let response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (response.status === 429) {
        const delay = Number(response.headers.get("Retry-After"));
        if (Number.isFinite(delay) && delay >= 0 && delay <= 5) {
          await new Promise((resolve) => setTimeout(resolve, delay * 1000));
          response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        }
      }
      if (response.status === 403 || response.status === 404) {
        cache.delete(path);
        return (response.status === 404 ? { article: null } : null) as T | null;
      }
      if (!response.ok) throw new Error("Blog temporarily unavailable");
      const value = (await response.json()) as T;
      cache.set(path, { value, expires: Date.now() + 120_000 });
      return value;
    } catch {
      // Never log the request URL: it contains the publication key.
      if (cached) cached.expires = Date.now() + 30_000;
      return (cached?.value as T) ?? null;
    } finally {
      pending.delete(path);
    }
  })();
  pending.set(path, work);
  return work;
}
export async function listBlogArticles(): Promise<Omit<BlogArticle, "jsonLd">[]> {
  const articles: Omit<BlogArticle, "jsonLd">[] = [];
  for (let offset = 0; ; offset += 50) {
    const page = await readApi<{ articles: BlogArticle[]; total: number }>(
      `articles?limit=50&offset=${offset}`,
    );
    if (!page || !Array.isArray(page.articles)) return [];
    articles.push(...page.articles.map(({ jsonLd: _schema, ...article }) => article));
    if (articles.length >= page.total) return articles;
    if (!page.articles.length) return []; // An incomplete list must not masquerade as complete.
  }
}
export function prepareBlogHtml(html: string) {
  const clean = sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags.filter((tag) => tag !== "h1"), "img"],
    allowedAttributes: {
      a: ["href", "title"],
      h2: ["id"],
      img: ["src", "alt"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["https", "http", "mailto"],
  });
  const headings = [...clean.matchAll(/<h2\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)].filter(
    (match) => match[1] !== "faq",
  );
  const toc = headings.length
    ? `<nav aria-label="Table of contents"><h2>Table of contents</h2><ul>${headings.map((match) => `<li><a href="#${match[1]}">${sanitizeHtml(match[2], { allowedTags: [], allowedAttributes: {} })}</a></li>`).join("")}</ul></nav>`
    : "";
  const takeaways = clean.match(/<h2>Key takeaways<\/h2>\s*<ul>[\s\S]*?<\/ul>/i);
  if (!takeaways || takeaways.index === undefined) return toc + clean;
  const end = takeaways.index + takeaways[0].length;
  return clean.slice(0, end) + toc + clean.slice(end);
}
export async function readBlogArticle(slug: string) {
  const result = await readApi<{ article: BlogArticle }>(`articles/${encodeURIComponent(slug)}`);
  if (!result)
    return {
      id: slug,
      slug,
      title: "Blog",
      content_html: "<p>Articles are temporarily unavailable. Please try again shortly.</p>",
      canonical: `${BLOG_ORIGIN}/blog/${encodeURIComponent(slug)}`,
      schema: null,
    };
  if (!result.article || typeof result.article.content_html !== "string") return null;
  const article = result.article;
  const canonical = `${BLOG_ORIGIN}/blog/${encodeURIComponent(article.slug)}`;
  const schema =
    article.jsonLd && Object.keys(article.jsonLd).length ? { ...article.jsonLd } : null;
  if (schema && !schema.url) {
    schema.url = canonical;
    schema.mainEntityOfPage = canonical;
  }
  const { jsonLd: _schema, ...publicArticle } = article;
  return {
    ...publicArticle,
    content_html: prepareBlogHtml(article.content_html!),
    canonical,
    schema: schema ? JSON.stringify(schema).replace(/</g, "\\u003c") : null,
  };
}
