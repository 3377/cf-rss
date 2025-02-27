import { RSS_CONFIG } from "../../src/config/rss.config.js";

export async function onRequest(context) {
  try {
    const feedResults = await Promise.all(
      RSS_CONFIG.feeds.map(async (source) => {
        try {
          // 针对 Cloudflare 保护的站点优化请求头
          const headers = {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            Connection: "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "sec-ch-ua":
              '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0",
          };

          // 如果是 Cloudflare 站点，添加特定的请求头
          const hostname = new URL(source.url).hostname;
          if (hostname === "linux.do") {
            headers["CF-IPCountry"] = "US"; // 模拟来自美国的请求
            headers["CF-Connecting-IP"] =
              context.request.headers.get("CF-Connecting-IP");
            headers["CF-RAY"] = context.request.headers.get("CF-RAY");
            headers["CF-Visitor"] = '{"scheme":"https"}';
            headers["CDN-Loop"] = "cloudflare";
          }

          // 第一次尝试请求
          let response = await fetch(source.url, { headers });
          let text = "";

          // 如果返回 403，等待短暂时间后重试
          if (response.status === 403) {
            console.log(
              `First attempt failed for ${source.title}, retrying...`
            );
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // 第二次尝试，添加更多的 Cloudflare 相关头
            headers["X-Requested-With"] = "XMLHttpRequest";
            headers["X-Forwarded-For"] =
              context.request.headers.get("CF-Connecting-IP");
            headers["X-Real-IP"] =
              context.request.headers.get("CF-Connecting-IP");

            response = await fetch(source.url, { headers });
          }

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          text = await response.text();

          // 检查是否包含 Cloudflare 验证页面
          if (
            text.includes("Just a moment") ||
            text.includes("DDoS protection by Cloudflare")
          ) {
            throw new Error("Blocked by Cloudflare protection");
          }

          // 调试日志
          console.log(`Fetching ${source.title}: ${source.url}`);
          console.log(`Response status: ${response.status}`);

          // 获取标签内容的通用方法
          const getTagContent = (xml, tag) => {
            const patterns = [
              // RSS 2.0 标准格式
              new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "g"),
              // 带CDATA的格式
              new RegExp(
                `<${tag}[^>]*><!\\[CDATA\\[([^\\]]+)\\]\\]></${tag}>`,
                "g"
              ),
              // 自闭合标签
              new RegExp(`<${tag}[^>]*?\\s*/?>(.*?)(?:</${tag}>)?`, "g"),
            ];

            for (const pattern of patterns) {
              const matches = [...xml.matchAll(pattern)];
              if (matches.length > 0) {
                return matches[0][1].trim();
              }
            }
            return "";
          };

          let items = [];
          // 首先尝试解析标准的RSS格式
          const itemRegex = /<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/g;
          const matches = text.match(itemRegex) || [];

          for (const itemContent of matches) {
            const title = getTagContent(itemContent, "title");
            let link = getTagContent(itemContent, "link");

            // 如果link标签没有内容，尝试获取guid或其他可能的链接
            if (!link) {
              link =
                getTagContent(itemContent, "guid") ||
                itemContent.match(/href="([^"]+)"/)?.[1] ||
                itemContent.match(/https?:\/\/[^\s<>"']+/)?.[0] ||
                "";
            }

            let pubDate =
              getTagContent(itemContent, "pubDate") ||
              getTagContent(itemContent, "published") ||
              getTagContent(itemContent, "updated") ||
              new Date().toISOString();

            try {
              pubDate = new Date(pubDate).toISOString();
            } catch (e) {
              pubDate = new Date().toISOString();
            }

            // 获取内容描述
            const description = getTagContent(itemContent, "description") || "";
            const content =
              getTagContent(itemContent, "content") ||
              getTagContent(itemContent, "content:encoded") ||
              "";
            const summary = getTagContent(itemContent, "summary") || "";

            if (title && link) {
              items.push({
                id: items.length,
                title: title
                  .replace(/&lt;/g, "<")
                  .replace(/&gt;/g, ">")
                  .replace(/&amp;/g, "&")
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'"),
                link: link,
                pubDate: pubDate,
                description: description,
                content: content,
                summary: summary,
              });
            }
          }

          // 如果没有找到任何项目，尝试其他格式
          if (items.length === 0) {
            // 尝试解析整个文档
            const channelRegex = /<channel[\s\S]*?<\/channel>/;
            const channelMatch = text.match(channelRegex);

            if (channelMatch) {
              const channel = channelMatch[0];
              const titleRegex = /<title[^>]*>([^<]+)<\/title>/g;
              const linkRegex = /<link[^>]*>([^<]+)<\/link>/g;
              const dateRegex = /<pubDate[^>]*>([^<]+)<\/pubDate>/g;
              const descRegex = /<description[^>]*>([^<]+)<\/description>/g;

              const titles = [...channel.matchAll(titleRegex)].map((m) => m[1]);
              const links = [...channel.matchAll(linkRegex)].map((m) => m[1]);
              const dates = [...channel.matchAll(dateRegex)].map((m) => m[1]);
              const descriptions = [...channel.matchAll(descRegex)].map(
                (m) => m[1]
              );

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
                  description: descriptions[i] || "暂无描述",
                  content: "",
                  summary: "",
                });
              }
            }
          }

          console.log(`Final items count for ${source.title}: ${items.length}`);

          // 添加调试日志，输出内容结构样本
          if (items.length > 0) {
            console.log(`${source.title} 内容样本:`, {
              title: items[0].title,
              description: items[0].description
                ? `${items[0].description.substring(0, 50)}...`
                : "无",
              content: items[0].content
                ? `${items[0].content.substring(0, 50)}...`
                : "无",
              summary: items[0].summary
                ? `${items[0].summary.substring(0, 50)}...`
                : "无",
            });
          }

          return {
            title: source.title,
            url: source.url,
            lastUpdate: new Date().toISOString(),
            items: items.slice(0, RSS_CONFIG.display.itemsPerFeed),
          };
        } catch (error) {
          console.error(`Error processing ${source.url}:`, error);
          // 如果是 Cloudflare 保护导致的错误，返回特定的错误信息
          const errorMessage = error.message.includes("Cloudflare")
            ? "Site protected by Cloudflare, please try again later"
            : error.message;

          return {
            title: source.title,
            url: source.url,
            lastUpdate: new Date().toISOString(),
            items: [],
            error: errorMessage,
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
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
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
