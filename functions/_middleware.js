import { getRSSConfig } from "../src/config/rss.config.js";

// 添加获取 RSS 内容的函数
async function fetchRSSFeed(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();

    // 使用简单的字符串处理来提取所需信息
    const items = [];
    const itemMatches = text.match(/<item[\s\S]*?<\/item>/g) || [];

    itemMatches.forEach((itemStr, index) => {
      const titleMatch = itemStr.match(/<title>(.*?)<\/title>/);
      const linkMatch = itemStr.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = itemStr.match(/<pubDate>(.*?)<\/pubDate>/);

      items.push({
        id: index,
        title: titleMatch ? titleMatch[1] : "",
        link: linkMatch ? linkMatch[1] : "",
        pubDate: pubDateMatch ? pubDateMatch[1] : new Date().toISOString(),
      });
    });

    return {
      items,
      error: null,
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
