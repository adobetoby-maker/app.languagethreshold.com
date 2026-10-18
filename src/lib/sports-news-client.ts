import type { NewsArticle } from "../routes/api.sports-news";
import { readBrowserJson } from "./browser-json-response.ts";
export const SPORTS_NEWS_WAIT_MS = 30_000;
export const SPORTS_NEWS_MAX_BYTES = 64 * 1024;
const fail = () => new Error("News unavailable — try again later.");
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, max: number, min = 0): value is string =>
  typeof value === "string" && value.length >= min && value.length <= max;
function articles(value: unknown, sport: "soccer" | "baseball"): NewsArticle[] {
  if (
    !record(value) ||
    value.error !== undefined ||
    !Array.isArray(value.articles) ||
    value.articles.length > 10
  )
    throw fail();
  return value.articles.map((row) => {
    if (
      !record(row) ||
      !text(row.id, 80, 1) ||
      !text(row.title, 400, 1) ||
      !text(row.summary, 200) ||
      !text(row.url, 2048, 1) ||
      !text(row.pubDate, 80, 1) ||
      !Number.isFinite(Date.parse(row.pubDate)) ||
      !text(row.source, 120, 1) ||
      row.sport !== sport ||
      !Array.isArray(row.teamMentions) ||
      row.teamMentions.length > 64 ||
      !row.teamMentions.every((team) => text(team, 80, 1))
    )
      throw fail();
    const url = new URL(row.url);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw fail();
    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      url: url.href,
      pubDate: row.pubDate,
      source: row.source,
      sport,
      teamMentions: [...row.teamMentions],
    };
  });
}
/** One current panel request owns headers and bounded JSON consumption. */
export async function getSportsNews(
  selection: { sport: "soccer" | "baseball"; favoriteTeam: string | null },
  owner: { signal: AbortSignal; isCurrent: () => boolean },
): Promise<NewsArticle[]> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const current = () => {
    if (owner.signal.aborted || !owner.isCurrent())
      throw new DOMException("News request cancelled.", "AbortError");
    if (controller.signal.aborted) throw fail();
  };
  const timer = setTimeout(abort, SPORTS_NEWS_WAIT_MS);
  owner.signal.addEventListener("abort", abort, { once: true });
  if (owner.signal.aborted) controller.abort();
  let rejectAbort: (() => void) | undefined;
  try {
    current();
    const action = async () => {
      const pending = fetch("/api/sports-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selection),
        cache: "no-store",
        signal: controller.signal,
      });
      void pending.then(
        (response) => {
          if (controller.signal.aborted || !owner.isCurrent())
            void response.body?.cancel().catch(() => {});
        },
        () => {},
      );
      const response = await pending;
      current();
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        throw fail();
      }
      const data = await readBrowserJson(response, controller.signal, SPORTS_NEWS_MAX_BYTES);
      current();
      return articles(data, selection.sport);
    };
    const result = await Promise.race([
      action(),
      new Promise<never>((_, reject) => {
        rejectAbort = () => reject(fail());
        controller.signal.addEventListener("abort", rejectAbort, { once: true });
        if (controller.signal.aborted) rejectAbort();
      }),
    ]);
    current();
    return result;
  } catch {
    controller.abort();
    if (owner.signal.aborted || !owner.isCurrent())
      throw new DOMException("News request cancelled.", "AbortError");
    throw fail();
  } finally {
    clearTimeout(timer);
    owner.signal.removeEventListener("abort", abort);
    if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
  }
}
