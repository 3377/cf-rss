// 用于查看所有缓存相关信息的页面
export async function onRequest(context) {
  const startTime = Date.now();

  try {
    // 使用固定缓存键获取缓存信息
    const fixedCacheKey = "https://fixed-cache-key/api/feeds";
    const cacheKey = new Request(fixedCacheKey);
    const cache = caches.default;
    const existingCache = await cache.match(cacheKey);

    // 获取缓存时间戳
    const cacheTimestamp = existingCache
      ? existingCache.headers.get("X-Cache-Timestamp")
      : null;

    // 获取北京时间
    const getBeijingTime = () => {
      const now = new Date();
      const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      return beijingTime.toISOString().replace("T", " ").replace("Z", "");
    };

    // 格式化时间戳为北京时间
    const formatTimestamp = (timestamp) => {
      if (!timestamp) return null;
      const date = new Date(parseInt(timestamp));
      const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
      return beijingDate.toISOString().replace("T", " ").replace("Z", "");
    };

    // 读取缓存内容
    let cacheContent = null;
    if (existingCache) {
      try {
        const clonedResponse = existingCache.clone();
        cacheContent = await clonedResponse.text();
        JSON.parse(cacheContent); // 验证JSON格式
      } catch (e) {
        console.error("缓存内容验证失败:", e);
      }
    }

    // 返回缓存状态信息
    const responseBody = {
      当前时间: getBeijingTime(),
      缓存信息: {
        服务器缓存: {
          时间: formatTimestamp(cacheTimestamp),
          状态: existingCache ? "可用" : "不可用",
          数据源数量: cacheContent ? JSON.parse(cacheContent).length : 0,
        },
        更新方式: {
          接口触发: {
            说明: "通过 /api/update-cache?key=xxx 触发",
            最后更新: formatTimestamp(cacheTimestamp),
          },
          浏览器刷新: {
            说明: "通过浏览器自动刷新或点击立即刷新按钮触发",
            最后更新: formatTimestamp(cacheTimestamp),
          },
        },
        缓存状态: {
          是否存在: existingCache ? "存在" : "不存在",
          内容是否有效: cacheContent ? "有效" : "无效",
          是否过期: cacheTimestamp
            ? Date.now() - parseInt(cacheTimestamp) > 1800000
              ? "已过期"
              : "未过期"
            : "未知",
        },
      },
      调试信息: {
        请求时间: formatTimestamp(startTime),
        响应时间: getBeijingTime(),
        总耗时: `${(Date.now() - startTime) / 1000}秒`,
        缓存键: fixedCacheKey,
      },
    };

    return new Response(JSON.stringify(responseBody, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("获取缓存状态时出错:", error);

    return new Response(
      JSON.stringify(
        {
          错误: true,
          消息: `获取缓存状态失败: ${error.message}`,
          时间: getBeijingTime(),
        },
        null,
        2
      ),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
        status: 500,
      }
    );
  }
}
