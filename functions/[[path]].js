import { getRSSConfig } from "../src/config/rss.config.js";

export async function onRequest(context) {
  // 打印环境变量，用于调试
  console.log("Environment variables:", {
    RSS_FEEDS: context.env.RSS_FEEDS,
    REFRESH_INTERVAL: context.env.REFRESH_INTERVAL,
    CACHE_DURATION: context.env.CACHE_DURATION,
  });

  // 获取配置
  const config = getRSSConfig(context.env);
  console.log("Generated config:", config);

  // 如果是 /api/feeds 路径，返回配置信息
  if (new URL(context.request.url).pathname === "/api/feeds") {
    // 创建新的 Response 对象
    return new Response(JSON.stringify(config.feeds), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // 将配置注入到 HTML 中
  const response = await context.next();
  const html = await response.text();

  // 注入配置到全局变量
  const injectedHtml = html.replace(
    "</head>",
    `<script>window.__RSS_CONFIG__ = ${JSON.stringify(config)};</script></head>`
  );

  return new Response(injectedHtml, {
    headers: response.headers,
  });
}
