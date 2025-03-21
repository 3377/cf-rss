// 专用于外部服务触发缓存更新的 API 端点
export async function onRequest(context) {
  const startTime = Date.now();
  const debug = {
    startTime,
    cacheChecked: false,
    cacheUpdated: false,
    errors: [],
    timing: {},
  };

  try {
    // 检查访问密钥
    const url = new URL(context.request.url);
    const accessKey = url.searchParams.get("key");
    const secretKey = context.env.UPDATE_KEY || "35794406";

    if (accessKey !== secretKey) {
      console.error(`[${startTime}] 非法访问，密钥不匹配`);
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

    console.log(`[${startTime}] 开始更新RSS缓存，请求域名: ${url.hostname}`);

    // 使用绝对固定的缓存键 - 所有域名共享同一个缓存
    const fixedCacheKey = "https://fixed-cache-key/api/feeds";
    const cacheKey = new Request(fixedCacheKey);
    console.log(`[${startTime}] 使用固定缓存键: ${fixedCacheKey}`);

    // 先检查当前缓存状态
    const cache = caches.default;
    const existingCache = await cache.match(cacheKey);
    debug.cacheChecked = true;

    const oldCacheTimestamp = existingCache
      ? existingCache.headers.get("X-Cache-Timestamp")
      : null;

    console.log(
      `[${startTime}] 现有缓存状态: ${
        existingCache ? "已存在" : "不存在"
      }, 时间戳: ${oldCacheTimestamp || "无"}`
    );

    // 构建请求URL - 使用相同的域名构建绝对URL，确保请求源和当前请求相同
    const feedsUrl = new URL("/api/feeds", url.origin);
    feedsUrl.searchParams.set("t", Date.now().toString());
    feedsUrl.searchParams.set("forceRefresh", "true");

    console.log(
      `[${startTime}] 正在更新RSS缓存，使用URL: ${feedsUrl.toString()}`
    );

    // 发送请求以获取最新数据
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

    // 获取响应数据并验证
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error(`API返回的数据无效: 不是数组格式`);
    }

    console.log(`[${startTime}] 成功获取数据，包含 ${data.length} 个源`);

    // 检查更新后的缓存状态
    const updatedCache = await cache.match(cacheKey);
    const newCacheTimestamp = updatedCache
      ? updatedCache.headers.get("X-Cache-Timestamp")
      : null;

    // 从环境变量获取缓存时间（秒），默认为1800秒（30分钟）
    const cacheMaxAge = parseInt(context.env.CACHE_MAX_AGE || "1800");

    // 如果获取到了新数据但缓存没有更新，手动更新缓存
    if (
      response.ok &&
      Array.isArray(data) &&
      (!updatedCache || oldCacheTimestamp === newCacheTimestamp)
    ) {
      console.log(`[${startTime}] 检测到缓存未自动更新，手动更新缓存`);

      const timestamp = Date.now().toString();
      const cacheResponse = new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          // 修改缓存控制头，允许共享缓存
          "Cache-Control": `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`,
          "X-Cache-Timestamp": timestamp,
          "X-Cache": "MISS",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      });

      try {
        // 将结果存入缓存 - 使用固定缓存键
        await cache.put(cacheKey, cacheResponse.clone());
        debug.cacheUpdated = true;
        console.log(`[${startTime}] 成功手动更新缓存，时间戳: ${timestamp}`);
      } catch (e) {
        console.error(`[${startTime}] 手动更新缓存失败:`, e);
        debug.errors.push({
          type: "cache_update",
          message: e.message,
        });
        throw new Error(`手动更新缓存失败: ${e.message}`);
      }
    } else if (updatedCache && oldCacheTimestamp !== newCacheTimestamp) {
      console.log(
        `[${startTime}] 缓存已自动更新，旧时间戳: ${oldCacheTimestamp}，新时间戳: ${newCacheTimestamp}`
      );
      debug.cacheUpdated = true;
    }

    // 再次验证缓存是否已更新
    const finalCache = await cache.match(cacheKey);
    const finalCacheTimestamp = finalCache
      ? finalCache.headers.get("X-Cache-Timestamp")
      : null;

    // 确认缓存已更新
    const cacheUpdatedConfirmed =
      finalCache &&
      (!oldCacheTimestamp || finalCacheTimestamp !== oldCacheTimestamp);

    // 如果在多次尝试后仍未更新缓存，返回错误
    if (!cacheUpdatedConfirmed && debug.cacheUpdated) {
      console.error(`[${startTime}] 缓存更新验证失败，缓存仍未更新`);
      debug.errors.push({
        type: "cache_verify",
        message: "缓存更新后验证失败",
      });
    }

    // 读取缓存内容进行验证
    let cacheContent = null;
    if (finalCache) {
      try {
        const clonedResponse = finalCache.clone();
        cacheContent = await clonedResponse.text();
        const parsedContent = JSON.parse(cacheContent);
        console.log(
          `[${startTime}] 缓存内容验证成功，包含 ${
            Array.isArray(parsedContent) ? parsedContent.length : 0
          } 个源`
        );
      } catch (e) {
        console.error(`[${startTime}] 缓存内容验证失败:`, e);
        debug.errors.push({
          type: "cache_content_verify",
          message: e.message,
        });
      }
    }

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

    // 返回成功响应
    const responseBody = {
      成功: true,
      消息: "RSS缓存更新成功",
      缓存状态: debug.cacheUpdated ? "已更新" : "无需更新",
      时间戳: Date.now(),
      调试信息: {
        ...debug,
        // 时间信息
        旧缓存时间: oldCacheTimestamp ? parseInt(oldCacheTimestamp) : null,
        新缓存时间: finalCacheTimestamp ? parseInt(finalCacheTimestamp) : null,
        旧缓存时间格式化: formatTimestamp(oldCacheTimestamp),
        新缓存时间格式化: formatTimestamp(finalCacheTimestamp),
        // 缓存信息
        数据长度: data.length,
        缓存内容长度: cacheContent ? cacheContent.length : 0,
        // 请求信息
        请求地址: url.toString(),
        请求域名: url.hostname,
        // 性能信息
        耗时: Date.now() - startTime,
        // 缓存状态
        缓存详情: {
          是否存在: !!finalCache,
          是否更新: debug.cacheUpdated,
          是否验证: cacheUpdatedConfirmed,
          内容是否有效: !!cacheContent,
        },
        // 时间信息
        时间记录: {
          开始时间: formatTimestamp(startTime),
          结束时间: getBeijingTime(),
          总耗时: `${(Date.now() - startTime) / 1000}秒`,
        },
        // 中文状态描述
        状态描述: {
          缓存存在: finalCache ? "存在" : "不存在",
          缓存更新: debug.cacheUpdated ? "已更新" : "未更新",
          缓存验证: cacheUpdatedConfirmed ? "已验证" : "未验证",
          内容有效: cacheContent ? "有效" : "无效",
          更新类型:
            oldCacheTimestamp === newCacheTimestamp ? "手动更新" : "自动更新",
        },
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
    console.error(`[${startTime}] 更新缓存时出错:`, error);

    // 获取北京时间
    const getBeijingTime = () => {
      const now = new Date();
      const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      return beijingTime.toISOString().replace("T", " ").replace("Z", "");
    };

    return new Response(
      JSON.stringify(
        {
          success: false,
          message: `更新缓存失败: ${error.message}`,
          timestamp: Date.now(),
          beijingTime: getBeijingTime(),
          debug: {
            ...debug,
            error: error.message,
            stack:
              process.env.NODE_ENV === "development" ? error.stack : undefined,
            elapsed: Date.now() - startTime,
            timestamps: {
              start: new Date(startTime + 8 * 60 * 60 * 1000)
                .toISOString()
                .replace("T", " ")
                .replace("Z", ""),
              end: getBeijingTime(),
              duration: `${(Date.now() - startTime) / 1000}秒`,
            },
          },
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
