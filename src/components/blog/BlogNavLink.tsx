import { useQuery } from "@tanstack/react-query";
import { getBlogArticles } from "../../fns/blog.functions";
export function BlogNavLink() {
  const { data } = useQuery({
    queryKey: ["published-blog"],
    queryFn: () => getBlogArticles(),
    staleTime: 120000,
    refetchInterval: 120000,
  });
  return data?.length ? (
    <a href="/blog" className="block px-3 py-2 text-sm text-foreground hover:text-gold">
      Blog
    </a>
  ) : null;
}
