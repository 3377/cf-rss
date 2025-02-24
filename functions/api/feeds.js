import { RSS_CONFIG } from "../../src/config/rss.config.js";

export async function onRequest(context) {
  try {
    const feedResults = await Promise.all(
      RSS_CONFIG.feeds.map(async (source) => {
        try {
          const response = await fetch(source.url);
          const text = await response.text();

          // 使用简单的字符串解析方法
          const getTagContent = (xml, tag) => {
            const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "gs");
            const matches = [...xml.matchAll(regex)];
            return matches.map((match) => match[1].trim());
          };

          const titles = getTagContent(text, "title");
          const pubDates = getTagContent(text, "pubDate");

          const items = titles
            .map((title, index) => {
              let formattedDate;
              try {
                formattedDate = pubDates[index]
                  ? new Date(pubDates[index]).toISOString()
                  : new Date().toISOString();
              } catch (e) {
                formattedDate = new Date().toISOString();
              }

              return {
                id: index,
                title: title || "No title",
                pubDate: formattedDate,
              };
            })
            .slice(1); // 跳过第一个标题（通常是 feed 标题）

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
