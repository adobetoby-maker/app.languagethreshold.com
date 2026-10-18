import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { readSportsFeed } from "../lib/sports-news-feed.ts";
import { readPrivateJson, PrivateJsonRequestError } from "../lib/private-json-request.ts";
import { isStrictSameOrigin } from "../lib/speaking-security.ts";
import { initSentry, Sentry } from "../lib/sentry";
initSentry();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  pubDate: string; // ISO string
  source: string;
  sport: "soccer" | "baseball" | "general";
  teamMentions: string[];
}

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

// ---------------------------------------------------------------------------
// RSS feed sources
// ---------------------------------------------------------------------------

const FEEDS: Record<"soccer" | "baseball" | "general", string[]> = {
  soccer: [
    "https://feeds.bbci.co.uk/sport/football/rss.xml",
    "https://www.theguardian.com/football/rss",
  ],
  baseball: ["https://feeds.feedburner.com/baseballprospectus"],
  general: ["https://feeds.bbci.co.uk/sport/rss.xml"],
};

const SOURCE_NAMES: Record<string, string> = {
  "feeds.bbci.co.uk": "BBC Sport",
  "www.theguardian.com": "The Guardian",
  "feeds.feedburner.com": "Baseball Prospectus",
};

// ---------------------------------------------------------------------------
// Common soccer/baseball clubs and national teams for mention extraction
// ---------------------------------------------------------------------------

const SOCCER_TEAMS = [
  "Arsenal",
  "Aston Villa",
  "Chelsea",
  "Everton",
  "Liverpool",
  "Manchester City",
  "Manchester United",
  "Newcastle",
  "Tottenham",
  "West Ham",
  "Barcelona",
  "Real Madrid",
  "Atletico Madrid",
  "Sevilla",
  "Juventus",
  "AC Milan",
  "Inter Milan",
  "Napoli",
  "Bayern Munich",
  "Borussia Dortmund",
  "PSG",
  "Paris Saint-Germain",
  "Ajax",
  "Porto",
  "Benfica",
  "Celtic",
  "Rangers",
  "England",
  "Spain",
  "France",
  "Germany",
  "Italy",
  "Brazil",
  "Argentina",
  "Portugal",
  "Netherlands",
  "USA",
  "Mexico",
];

const BASEBALL_TEAMS = [
  "Yankees",
  "Red Sox",
  "Dodgers",
  "Giants",
  "Cubs",
  "Cardinals",
  "Mets",
  "Astros",
  "Braves",
  "Padres",
  "Phillies",
  "Mariners",
  "Blue Jays",
  "Tigers",
  "Angels",
  "Rays",
  "Orioles",
  "Royals",
  "White Sox",
  "Twins",
  "Brewers",
  "Pirates",
  "Reds",
  "Rockies",
  "Diamondbacks",
  "Athletics",
  "Rangers",
  "Marlins",
  "Nationals",
];

// ---------------------------------------------------------------------------
// XML / RSS parsing helpers (no DOMParser in Cloudflare Workers)
// ---------------------------------------------------------------------------

function extractTagContent(xml: string, tag: string): string {
  // Handle <tag>content</tag> and <tag><![CDATA[content]]></tag>
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const cdataMatch = cdataRe.exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = plainRe.exec(xml);
  if (plainMatch) return plainMatch[1].replace(/<[^>]+>/g, "").trim();
  return "";
}

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while (items.length < 100 && (match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTagContent(block, "title");
    const link = extractTagContent(block, "link") || extractTagContent(block, "guid");
    const description = extractTagContent(block, "description");
    const pubDate = extractTagContent(block, "pubDate") || extractTagContent(block, "dc:date");
    let safeLink = "";
    try {
      const parsed = new URL(link);
      if (
        (parsed.protocol === "https:" || parsed.protocol === "http:") &&
        link.length <= 2048 &&
        !parsed.username &&
        !parsed.password
      )
        safeLink = parsed.href;
    } catch {
      /* Feed links must be absolute web URLs. */
    }
    if (title && safeLink) {
      items.push({ title: title.slice(0, 400), link: safeLink, description, pubDate });
    }
  }
  return items;
}

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function extractTeamMentions(title: string, sport: "soccer" | "baseball" | "general"): string[] {
  const pool = sport === "baseball" ? BASEBALL_TEAMS : SOCCER_TEAMS;
  return pool.filter((team) => title.toLowerCase().includes(team.toLowerCase()));
}

