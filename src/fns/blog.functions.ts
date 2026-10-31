import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
export const getBlogArticles = createServerFn({ method: "GET" }).handler(async () => {
  const { listBlogArticles } = await import("../lib/heycatch-blog.server");
  return listBlogArticles();
});
export const getBlogArticle = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) => z.string().min(1).max(500).parse(value))
  .handler(async ({ data }) => {
    const { readBlogArticle } = await import("../lib/heycatch-blog.server");
    return readBlogArticle(data);
  });
