import { RSS_CONFIG } from "../../src/config/rss.config.js";

export async function onRequest(context) {
  try {
    const feedResults = await Promise.all(
      RSS_CONFIG.feeds.map(async (source) => {
        try {
          const response = await fetch(source.url);
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
              // 支持自闭合标签和CDATA
              const patterns = [
                `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`,
                `<${tag}[^>]*?\/?>([^<]*)`,
              ];

              for (const pattern of patterns) {
                const regex = new RegExp(pattern, "g");
                const matches = [...xml.matchAll(regex)];
                if (matches.length > 0) {
                  return matches.map((match) => match[1].trim());
                }
              }
            }
            return [];
          };

          // 获取链接的通用方法
          const getLink = (itemContent) => {
            // 扩展链接匹配模式
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

            // 尝试直接从原始文本中提取URL
            const urlMatch = itemContent.match(/(https?:\/\/[^\s<>"']+)/);
            return urlMatch ? urlMatch[1] : "";
          };

          // 获取所有文章条目
          let items = [];

          // 首先尝试标准的RSS和Atom格式
          const itemPatterns = [
            /<item[^>]*>[\s\S]*?<\/item>/g,
            /<entry[^>]*>[\s\S]*?<\/entry>/g,
            /<article[^>]*>[\s\S]*?<\/article>/g,
          ];

          for (const pattern of itemPatterns) {
            const matches = text.match(pattern) || [];
            console.log(
              `Found ${matches.length} items using pattern: ${pattern}`
            );

            for (const itemContent of matches) {
              const title =
                getTagContent(itemContent, ["title", "h1"])[0] || "No title";
              const link = getLink(itemContent);
              const pubDate =
                getTagContent(itemContent, [
                  "pubDate",
                  "published",
                  "updated",
                  "date",
                  "time",
                  "created",
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
          }

          // 如果没有找到条目，尝试备用解析方法
          if (items.length === 0) {
            console.log(`Trying alternative parsing for ${source.title}`);

            // 尝试解析JSON格式
            try {
              const jsonData = JSON.parse(text);
              if (Array.isArray(jsonData)) {
                items = jsonData.map((item, index) => ({
                  id: index,
                  title: item.title || item.name || "No title",
                  link: item.link || item.url || "",
                  pubDate: new Date(
                    item.date || item.created || Date.now()
                  ).toISOString(),
                }));
              }
            } catch (e) {
              console.log("Not JSON format, continuing with XML parsing");
            }

            // 如果JSON解析失败，继续尝试XML解析
            if (items.length === 0) {
              const titles = getTagContent(text, ["title", "h1"]);
              const links =
                text
                  .match(/<link[^>]*?(?:href="([^"]+)"[^>]*|>([^<]+))/g)
                  ?.map((l) => {
                    const match = /(?:href="([^"]+)"|>([^<]+))/.exec(l);
                    return match ? match[1] || match[2] : "";
                  }) || [];

              // 跳过第一个（通常是feed标题）
              for (let i = 1; i < titles.length; i++) {
                items.push({
                  id: i - 1,
                  title: titles[i],
                  link: links[i] || "",
                  pubDate: new Date().toISOString(),
                });
              }
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
