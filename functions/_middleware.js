import { getRSSConfig } from "../src/config/rss.config.js";

// 添加获取 RSS 内容的函数
async function fetchRSSFeed(url) {
  try {
    // 通用的请求头
    const headers = new Headers({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept:
        "application/rss+xml, application/xml, application/atom+xml, text/xml, */*",
    });

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();

    // 初始化items数组
    const items = [];

    // 极客公园RSS特殊处理
    if (url.includes("geekpark.net")) {
      console.log("处理极客公园RSS，原始内容长度:", text.length);

      // 移除所有HTML注释，有时会干扰XML解析
      let cleanedText = text.replace(/<!--[\s\S]*?-->/g, "");

      // 尝试修复错误的XML格式
      // 有时CDATA标签会写错，如 <![CDATA[ 应该是 <![CDATA[
      cleanedText = cleanedText.replace(/<!?\[CDATA\[/g, "<![CDATA[");
      cleanedText = cleanedText.replace(/\]\]>/g, "]]>");

      try {
        // 提取所有item节点
        const itemMatches = [];
        let currentIndex = 0;
        let itemStartIndex;

        // 使用简单的字符串搜索提取item节点
        while (
          (itemStartIndex = cleanedText.indexOf("<item>", currentIndex)) !== -1
        ) {
          const itemEndIndex = cleanedText.indexOf("</item>", itemStartIndex);
          if (itemEndIndex === -1) break;

          const itemXML = cleanedText.substring(
            itemStartIndex,
            itemEndIndex + 7
          ); // +7 是"</item>"的长度
          itemMatches.push(itemXML);
          currentIndex = itemEndIndex + 7;
        }

        console.log(`极客公园RSS - 找到 ${itemMatches.length} 个item节点`);

        // 处理每个item节点
        const items = itemMatches.map((itemXML, index) => {
          // 提取标题
          let title = extractNodeContent(itemXML, "title");

          // 提取链接
          let link = extractNodeContent(itemXML, "link");

          // 提取描述
          let description = extractNodeContent(itemXML, "description");

          // 提取日期
          let pubDate =
            extractNodeContent(itemXML, "pubDate") || new Date().toISOString();

          if (index < 2) {
            console.log(
              `极客公园item #${index}: title=${title?.substring(
                0,
                30
              )}..., desc=${description?.substring(0, 30)}...`
            );
          }

          return {
            id: index,
            title: title || "无标题",
            link: link || "",
            pubDate: pubDate,
            description: description || "无描述",
            content: description || "",
            summary: "",
          };
        });

        if (items.length > 0) {
          return { items, error: null };
        }
      } catch (e) {
        console.error("极客公园RSS解析错误:", e);
      }
    }

    // 匹配所有可能的条目标签
    const itemRegex = /<(item|entry)[\s\S]*?<\/\1>/g;
    const matches = text.match(itemRegex) || [];

    // 提取标签内容的通用方法
    const getTagContent = (xml, tag) => {
      const patterns = [
        // 带CDATA的内容（极客公园RSS使用这种格式）
        new RegExp(
          `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`,
          "i"
        ),
        // 普通标签内容
        new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i"),
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
      // 通用标题匹配（改进处理CDATA的能力）
      const title = getTagContent(itemStr, "title");

      // 通用链接匹配
      let link = "";
      const linkContent = getTagContent(itemStr, "link");
      if (linkContent) {
        link = linkContent;
      } else {
        // 匹配自闭合的 link 标签
        const hrefMatch = itemStr.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/i);
        if (hrefMatch) {
          link = hrefMatch[1];
        }
      }

      // 通用日期匹配
      const pubDate =
        getTagContent(itemStr, "pubDate") ||
        getTagContent(itemStr, "published") ||
        getTagContent(itemStr, "updated") ||
        getTagContent(itemStr, "date") ||
        new Date().toISOString();

      // 获取内容描述
      const description = getTagContent(itemStr, "description");
      const content =
        getTagContent(itemStr, "content") ||
        getTagContent(itemStr, "content:encoded");
      const summary = getTagContent(itemStr, "summary");

      items.push({
        id: index,
        title: title || "",
        link: link || "",
        pubDate: pubDate,
        description: description || "",
        content: content || "",
        summary: summary || "",
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

// 辅助函数：提取节点内容，处理CDATA和普通文本
function extractNodeContent(xml, nodeName) {
  // 处理CDATA包装的内容
  const cdataPattern = new RegExp(
    `<${nodeName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${nodeName}>`,
    "i"
  );
  const cdataMatch = xml.match(cdataPattern);
  if (cdataMatch && cdataMatch[1]) {
    return cdataMatch[1].trim();
  }

  // 处理普通文本内容
  const textPattern = new RegExp(
    `<${nodeName}[^>]*>([^<]*)</${nodeName}>`,
    "i"
  );
  const textMatch = xml.match(textPattern);
  if (textMatch && textMatch[1]) {
    return textMatch[1].trim();
  }

  return "";
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
