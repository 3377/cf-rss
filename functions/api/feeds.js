import { RSS_CONFIG } from "../../src/config/rss.config.js";

export async function onRequest(context) {
  try {
    const feedResults = await Promise.all(
      RSS_CONFIG.feeds.map(async (source) => {
        const response = await fetch(source.url);
        const text = await response.text();

        // 简单的 XML 解析
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");
        const items = Array.from(xml.querySelectorAll("item")).map(
          (item, index) => ({
            id: index,
            title: item.querySelector("title")?.textContent || "",
            pubDate:
              item.querySelector("pubDate")?.textContent ||
              new Date().toISOString(),
          })
        );

        return {
          title: source.title,
          url: source.url,
          lastUpdate: new Date().toISOString(),
          items: items.slice(0, RSS_CONFIG.display.itemsPerFeed),
        };
      })
    );

    return new Response(JSON.stringify(feedResults), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${RSS_CONFIG.refresh.cache}`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
