import { RSS_CONFIG } from "../../src/config/rss.config.js";

export async function onRequest(context) {
  try {
    const feedResults = await Promise.all(
      RSS_CONFIG.feeds.map(async (source) => {
        try {
          const response = await fetch(source.url);
          const text = await response.text();

          // XML 解析
          const parser = new DOMParser();
          const xml = parser.parseFromString(text, "text/xml");

          // 处理不同类型的 RSS feed
          const items = Array.from(xml.querySelectorAll("item, entry")).map(
            (item, index) => {
              // 尝试获取发布日期
              const pubDate =
                item.querySelector("pubDate, published")?.textContent;
              let formattedDate;

              try {
                formattedDate = pubDate
                  ? new Date(pubDate).toISOString()
                  : new Date().toISOString();
              } catch (e) {
                formattedDate = new Date().toISOString();
              }

              return {
                id: index,
                title:
                  item.querySelector("title")?.textContent?.trim() ||
                  "No title",
                pubDate: formattedDate,
              };
            }
          );

          return {
            title: source.title,
            url: source.url,
            lastUpdate: new Date().toISOString(),
            items: items.slice(0, RSS_CONFIG.display.itemsPerFeed),
          };
        } catch (error) {
          console.error(`Error fetching ${source.url}:`, error);
          return {
            title: source.title,
            url: source.url,
            lastUpdate: new Date().toISOString(),
            items: [],
            error: error.message,
          };
        }
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
