import { getRSSConfig } from "../src/config/rss.config.js";

// 添加获取 RSS 内容的函数
async function fetchRSSFeed(url) {
  try {
    // 根据不同的 URL 设置不同的请求头
    const headers = new Headers();

    if (url.includes("v2ex.com")) {
      // V2EX 需要设置 User-Agent
      headers.set(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );
    } else if (url.includes("nodeseek.com")) {
      // NodeSeek 可能需要特定的请求头
      headers.set(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );
      headers.set("Accept", "application/xml, application/rss+xml, text/xml");
      headers.set("Referer", "https://nodeseek.com");
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();

    // 使用更健壮的正则表达式来处理不同格式的 RSS
    const items = [];
    let itemMatches = text.match(/<item[\s\S]*?<\/item>/g) || [];

    // 如果没有找到 <item>，尝试查找 <entry>（某些 RSS 源使用 Atom 格式）
    if (itemMatches.length === 0) {
      itemMatches = text.match(/<entry[\s\S]*?<\/entry>/g) || [];
    }

    itemMatches.forEach((itemStr, index) => {
      // 标题匹配（处理 CDATA）
      const titleMatch = itemStr.match(
        /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/
      );

      // 链接匹配（处理不同格式）
      let linkMatch = itemStr.match(
        /<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/
      );
      if (!linkMatch) {
        // 尝试匹配 href 属性格式
        const hrefMatch = itemStr.match(/<link[^>]*href="([^"]*)"[^>]*\/>/);
        if (hrefMatch) {
          linkMatch = hrefMatch;
        }
      }

      // 日期匹配（处理多种日期标签）
      let pubDateMatch = itemStr.match(
        /<pubDate>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/pubDate>/
      );
      if (!pubDateMatch) {
        pubDateMatch = itemStr.match(
          /<published>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/published>/
        );
      }
      if (!pubDateMatch) {
        pubDateMatch = itemStr.match(
          /<updated>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/updated>/
        );
      }

      items.push({
        id: index,
        title: titleMatch ? titleMatch[1].trim() : "",
        link: linkMatch ? linkMatch[1].trim() : "",
        pubDate: pubDateMatch
          ? pubDateMatch[1].trim()
          : new Date().toISOString(),
      });
    });

    // 如果没有找到任何内容，记录错误
    if (items.length === 0) {
      console.warn(
        `No items found for ${url}. Response:`,
        text.substring(0, 500)
      );
    }

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
      // 获取所有 RSS 源的内容
      const feedsWithContent = await Promise.all(
        config.feeds.map(async (feed) => {
          const { items, error } = await fetchRSSFeed(feed.url);
          return {
            ...feed,
            lastUpdate: new Date().toISOString(),
            items,
            error,
          };
        })
      );

      return new Response(JSON.stringify(feedsWithContent), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
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
