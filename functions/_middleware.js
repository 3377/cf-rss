import { getRSSConfig } from "../src/config/rss.config.js";

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
      return new Response(JSON.stringify(config), {
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

    // 注入配置到全局变量
    const injectedHtml = html.replace(
      "</head>",
      `<script>window.__RSS_CONFIG__ = ${JSON.stringify(
        config
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