function hostnameFrom(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function toIso(pubDate: string): string {
  if (!pubDate) return new Date(0).toISOString();
  try {
    return new Date(pubDate).toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

async function fetchFeed(
  url: string,
  sport: "soccer" | "baseball" | "general",
  signal: AbortSignal,
): Promise<NewsArticle[]> {
  const xml = await readSportsFeed(url, signal);
  const items = parseRssItems(xml);
  const host = hostnameFrom(url);
  const sourceName = SOURCE_NAMES[host] ?? host;

  return items.map((item) => ({
    id: simpleHash(item.title + item.link),
    title: item.title,
    summary: item.description.slice(0, 200),
    url: item.link,
    pubDate: toIso(item.pubDate),
    source: sourceName,
    sport,
    teamMentions: extractTeamMentions(item.title, sport),
  }));
}

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

const BodySchema = z.object({
  sport: z.enum(["soccer", "baseball", "general"]),
  favoriteTeam: z.string().max(80).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const Route = createFileRoute("/api/sports-news")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const reply = (body: unknown, status = 200) =>
          Response.json(body, {
            status,
            headers: {
              "Cache-Control": "private, no-store",
              "CDN-Cache-Control": "no-store",
              "Vercel-CDN-Cache-Control": "no-store",
              "X-Content-Type-Options": "nosniff",
            },
          });
        if (!isStrictSameOrigin(request))
          return reply({ error: "Open the app to read sports news." }, 403);
        let payload: z.infer<typeof BodySchema>;
        try {
          payload = BodySchema.parse(await readPrivateJson(request, 4096));
        } catch (error) {
          return reply(
            { error: "Check your news request and try again." },
            error instanceof PrivateJsonRequestError ? error.status : 400,
          );
        }

        const feedUrls = FEEDS[payload.sport];
        let articles: NewsArticle[] = [];
        let failed = false;

        // Fetch all feeds for the sport in parallel, tolerating individual failures
        const results = await Promise.allSettled(
          feedUrls.map((url) => fetchFeed(url, payload.sport, request.signal)),
        );

        for (const result of results) {
          if (result.status === "fulfilled") {
            articles = articles.concat(result.value);
          } else {
            failed = true;
            if (!request.signal.aborted)
              Sentry.captureException(new Error("Sports news feed unavailable"));
          }
        }
        if (request.signal.aborted)
          return reply({ articles: [], error: "News request cancelled." }, 499);
        if (articles.length === 0 && failed) {
          return reply({ articles: [], error: "News feeds unavailable — try again later." });
        }

        // Deduplicate by id
        const seen = new Set<string>();
        articles = articles.filter((a) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        });

        // Sort by pubDate descending
        articles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

        // Promote favorite-team articles to the top
        const favTeam = payload.favoriteTeam?.trim().toLowerCase();
        if (favTeam) {
          const matching = articles.filter(
            (a) =>
              a.title.toLowerCase().includes(favTeam) ||
              a.teamMentions.some((t) => t.toLowerCase().includes(favTeam)),
          );
          const rest = articles.filter(
            (a) =>
              !a.title.toLowerCase().includes(favTeam) &&
              !a.teamMentions.some((t) => t.toLowerCase().includes(favTeam)),
          );
          articles = [...matching, ...rest];
        }

        // Cap at 10
        articles = articles.slice(0, 10);

        return reply({ articles });
      },
    },
  },
});
