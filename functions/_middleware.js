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

// 清理旧缓存的函数
async function cleanupOldCache(caches) {
  try {
    const cache = await caches.default;
    // 获取当前所有缓存的key
    const keys = await cache.keys();
    const now = Date.now();

    // 获取所有RSS缓存的key
    const rssKeys = keys.filter((key) => key.url.includes("RSS_FEEDS_CACHE"));

    // 遍历并检查每一个缓存条目
    for (const key of rssKeys) {
      const response = await cache.match(key);
      if (response) {
        // 从缓存响应中获取时间戳信息
        const timestamp = parseInt(
          response.headers.get("X-Cache-Timestamp") || "0"
        );
        const maxAge = parseInt(
          response.headers.get("X-Cache-Max-Age") || "3600"
        );

        // 如果缓存超过了最大年龄，就删除
        if (now - timestamp > maxAge * 1000) {
          console.log(`清理过期缓存: ${key.url}`);
          await cache.delete(key);
        }
      }
    }
    console.log("缓存清理完成");
  } catch (error) {
    console.error("清理缓存时出错:", error);
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
      // 获取请求中的刷新参数
      const forceRefresh = url.searchParams.get("forceRefresh") === "true";
      console.log(`处理RSS请求，强制刷新: ${forceRefresh}`);

      // 缓存键名
      const cacheKey = new Request(
        `https://${url.hostname}/cache/RSS_FEEDS_CACHE`
      );

      // 只有在非强制刷新的情况下才尝试使用缓存
      let cachedData = null;
      let cacheTime = null;

      if (!forceRefresh) {
        try {
          // 每10次请求清理一次缓存，避免每次都清理
          if (Math.random() < 0.1) {
            await cleanupOldCache(caches);
          }

          // 尝试从 Cache API 获取缓存
          const cache = caches.default;
          const cachedResponse = await cache.match(cacheKey);

          if (cachedResponse) {
            // 从响应头获取缓存时间
            cacheTime = cachedResponse.headers.get("X-Cache-Timestamp");
            const maxAge = parseInt(
              cachedResponse.headers.get("X-Cache-Max-Age") || "3600"
            );

            // 解析缓存数据
            const cachedDataText = await cachedResponse.text();
            try {
              cachedData = JSON.parse(cachedDataText);
              const now = Date.now();

              // 检查缓存是否过期
              if (cacheTime && now - parseInt(cacheTime) < maxAge * 1000) {
                console.log(
                  "使用缓存数据，缓存时间:",
                  new Date(parseInt(cacheTime)).toLocaleString()
                );
                // 返回缓存的数据，但添加缓存时间信息
                return new Response(JSON.stringify(cachedData), {
                  headers: {
                    "Content-Type": "application/json",
                    "X-Cache": "HIT",
                    "X-Cache-Timestamp": cacheTime,
                    "Access-Control-Allow-Origin": "*",
                  },
                });
              } else {
                console.log("缓存已过期，重新获取数据");
              }
            } catch (e) {
              console.error("解析缓存数据失败:", e);
            }
          } else {
            console.log("未找到缓存，获取新数据");
          }
        } catch (error) {
          console.error("获取缓存时出错:", error);
        }
      } else {
        console.log("强制刷新，跳过缓存，获取最新数据");
      }

      try {
        // 如果没有缓存或缓存已过期，获取新数据
        // 初始化结果数组
        const results = [];

        // 获取 RSS 源配置 (直接使用配置，而不是通过API)
        const rssFeeds = JSON.parse(context.env.RSS_FEEDS || "[]");

        // 如果没有配置RSS源，使用默认配置
        const feeds =
          rssFeeds.length > 0
            ? rssFeeds
            : [
                {
                  title: "36kr",
                  url: "https://36kr.com/feed",
                },
                {
                  title: "NodeSeek",
                  url: "https://rss.nodeseek.com",
                },
                {
                  title: "Linux DO",
                  url: "https://api.dbot.pp.ua/v1/rss/linuxdo",
                },
                {
                  title: "人人都是产品经理",
                  url: "https://www.woshipm.com/feed",
                },
              ];

        // 获取所有 RSS 源的内容
        for (const feed of feeds) {
          try {
            console.log(`处理RSS源: ${feed.title} (${feed.url})`);

            // 获取单个RSS源内容
            let response;
            try {
              response = await fetch(feed.url, {
                cf: {
                  // 设置缓存策略
                  cacheTtl: context.env.WORKER_CACHE_TTL || 3600,
                  cacheEverything: true,
                },
                headers: {
                  // 设置请求头，模拟浏览器请求
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                  Accept: "application/rss+xml, application/xml, text/xml, */*",
                  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                },
              });
            } catch (fetchError) {
              throw new Error(`获取失败: ${fetchError.message}`);
            }

            if (!response.ok) {
              throw new Error(`请求失败: HTTP ${response.status}`);
            }

            // 解析RSS内容
            const text = await response.text();
            let items = [];

            try {
              // 使用简单的正则表达式解析RSS内容
              // 这里我们只提取标题、链接和发布日期
              const titleRegex = /<item>[\s\S]*?<title>(.*?)<\/title>/gi;
              const linkRegex = /<item>[\s\S]*?<link>(.*?)<\/link>/gi;
              const descRegex =
                /<item>[\s\S]*?<description>([\s\S]*?)<\/description>/gi;
              const dateRegex = /<item>[\s\S]*?<pubDate>(.*?)<\/pubDate>/gi;

              const titles = [];
              const links = [];
              const descriptions = [];
              const dates = [];

              // 提取所有标题
              let titleMatch;
              while ((titleMatch = titleRegex.exec(text)) !== null) {
                titles.push(
                  titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
                );
              }

              // 提取所有链接
              let linkMatch;
              while ((linkMatch = linkRegex.exec(text)) !== null) {
                links.push(
                  linkMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
                );
              }

              // 提取所有描述
              let descMatch;
              while ((descMatch = descRegex.exec(text)) !== null) {
                descriptions.push(
                  descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
                );
              }

              // 提取所有日期
              let dateMatch;
              while ((dateMatch = dateRegex.exec(text)) !== null) {
                dates.push(dateMatch[1]);
              }

              // 组合成items
              for (let i = 0; i < Math.min(titles.length, links.length); i++) {
                items.push({
                  title: titles[i] || "",
                  link: links[i] || "",
                  description: descriptions[i] || "",
                  pubDate: dates[i] || "",
                });
              }
            } catch (parseError) {
              console.error(`解析RSS失败: ${parseError.message}`);
            }

            // 添加到结果数组
            results.push({
              ...feed,
              items: items || [],
              error: null,
            });
          } catch (feedError) {
            console.error(`Error processing feed ${feed.title}:`, feedError);
            results.push({
              ...feed,
              items: [],
              error: feedError.message || "Unknown error",
            });
          }
        }

        // 在成功获取新数据后，更新缓存
        if (results.length > 0) {
          try {
            const cache = caches.default;
            const now = Date.now();
            const maxAge = 3600; // 默认缓存1小时

            // 创建带有缓存信息的响应
            const cacheResponse = new Response(JSON.stringify(results), {
              headers: {
                "Content-Type": "application/json",
                "X-Cache-Timestamp": now.toString(),
                "X-Cache-Max-Age": maxAge.toString(),
                "Cache-Control": `max-age=${maxAge}`,
              },
            });

            // 存储到缓存
            console.log("更新RSS缓存");
            await cache.put(cacheKey, cacheResponse.clone());
          } catch (cacheError) {
            console.error("更新缓存失败:", cacheError);
          }
        }

        // 返回结果，带上是否使用缓存的信息
        return new Response(JSON.stringify(results), {
          headers: {
            "Content-Type": "application/json",
            "X-Cache": "MISS",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (error) {
        console.error("获取新数据时出错:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch feeds" }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
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
