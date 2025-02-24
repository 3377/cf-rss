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
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
              Accept:
                "application/rss+xml, application/xml, application/atom+xml, text/xml, */*",
              "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
              Referer: new URL(source.url).origin,
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const text = await response.text();

          // 调试日志
          console.log(`Fetching ${source.title}: ${source.url}`);
          console.log(`Response status: ${response.status}`);

          // 获取标签内容的通用方法
          const getTagContent = (xml, tags) => {
            for (const tag of tags) {
              // 支持多种格式的标签内容
              const patterns = [
                `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`,
                `<${tag}[^>]*>([^<]+)</${tag}>`,
                `<${tag}[^>]*?\/?>([^<]*)`,
              ];

              for (const pattern of patterns) {
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
                      .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
                        String.fromCharCode(parseInt(code, 16))
                      )
                      .replace(/&#(\d+);/g, (_, code) =>
                        String.fromCharCode(parseInt(code, 10))
                      )
                  );
                }
              }
            }
            return [];
          };

          // 获取链接的通用方法
          const getLink = (itemContent) => {
            const patterns = [
              /<link[^>]*>([^<]+)<\/link>/,
              /<link[^>]*href="([^"]+)"[^>]*\/>/,
              /<link[^>]*href='([^']+)'[^>]*\/>/,
              /<guid[^>]*>([^<]+)<\/guid>/,
              /<id[^>]*>([^<]+)<\/id>/,
              /rel="alternate" href="([^"]+)"/,
              /<link>([^<]+)<\/link>/,
            ];

            for (const pattern of patterns) {
              const match = pattern.exec(itemContent);
              if (match && match[1]) {
                return match[1].trim();
              }
            }
            return "";
          };

          let items = [];

          // 尝试多种格式解析
          const itemPatterns = [
            /<item[^>]*>[\s\S]*?<\/item>/g, // RSS 2.0
            /<entry[^>]*>[\s\S]*?<\/entry>/g, // Atom
            /<article[^>]*>[\s\S]*?<\/article>/g, // 其他可能的格式
          ];

          for (const pattern of itemPatterns) {
            const matches = text.match(pattern) || [];
            if (matches.length > 0) {
              for (const itemContent of matches) {
                const title =
                  getTagContent(itemContent, ["title"])[0] || "No title";
                const link = getLink(itemContent);
                const pubDate =
                  getTagContent(itemContent, [
                    "pubDate",
                    "published",
                    "updated",
                    "date",
                  ])[0] || new Date().toISOString();

                let formattedDate;
                try {
                  formattedDate = new Date(pubDate).toISOString();
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
              break; // 如果找到匹配的格式就停止尝试
            }
          }

          // 如果上述方法都失败，尝试整个文档解析
          if (items.length === 0) {
            const titles = getTagContent(text, ["title", "h1"]);
            const links =
              text
                .match(/<link[^>]*?(?:href="([^"]+)"[^>]*|>([^<]+))/g)
                ?.map((l) => {
                  const match = /(?:href="([^"]+)"|>([^<]+))/.exec(l);
                  return match ? match[1] || match[2] : "";
                }) || [];
            const dates = getTagContent(text, [
              "pubDate",
              "published",
              "updated",
              "date",
            ]);

            // 跳过第一个（通常是feed标题）
            for (
              let i = 1;
              i < titles.length && i <= RSS_CONFIG.display.itemsPerFeed;
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
