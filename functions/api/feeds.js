import { RSS_CONFIG } from "../../src/config/rss.config.js";

export async function onRequest(context) {
  try {
    const feedResults = await Promise.all(
      RSS_CONFIG.feeds.map(async (source) => {
        try {
          const response = await fetch(source.url);
          const text = await response.text();

          // 改进的标签内容获取方法
          const getTagContent = (xml, tag, attribute = null) => {
            const regex = attribute
              ? new RegExp(
                  `<${tag}[^>]*${attribute}="([^"]*)"[^>]*>(?:.*?)</${tag}>`,
                  "gs"
                )
              : new RegExp(
                  `<${tag}[^>]*>(?:<\\!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${tag}>`,
                  "gs"
                );

            const matches = [...xml.matchAll(regex)];
            return matches.map((match) => {
              return attribute ? match[1] : match[1].trim();
            });
          };

          // 获取所有 item 标签
          const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
          const items = [...text.matchAll(itemRegex)].map((match, index) => {
            const itemContent = match[1];
            const title = getTagContent(itemContent, "title")[0] || "No title";
            const link = getTagContent(itemContent, "link")[0] || "";
            const pubDate = getTagContent(itemContent, "pubDate")[0] || "";

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
              title: title,
              link: link,
              pubDate: formattedDate,
            };
          });

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
