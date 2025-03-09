// 专用于外部服务触发缓存更新的 API 端点
export async function onRequest(context) {
  try {
    // 检查访问密钥
    const url = new URL(context.request.url);
    const accessKey = url.searchParams.get("key");
    const secretKey = context.env.UPDATE_KEY || "35794406";

    if (accessKey !== secretKey) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "非法访问",
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 403,
        }
      );
    }

    // 构建强制刷新的 feeds API 请求 URL
    const feedsUrl = new URL(context.request.url);
    feedsUrl.pathname = "/api/feeds";
    feedsUrl.searchParams.set("t", Date.now().toString());
    feedsUrl.searchParams.set("forceRefresh", "true");

    console.log(`正在更新 RSS 缓存: ${feedsUrl.toString()}`);

    // 先检查当前缓存状态
    const cache = caches.default;
    const cachePath = "/api/feeds";
    const cacheKey = new Request(`https://cache-key${cachePath}`);
    const existingCache = await cache.match(cacheKey);
    const oldCacheTimestamp = existingCache
      ? existingCache.headers.get("X-Cache-Timestamp")
      : null;

    // 发送内部请求以强制刷新缓存
    const response = await fetch(feedsUrl.toString(), {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(
        `缓存更新失败: ${response.status} ${response.statusText}`
      );
    }

    // 获取响应数据
    const data = await response.json();

    // 检查更新后的缓存状态
    const updatedCache = await cache.match(cacheKey);
    const newCacheTimestamp = updatedCache
      ? updatedCache.headers.get("X-Cache-Timestamp")
      : null;
    const cacheControl = updatedCache
      ? updatedCache.headers.get("Cache-Control")
      : null;

    // 从环境变量获取缓存时间（秒），默认为3900秒（65分钟）
    const cacheMaxAge = parseInt(context.env.CACHE_MAX_AGE || "3900");
    const maxAge = cacheControl
      ? cacheControl.match(/max-age=(\d+)/)?.[1]
      : String(cacheMaxAge);

    // 转换为北京时间的函数
    const toBeiJingTime = (date) => {
      return new Date(date)
        .toLocaleString("zh-CN", {
          timeZone: "Asia/Shanghai",
          hour12: false,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
        .replace(/\//g, "-"); // 将斜杠替换为短横线
    };

    // 缓存管理说明
    const cacheStrategy = {
      explanation: `
        缓存管理策略:
        1. 该API被设计为由UptimeRobot等服务定期访问(推荐30分钟)
        2. HTTP缓存有效期由CACHE_MAX_AGE环境变量控制(默认30分钟)
        3. UI显示的刷新倒计时由RSS_CONFIG.refresh.interval控制(默认2分钟)
        4. UptimeRobot触发和UI倒计时/手动刷新是唯一的数据更新途径
      `,
    };

    // 返回成功响应
    return new Response(
      JSON.stringify({
        success: true,
        message: "RSS 缓存已成功更新",
        timestamp: toBeiJingTime(new Date()),
        feedsCount: Array.isArray(data) ? data.length : 0,
        cache: {
          status: oldCacheTimestamp === newCacheTimestamp ? "无变化" : "已更新",
          lastUpdate: newCacheTimestamp
            ? toBeiJingTime(Number(newCacheTimestamp))
            : toBeiJingTime(new Date()),
          maxAge: `${Math.floor(Number(maxAge) / 60)} 分钟`,
          nextUpdate: toBeiJingTime(
            new Date(
              Number(newCacheTimestamp || Date.now()) + Number(maxAge) * 1000
            )
          ),
          previousUpdate: oldCacheTimestamp
            ? toBeiJingTime(Number(oldCacheTimestamp))
            : "无",
        },
        strategy: cacheStrategy.explanation
          .trim()
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line),
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store", // 确保这个响应不被缓存
        },
      }
    );
  } catch (error) {
    console.error("更新缓存时出错:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: `更新缓存失败: ${error.message}`,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
}
