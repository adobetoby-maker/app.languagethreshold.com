import { useEffect, useState } from "react";
import { getBlogHasArticles } from "../../fns/blog.functions";

// Keep the article-free blog reachable at /blog without advertising an empty list.
export function BlogNavLink() {
  const [hasArticles, setHasArticles] = useState(false);
  useEffect(() => {
    let active = true;
    void getBlogHasArticles()
      .then((available) => {
        if (active) setHasArticles(available);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (!hasArticles) return null;
  return (
    <a href="/blog" className="block px-3 py-2 text-sm text-foreground hover:text-gold">
      Blog
    </a>
  );
}
