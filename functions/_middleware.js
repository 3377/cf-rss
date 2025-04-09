import { getRSSConfig } from "../src/config/rss.config.js";

/**
 * RSS Feeds 中间件
 * 
 * 主要负责：
 * 1. 处理非 API 请求，向页面注入配置
 * 2. 处理预请求（OPTIONS）和 CORS
 */
export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    
    // 对于 /api/feeds 和 /api/update-cache 路径，直接传递给其特定的处理函数
    if (url.pathname === "/api/feeds" || url.pathname === "/api/update-cache") {
      return await context.next();
    }
    
    // 处理 OPTIONS 请求 (CORS 预检)
    if (context.request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        }
      });
    }
    
    // 对于其他请求，继续处理
    const response = await context.next();
    
    // 检查是否是 HTML 请求
    const contentType = response.headers.get("Content-Type") || "";
    if (!contentType.includes("text/html")) {
      // 如果不是 HTML 请求，直接返回原始响应
      return response;
    }
    
    // 对于 HTML 页面，注入 RSS 配置
    const config = getRSSConfig(context.env);
    const html = await response.text();
    
    // 注入配置到页面
    const configWithDefaults = {
      ...config,
      env: {
        cacheMaxAge: parseInt(context.env.CACHE_MAX_AGE || "7200"),
        updateKey: context.env.UPDATE_KEY ? "[已配置]" : "[未配置]"
      },
      lastUpdated: new Date().toISOString()
    };
    
    const injectedHtml = html.replace(
      "</head>",
      `<script>window.__RSS_CONFIG__ = ${JSON.stringify(configWithDefaults)};</script></head>`
    );
    
    // 返回修改后的响应
    const headers = new Headers(response.headers);
    headers.set("Content-Type", "text/html;charset=UTF-8");
    
    return new Response(injectedHtml, {
      status: response.status,
      headers
    });
  } catch (error) {
    console.error("中间件处理出错:", error);
    return await context.next();
  }
}
