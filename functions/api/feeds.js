import Parser from "rss-parser";
import { RSS_CONFIG } from "../../src/config/rss.config.js";

export async function onRequest(context) {
  const parser = new Parser();
  const { refresh, display } = RSS_CONFIG;

  try {
    const feedResults = await Promise.all(
      RSS_CONFIG.feeds.map(async (source) => {
        const feed = await parser.parseURL(source.url);
        return {
          title: source.title,
          url: source.url,
          lastUpdate: new Date().toISOString(),
          items: feed.items
            .map((item, index) => ({
              id: index,
              title: item.title,
              pubDate: item.pubDate || item.isoDate,
            }))
            .slice(0, display.itemsPerFeed),
        };
      })
    );

    return new Response(JSON.stringify(feedResults), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${refresh.cache}`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
