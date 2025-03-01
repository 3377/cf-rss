import { getRSSConfig } from "../src/config/rss.config.js";

// 添加获取 RSS 内容的函数
async function fetchRSSFeed(url) {
  try {
    // 通用的请求头
    const headers = new Headers({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "application/rss+xml, application/xml, application/atom+xml, text/xml, */*",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    });

    console.log(`Fetching RSS from: ${url}`);
    const response = await fetch(url, {
      headers,
      cf: {
        cacheTtl: 60,
        cacheEverything: true,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();

    // 通用的 RSS/Atom 解析
    const items = [];
    // 匹配所有可能的条目标签
    const itemRegex = /<(item|entry)[\s\S]*?<\/\1>/g;
    const matches = text.match(itemRegex) || [];

    // 提取标签内容的通用方法
    const getTagContent = (xml, tag) => {
      const patterns = [
        // 普通标签内容
        new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i"),
        // 带CDATA的内容
        new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([^\\]]+)\\]\\]></${tag}>`, "i"),
        // 带属性的标签
        new RegExp(`<${tag}[^>]*?\\s*/?>(.*?)</${tag}>`, "i"),
      ];

      for (const pattern of patterns) {
        const match = xml.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      return "";
    };

    matches.forEach((itemStr, index) => {
      // 通用标题匹配
      const title = itemStr.match(
        /<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i
      );

      // 通用链接匹配
      let link = itemStr.match(
        /<link[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i
      );
      if (!link) {
        // 匹配自闭合的 link 标签
        const hrefMatch = itemStr.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/i);
        if (hrefMatch) {
          link = hrefMatch;
        }
      }

      // 通用日期匹配
      const dateRegex =
        /<(pubDate|published|updated|date)[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/\1>/i;
      const pubDate = itemStr.match(dateRegex);

      // 获取内容描述
      const description = getTagContent(itemStr, "description");
      const content =
        getTagContent(itemStr, "content") ||
        getTagContent(itemStr, "content:encoded");
      const summary = getTagContent(itemStr, "summary");

      items.push({
        id: index,
        title: title ? title[1].trim() : "",
        link: link ? link[1].trim() : "",
        pubDate: pubDate ? pubDate[2].trim() : new Date().toISOString(),
        description: description,
        content: content,
        summary: summary,
      });
    });

    return {
      items,
      error: items.length === 0 ? "No items found in feed" : null,
    };
  } catch (error) {
    console.error(`Error fetching RSS feed ${url}:`, error);
    return {
      items: [],
      error: error.message,
    };
  }
}

export async function onRequest(context) {
  try {
    // 打印环境变量，用于调试
    console.log("Environment variables:", {
      RSS_FEEDS: context.env.RSS_FEEDS,
      REFRESH_INTERVAL: context.env.REFRESH_INTERVAL,
      CACHE_DURATION: context.env.CACHE_DURATION,
    });

    // 获取配置
    const config = getRSSConfig(context.env);
    console.log("Generated config:", config);

    const url = new URL(context.request.url);

    // 如果是 /api/feeds 路径，返回所有 feeds 数据
    if (url.pathname === "/api/feeds") {
      try {
        // 获取所有 RSS 源的内容
        const feedsWithContent = await Promise.all(
          config.feeds.map(async (feed) => {
            console.log(`Processing feed: ${feed.title} (${feed.url})`);
            try {
              const { items, error } = await fetchRSSFeed(feed.url);
              return {
                ...feed,
                lastUpdate: new Date().toISOString(),
                items,
                error,
              };
            } catch (feedError) {
              console.error(`Error processing feed ${feed.title}:`, feedError);
              return {
                ...feed,
                lastUpdate: new Date().toISOString(),
                items: [],
                error: `Failed to load: ${feedError.message}`,
              };
            }
          })
        );

        return new Response(JSON.stringify(feedsWithContent), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Cache-Control": "public, max-age=60",
          },
        });
      } catch (apiError) {
        console.error("API error:", apiError);
        return new Response(
          JSON.stringify({
            error: "Failed to fetch feeds",
            message: apiError.message,
            stack: apiError.stack,
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          }
        );
      }
    }

    // 获取原始响应
    const response = await context.next();

    // 检查是否是 HTML 请求
    const contentType = response.headers.get("Content-Type") || "";
    if (!contentType.includes("text/html")) {
      // 如果不是 HTML，直接返回原始响应
      return response;
    }

    // 处理 HTML 页面
    const html = await response.text();

    // 注入配置到全局变量，同时确保 feeds 有正确的数据结构
    const configWithDefaults = {
      ...config,
      feeds: config.feeds.map((feed) => ({
        ...feed,
        lastUpdate: new Date().toISOString(),
        items: [],
        error: null,
      })),
    };

    const injectedHtml = html.replace(
      "</head>",
      `<script>window.__RSS_CONFIG__ = ${JSON.stringify(
        configWithDefaults
      )};</script></head>`
    );

    // 保持原始响应头，只修改 HTML 内容
    const headers = new Headers(response.headers);
    headers.set("Content-Type", "text/html;charset=UTF-8");

    return new Response(injectedHtml, {
      status: response.status,
      headers: headers,
    });
  } catch (error) {
    console.error("Middleware error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
