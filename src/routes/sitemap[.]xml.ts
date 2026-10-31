import { createFileRoute } from "@tanstack/react-router";
import { listBlogArticles, BLOG_ORIGIN } from "../lib/heycatch-blog.server";
const base =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://app.languagethreshold.com/</loc></url>\n  <url><loc>https://app.languagethreshold.com/pricing</loc></url>\n  <url><loc>https://app.languagethreshold.com/team</loc></url>\n  <url><loc>https://app.languagethreshold.com/support</loc></url>\n  <url><loc>https://app.languagethreshold.com/vs/clinicalingo</loc></url>\n  <url><loc>https://app.languagethreshold.com/vs/duolingo</loc></url>\n\n';
const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const articles = await listBlogArticles();
        const entries = articles
          .map(
            (a) =>
              `<url><loc>${BLOG_ORIGIN}/blog/${escapeXml(encodeURIComponent(a.slug))}</loc>${a.updated && !Number.isNaN(Date.parse(a.updated)) ? `<lastmod>${escapeXml(a.updated)}</lastmod>` : ""}</url>`,
          )
          .join("");
        return new Response(
          base + `<url><loc>${BLOG_ORIGIN}/blog</loc></url>` + entries + "</urlset>",
          {
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": "public, max-age=120",
            },
          },
        );
      },
    },
  },
});
