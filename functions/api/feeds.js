import { RSS_CONFIG } from "../../src/config/rss.config.js";

export async function onRequest(context) {
  try {
    const feedResults = await Promise.all(
      RSS_CONFIG.feeds.map(async (source) => {
        try {
          const response = await fetch(source.url);
          const text = await response.text();

          // 调试日志
          console.log(`Fetching ${source.title}: ${source.url}`);

          // 获取标签内容的通用方法
          const getTagContent = (xml, tags) => {
            for (const tag of tags) {
              const pattern = `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`;
              const regex = new RegExp(pattern, "g");
              const matches = [...xml.matchAll(regex)];
              if (matches.length > 0) {
                return matches.map((match) => match[1].trim());
              }
            }
            return [];
          };

          // 获取链接的通用方法
          const getLink = (itemContent) => {
            // 尝试不同的链接格式
            const patterns = [
              /<link[^>]*>([^<]+)<\/link>/,
              /<link[^>]*href="([^"]+)"[^>]*\/>/,
              /<guid[^>]*>([^<]+)<\/guid>/,
              /<id[^>]*>([^<]+)<\/id>/,
            ];

            for (const pattern of patterns) {
              const match = pattern.exec(itemContent);
              if (match && match[1]) {
                return match[1].trim();
              }
            }
            return "";
          };

          // 获取所有文章条目
          const items = [];

          // 尝试 RSS 格式 (<item>)
          const rssItems = text.match(/<item[^>]*>[\s\S]*?<\/item>/g) || [];

          // 尝试 Atom 格式 (<entry>)
          const atomItems = text.match(/<entry[^>]*>[\s\S]*?<\/entry>/g) || [];

          // 合并所有找到的条目
          const allItems = [...rssItems, ...atomItems];

          console.log(`Found ${allItems.length} items for ${source.title}`);

          for (const itemContent of allItems) {
            const title =
              getTagContent(itemContent, ["title"])[0] || "No title";
            const link = getLink(itemContent);
            const pubDate =
              getTagContent(itemContent, [
                "pubDate",
                "published",
                "updated",
                "date",
              ])[0] || "";

            let formattedDate;
            try {
              formattedDate = pubDate
                ? new Date(pubDate).toISOString()
                : new Date().toISOString();
            } catch (e) {
              formattedDate = new Date().toISOString();
            }

            items.push({
              id: items.length,
              title: title,
              link: link,
              pubDate: formattedDate,
            });
          }

          // 如果还是没有找到条目，尝试整个文档解析
          if (items.length === 0) {
            console.log(
              `No items found using standard parsing for ${source.title}, trying alternative method`
            );

            const titles = getTagContent(text, ["title"]);
            const links =
              text
                .match(/<link[^>]*(?:href="([^"]+)"[^>]*|>([^<]+))<\/link>/g)
                ?.map((l) => {
                  const match = /(?:href="([^"]+)"|>([^<]+)<)/.exec(l);
                  return match ? match[1] || match[2] : "";
                }) || [];
            const dates = getTagContent(text, [
              "updated",
              "published",
              "pubDate",
              "date",
            ]);

            // 跳过第一个（通常是 feed 标题）
            for (
              let i = 1;
              i < Math.min(titles.length, RSS_CONFIG.display.itemsPerFeed + 1);
              i++
            ) {
              items.push({
                id: i - 1,
                title: titles[i],
                link: links[i] || "",
                pubDate: dates[i]
                  ? new Date(dates[i]).toISOString()
                  : new Date().toISOString(),
              });
            }
          }

          console.log(`Final items count for ${source.title}: ${items.length}`);

          return {
            title: source.title,
            url: source.url,
            lastUpdate: new Date().toISOString(),
            items: items.slice(0, RSS_CONFIG.display.itemsPerFeed),
          };
        } catch (error) {
          console.error(`Error processing ${source.url}:`, error);
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
    console.error("Global error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
