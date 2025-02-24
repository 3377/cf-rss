import { RSS_CONFIG } from "../../src/config/rss.config.js";

export async function onRequest(context) {
  try {
    const feedResults = await Promise.all(
      RSS_CONFIG.feeds.map(async (source) => {
        try {
          // 修改 fetch 部分的代码
          const response = await fetch(source.url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
              Accept: "application/rss+xml, application/xml, text/xml, */*",
              "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
              Origin: `https://${new URL(source.url).hostname}`,
              Referer: `https://${new URL(source.url).hostname}/`,
              Host: new URL(source.url).hostname,
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const text = await response.text();

          // 调试日志
          console.log(`Fetching ${source.title}: ${source.url}`);
          console.log(`Response status: ${response.status}`);
          console.log(`Content sample: ${text.substring(0, 200)}`); // 添加内容样本日志

          // 获取标签内容的通用方法
          const getTagContent = (xml, tags) => {
            for (const tag of tags) {
              const patterns = [
                // 处理 CDATA 内容
                `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
                // 处理普通内容
                `<${tag}[^>]*>([^<]*)</${tag}>`,
                // 处理自闭合标签
                `<${tag}[^>]*\\s*\\/?>(.*?)(?:<\\/${tag}>)?`,
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
              // 处理 linux.do 特殊的链接格式
              /https:\/\/linux\.do\/t\/topic\/\d+/,
              /<link[^>]*>([^<]+)<\/link>/,
              /<link[^>]*href="([^"]+)"[^>]*\/>/,
              /<guid[^>]*>([^<]+)<\/guid>/,
              /<id[^>]*>([^<]+)<\/id>/,
            ];

            for (const pattern of patterns) {
              const match =
                typeof pattern === "string"
                  ? new RegExp(pattern).exec(itemContent)
                  : pattern.exec(itemContent);
              if (match) {
                return match[1] || match[0];
              }
            }
            return "";
          };

          let items = [];
          const itemPatterns = [
            // linux.do 特殊的条目格式
            /阅读完整话题[\s\S]*?<\/topic>/g,
            /<item[^>]*>[\s\S]*?<\/item>/g,
            /<entry[^>]*>[\s\S]*?<\/entry>/g,
          ];

          for (const pattern of itemPatterns) {
            const matches = text.match(pattern) || [];
            if (matches.length > 0) {
              for (const itemContent of matches) {
                // 尝试提取标题（针对 linux.do 的特殊格式）
                let title = getTagContent(itemContent, ["title"])[0];
                if (!title) {
                  const titleMatch = itemContent.match(
                    /([^\n]+)(?=\s+\d+\s+个帖子)/
                  );
                  title = titleMatch ? titleMatch[1].trim() : "No title";
                }

                // 提取链接
                const link = getLink(itemContent);

                // 提取日期
                let pubDate = getTagContent(itemContent, [
                  "pubDate",
                  "published",
                  "updated",
                  "date",
                ])[0];
                if (!pubDate) {
                  const dateMatch = itemContent.match(
                    /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/
                  );
                  pubDate = dateMatch ? dateMatch[0] : new Date().toISOString();
                }

                let formattedDate;
                try {
                  formattedDate = new Date(pubDate).toISOString();
                } catch (e) {
                  formattedDate = new Date().toISOString();
                }

                if (title && link) {
                  items.push({
                    id: items.length,
                    title: title,
                    link: link,
                    pubDate: formattedDate,
                  });
                }
              }
              if (items.length > 0) break;
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
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Surrogate-Control": "no-store",
        // 允许跨域访问
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Max-Age": "86400",
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
