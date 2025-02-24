import { RSS_CONFIG } from "../../src/config/rss.config.js";

export async function onRequest(context) {
  try {
    const feedResults = await Promise.all(
      RSS_CONFIG.feeds.map(async (source) => {
        try {
          // 添加自定义请求头
          const response = await fetch(source.url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              Accept:
                "application/rss+xml, application/xml, application/atom+xml, text/xml, */*",
              "Accept-Language": "en-US,en;q=0.9",
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const text = await response.text();

          // 调试日志
          console.log(`Fetching ${source.title}: ${source.url}`);
          console.log(`Response status: ${response.status}`);
          console.log(`Content sample: ${text.substring(0, 200)}`);

          // 获取标签内容的通用方法
          const getTagContent = (xml, tags) => {
            for (const tag of tags) {
              const pattern = `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`;
              const regex = new RegExp(pattern, "g");
              const matches = [...xml.matchAll(regex)];
              if (matches.length > 0) {
                return matches.map((match) =>
                  match[1]
                    .trim()
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&amp;/g, "&")
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                );
              }
            }
            return [];
          };

          // 获取链接的通用方法
          const getLink = (itemContent) => {
            const patterns = [
              /<link[^>]*>([^<]+)<\/link>/,
              /<link[^>]*href="([^"]+)"[^>]*\/>/,
              /<guid[^>]*>([^<]+)<\/guid>/,
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
          const itemRegex = /<item[^>]*>[\s\S]*?<\/item>/g;
          const items = [];
          const matches = text.match(itemRegex) || [];

          for (const itemContent of matches) {
            const title =
              getTagContent(itemContent, ["title"])[0] || "No title";
            const link = getLink(itemContent);
            const pubDate = getTagContent(itemContent, ["pubDate"])[0] || "";

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

          console.log(`Final items count for ${source.title}: ${items.length}`);

          return {
            title: source.title,
            url: source.url,
            lastUpdate: new Date().toISOString(),
            items: items.slice(0, RSS_CONFIG.display.itemsPerFeed),
          };
        } catch (error) {
          console.error(`Error processing ${source.url}:`, error);
          console.error("Error details:", error.stack);
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
