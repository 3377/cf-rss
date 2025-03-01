import { getRSSConfig } from "../src/config/rss.config.js";

// 添加获取 RSS 内容的函数
async function fetchRSSFeed(url) {
  try {
    // 通用的请求头
    const headers = new Headers({
      "User-Agent": "RSS Reader Bot/1.0",
      Accept:
        "application/rss+xml, application/xml, application/atom+xml, text/xml, */*",
    });

    const response = await fetch(url, { headers });
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
    console.log("中间件开始处理请求:", context.request.url);
    console.log("环境变量状态:", {
      REFRESH_INTERVAL: {
        value: context.env.REFRESH_INTERVAL,
        type: typeof context.env.REFRESH_INTERVAL,
      },
      CACHE_DURATION: {
        value: context.env.CACHE_DURATION,
        type: typeof context.env.CACHE_DURATION,
      },
    });

    // 从环境变量中获取配置
    const configWithDefaults = {
      feeds: JSON.parse(
        context.env.RSS_FEEDS ||
          JSON.stringify([
            { title: "V2EX", url: "https://www.v2ex.com/index.xml" },
            { title: "NodeSeek", url: "https://rss.nodeseek.com" },
            { title: "Linux DO", url: "https://linux.do/latest.rss" },
          ])
      ),
      refresh: {
        interval: context.env.REFRESH_INTERVAL
          ? parseInt(context.env.REFRESH_INTERVAL, 10)
          : 60,
        cache: context.env.CACHE_DURATION
          ? parseInt(context.env.CACHE_DURATION, 10)
          : 0,
      },
      display: {
        // 其他显示属性...
        appTitle: context.env.APP_TITLE || "FY Pages RSS", // 应用标题
        defaultDarkMode:
          context.env.DEFAULT_DARK_MODE === "false" ? false : true, // 确保默认使用暗色模式
        itemsPerFeed: parseInt(context.env.ITEMS_PER_FEED || "15", 10), // 每个卡片显示的条目数
      },
    };

    // 打印调试信息，确认环境变量是否被正确读取
    console.log("初始化配置 (中间件):", {
      refreshInterval: {
        envValue: context.env.REFRESH_INTERVAL,
        envType: typeof context.env.REFRESH_INTERVAL,
        parsedValue: configWithDefaults.refresh?.interval,
        parsedType: typeof configWithDefaults.refresh?.interval,
      },
      cacheTime: {
        envValue: context.env.CACHE_DURATION,
        envType: typeof context.env.CACHE_DURATION,
        parsedValue: configWithDefaults.refresh?.cache,
        parsedType: typeof configWithDefaults.refresh?.cache,
      },
    });

    // 初始化响应
    let response = await context.next();

    // 如果是API请求且URL包含/rss，则处理RSS内容
    if (isApiRequest(context) && context.request.url.includes("/rss")) {
      // 获取所有 RSS 源的内容
      const feedsWithContent = await Promise.all(
        configWithDefaults.feeds.map(async (feed) => {
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

    // 检查是否是 HTML 请求
    const contentType = response.headers.get("Content-Type") || "";
    if (!contentType.includes("text/html")) {
      // 如果不是 HTML，直接返回原始响应
      return response;
    }

    // 在响应头中对 HTML 页面注入配置
    if (!isApiRequest(context) && response && isHtmlResponse(response)) {
      // 处理 HTML 页面
      const html = await response.text();

      // 确保注入时，数值类型得到保留
      const stringifiedConfig = JSON.stringify(configWithDefaults);

      // 打印详细调试信息，确保环境变量正确传递
      console.log("注入到前端的配置:", {
        refreshInterval: configWithDefaults.refresh?.interval,
        refreshIntervalType: typeof configWithDefaults.refresh?.interval,
        cacheTime: configWithDefaults.refresh?.cache,
        cacheTimeType: typeof configWithDefaults.refresh?.cache,
        configType: typeof configWithDefaults,
      });

      // 检查数值是否为预期值
      if (
        context.env.REFRESH_INTERVAL &&
        configWithDefaults.refresh?.interval !==
          parseInt(context.env.REFRESH_INTERVAL, 10)
      ) {
        console.warn("警告: 刷新间隔与环境变量不匹配", {
          envValue: context.env.REFRESH_INTERVAL,
          envValueType: typeof context.env.REFRESH_INTERVAL,
          configValue: configWithDefaults.refresh?.interval,
          configValueType: typeof configWithDefaults.refresh?.interval,
        });
      }

      // 检查JSON转换是否正确保留了数值类型
      try {
        const parsedBack = JSON.parse(stringifiedConfig);
        console.log("验证JSON转换后类型:", {
          refreshInterval: parsedBack.refresh?.interval,
          refreshIntervalType: typeof parsedBack.refresh?.interval,
          cacheTime: parsedBack.refresh?.cache,
          cacheTimeType: typeof parsedBack.refresh?.cache,
        });
      } catch (e) {
        console.error("JSON解析测试失败:", e);
      }

      console.log(
        "配置JSON字符串示例(前60字符):",
        stringifiedConfig.substring(0, 60)
      );

      const injectedHtml = html.replace(
        "</head>",
        `<script>window.__RSS_CONFIG__ = ${stringifiedConfig};</script></head>`
      );

      // 保持原始响应头，只修改 HTML 内容
      const headers = new Headers(response.headers);
      headers.set("Content-Type", "text/html;charset=UTF-8");

      return new Response(injectedHtml, {
        status: response.status,
        headers: headers,
      });
    }

    return response;
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
