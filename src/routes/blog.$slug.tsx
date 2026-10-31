import { createFileRoute, notFound } from "@tanstack/react-router";
import { getBlogArticle } from "../fns/blog.functions";
export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const article = await getBlogArticle({ data: params.slug });
    if (!article) throw notFound();
    return article;
  },
  staleTime: 120000,
  head: ({ loaderData: article }) =>
    !article
      ? {}
      : {
          meta: [
            { title: `${article.title} — Language Threshold` },
            { name: "description", content: article.meta_description || "" },
            { property: "og:title", content: article.title },
            { property: "og:description", content: article.meta_description || "" },
            { property: "og:type", content: "article" },
            { name: "twitter:description", content: article.meta_description || "" },
          ],
          links: [{ rel: "canonical", href: article.canonical }],
          scripts: article.schema
            ? [{ type: "application/ld+json", children: article.schema }]
            : [],
        },
  component: BlogPost,
});
function BlogPost() {
  const article = Route.useLoaderData();
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-5 py-12 text-foreground">
      <a href="/blog" className="text-gold underline underline-offset-4">
        ← All articles
      </a>
      <article
        lang={article.language || "en"}
        dir={/^(ar|he|fa|ur)(-|$)/.test(article.language || "") ? "rtl" : undefined}
      >
        <h1 className="mt-8 font-display text-4xl font-semibold leading-tight">{article.title}</h1>
        <p className="mb-10 mt-3 text-sm text-muted-foreground">
          <time dateTime={article.published_at || article.published}>{article.published}</time>
          {article.read_time ? ` · ${article.read_time} min read` : ""}
        </p>
        <div className="blog-content" dangerouslySetInnerHTML={{ __html: article.content_html }} />
      </article>
    </main>
  );
}
