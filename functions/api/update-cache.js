// 专用于外部服务触发缓存更新的 API 端点
export async function onRequest(context) {
  try {
    // 添加更多的日志记录，帮助调试
    console.log("收到update-cache请求，开始处理...");

    // 获取请求方法，支持GET和POST
    const requestMethod = context.request.method;
    console.log(`请求方法: ${requestMethod}`);

    // 检查访问密钥
    const url = new URL(context.request.url);
    const accessKey = url.searchParams.get("key");
    const secretKey = context.env.UPDATE_KEY || "35794406";

    console.log("密钥验证中...");
    if (accessKey !== secretKey) {
      console.log("密钥验证失败");
      return new Response(
        JSON.stringify({
          success: false,
          message: "非法访问：密钥无效",
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          status: 403,
        }
      );
    }
    console.log("密钥验证成功");

    // 构建强制刷新的 feeds API 请求 URL
    const feedsUrl = new URL(context.request.url);
    feedsUrl.pathname = "/api/feeds";
    feedsUrl.searchParams.set("t", Date.now().toString());
    feedsUrl.searchParams.set("forceRefresh", "true");

    console.log(`准备获取feeds数据: ${feedsUrl.toString()}`);

    // 先检查当前缓存状态 - 使用安全的方式获取缓存
    console.log("获取当前缓存状态...");
    let oldCacheTimestamp = null;
    let existingCache = null;
    try {
      const cache = caches.default;
      // 使用完全固定的缓存键
      const cacheKey = new Request("https://fixed-cache-key/api/feeds");
      console.log(`使用缓存键: ${cacheKey.url}`);

      existingCache = await cache.match(cacheKey);
      if (existingCache) {
        console.log("找到现有缓存");
        oldCacheTimestamp = existingCache.headers.get("X-Cache-Timestamp");
        console.log(`缓存时间戳: ${oldCacheTimestamp}`);
      } else {
        console.log("未找到现有缓存");
      }
    } catch (cacheError) {
      console.error("获取缓存状态时出错:", cacheError);
      // 继续执行，不中断流程
    }

    // 发送内部请求以强制刷新缓存
    console.log("开始发送内部请求更新缓存...");
    let response;
    try {
      response = await fetch(feedsUrl.toString(), {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      console.log(`获取响应状态: ${response.status}`);

      if (!response.ok) {
        throw new Error(
          `缓存更新失败: ${response.status} ${response.statusText}`
        );
      }
    } catch (fetchError) {
      console.error("获取feeds数据失败:", fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          message: `更新缓存失败: ${fetchError.message}`,
          error: fetchError.stack,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          status: 500,
        }
      );
    }

    // 获取响应数据
    let data;
    try {
      data = await response.json();
      console.log(`获取到feeds数据: ${data.length} 项`);
    } catch (jsonError) {
      console.error("解析响应JSON失败:", jsonError);
      return new Response(
        JSON.stringify({
          success: false,
          message: `解析响应数据失败: ${jsonError.message}`,
          error: jsonError.stack,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          status: 500,
        }
      );
    }

    // 检查更新后的缓存状态
    console.log("获取更新后的缓存状态...");
    let newCacheTimestamp = null;
    let cacheControl = null;
    try {
      const cache = caches.default;
      const cacheKey = new Request("https://fixed-cache-key/api/feeds");
      const updatedCache = await cache.match(cacheKey);

      if (updatedCache) {
        console.log("找到更新后的缓存");
        newCacheTimestamp = updatedCache.headers.get("X-Cache-Timestamp");
        cacheControl = updatedCache.headers.get("Cache-Control");
        console.log(
          `新缓存时间戳: ${newCacheTimestamp}, 缓存控制: ${cacheControl}`
        );
      } else {
        console.log("未找到更新后的缓存");
      }
    } catch (updatedCacheError) {
      console.error("获取更新后缓存状态失败:", updatedCacheError);
      // 继续执行，使用响应头中的信息
      newCacheTimestamp = response.headers.get("X-Cache-Timestamp");
      cacheControl = response.headers.get("Cache-Control");
    }

    // 从环境变量获取缓存时间（秒），默认为1800秒（30分钟）
    const cacheMaxAge = parseInt(context.env.CACHE_MAX_AGE || "1800");
    const maxAge = cacheControl
      ? cacheControl.match(/max-age=(\d+)/)?.[1]
      : String(cacheMaxAge);

    // 转换为北京时间的函数
    const toBeiJingTime = (date) => {
      try {
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
      } catch (e) {
        console.error("时间格式化失败:", e);
        return String(date);
      }
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

    console.log("生成响应数据...");
    const responseData = {
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
    };

    // 返回成功响应
    console.log("返回成功响应");
    return new Response(JSON.stringify(responseData), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store", // 确保这个响应不被缓存
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("全局错误:", error);
    console.error("错误堆栈:", error.stack);
    return new Response(
      JSON.stringify({
        success: false,
        message: `处理请求失败: ${error.message}`,
        error: error.stack || "No stack trace available",
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 500,
      }
    );
  }
}
