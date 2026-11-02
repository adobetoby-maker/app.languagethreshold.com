import { createFileRoute } from "@tanstack/react-router";
import { getBlogArticles } from "../fns/blog.functions";
export const Route = createFileRoute("/blog/")({
  loader: () => getBlogArticles(),
  staleTime: 120000,
  head: () => ({
    meta: [
      { title: "Blog — Language Threshold" },
      {
        name: "description",
        content: "Ideas and practical guidance for learning a language with Language Threshold.",
      },
    ],
    links: [{ rel: "canonical", href: "https://app.languagethreshold.com/blog" }],
  }),
  component: BlogIndex,
});
function BlogIndex() {
  const articles = Route.useLoaderData();
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-5 py-12 text-foreground">
      <a href="/" className="text-gold underline underline-offset-4">
        ← Language Threshold
      </a>
      <h1 className="my-8 font-display text-4xl font-semibold">Blog</h1>
      {articles.length ? (
        <ul className="divide-y divide-border">
          {articles.map((article) => (
            <li key={article.id} className="py-6">
              <h2 className="font-display text-2xl">
                <a href={`/blog/${encodeURIComponent(article.slug)}`} className="hover:text-gold">
                  {article.title}
                </a>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                <time dateTime={article.published_at || article.published}>
                  {article.published}
                </time>
                {article.read_time ? ` · ${article.read_time} min read` : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No articles yet.</p>
      )}
    </main>
  );
}
