import { createFileRoute } from "@tanstack/react-router";
import { listBlogArticles } from "../lib/heycatch-blog.server";
import pages from "../lib/sitemap-pages.generated.json";
import { renderSitemap } from "../lib/sitemap";
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () =>
        new Response(renderSitemap(pages, await listBlogArticles()), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=120",
          },
        }),
    },
  },
});
