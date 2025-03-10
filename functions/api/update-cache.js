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

    console.log(`开始更新RSS缓存，请求域名: ${url.hostname}`);

    // 使用绝对固定的缓存键 - 所有域名共享同一个缓存
    const cacheKey = new Request("https://fixed-cache-key/api/feeds");
    console.log(`使用固定缓存键: ${cacheKey.url}`);

    // 先检查当前缓存状态
    const cache = caches.default;
    const existingCache = await cache.match(cacheKey);
    const oldCacheTimestamp = existingCache
      ? existingCache.headers.get("X-Cache-Timestamp")
      : null;

    console.log(
      `现有缓存状态: ${existingCache ? "已存在" : "不存在"}, 时间戳: ${
        oldCacheTimestamp || "无"
      }`
    );

    // 构建请求URL - 使用相同的域名构建绝对URL，确保请求源和当前请求相同
    const feedsUrl = new URL("/api/feeds", url.origin);
    feedsUrl.searchParams.set("t", Date.now().toString());
    feedsUrl.searchParams.set("forceRefresh", "true");

    console.log(`正在更新RSS缓存，使用URL: ${feedsUrl.toString()}`);

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

    // 获取响应数据
    const data = await response.json();
    console.log(
      `成功获取数据，包含 ${Array.isArray(data) ? data.length : 0} 个源`
    );

    // 检查更新后的缓存状态
    const updatedCache = await cache.match(cacheKey);
    const newCacheTimestamp = updatedCache
      ? updatedCache.headers.get("X-Cache-Timestamp")
      : null;

    // 从环境变量获取缓存时间（秒），默认为1800秒（30分钟）
    const cacheMaxAge = parseInt(context.env.CACHE_MAX_AGE || "1800");
    const maxAge =
      updatedCache && updatedCache.headers.get("Cache-Control")
        ? updatedCache.headers.get("Cache-Control").match(/max-age=(\d+)/)?.[1]
        : String(cacheMaxAge);

    // 如果获取到了新数据但缓存没有更新，手动更新缓存
    if (
      response.ok &&
      Array.isArray(data) &&
      (!updatedCache || oldCacheTimestamp === newCacheTimestamp)
    ) {
      console.log("检测到缓存未自动更新，手动更新缓存");

      const timestamp = Date.now().toString();
      const cacheResponse = new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${cacheMaxAge}`,
          "X-Cache-Timestamp": timestamp,
          "X-Cache": "MISS",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      });

      // 使用固定缓存键存储数据
      await cache.put(cacheKey, cacheResponse);
      console.log(`已手动更新缓存，时间戳: ${timestamp}`);

      // 更新缓存时间戳为新值
      const recheck = await cache.match(cacheKey);
      if (recheck) {
        const recheckTimestamp = recheck.headers.get("X-Cache-Timestamp");
        console.log(`重新检查缓存: 时间戳=${recheckTimestamp || "无"}`);
      }

      // 额外验证步骤 - 验证并确认缓存是否更新成功
      let verificationFailed = false;
      try {
        // 尝试读取缓存
        const verifyCache = await cache.match(cacheKey);
        if (!verifyCache) {
          console.log("缓存验证失败：无法找到缓存");
          verificationFailed = true;
        } else {
          const verifyTs = verifyCache.headers.get("X-Cache-Timestamp");
          if (verifyTs !== timestamp) {
            console.log(
              `缓存验证失败：时间戳不匹配 (期望: ${timestamp}, 实际: ${
                verifyTs || "无"
              })`
            );
            verificationFailed = true;
          } else {
            // 验证内容是否正确
            const verifyCacheText = await verifyCache.text();
            try {
              const verifyCacheData = JSON.parse(verifyCacheText);
              if (
                !Array.isArray(verifyCacheData) ||
                verifyCacheData.length !== data.length
              ) {
                console.log(
                  `缓存验证失败：内容不匹配 (期望长度: ${
                    data.length
                  }, 实际长度: ${
                    Array.isArray(verifyCacheData)
                      ? verifyCacheData.length
                      : "非数组"
                  })`
                );
                verificationFailed = true;
              } else {
                console.log(
                  `缓存验证成功：找到缓存且内容匹配，包含 ${verifyCacheData.length} 个RSS源`
                );
              }
            } catch (e) {
              console.log(`缓存验证失败：无法解析缓存内容为JSON: ${e.message}`);
              verificationFailed = true;
            }
          }
        }
      } catch (verifyError) {
        console.log(`缓存验证过程出错: ${verifyError.message}`);
        verificationFailed = true;
      }

      // 如果验证失败，进行第二次尝试
      if (verificationFailed) {
        console.log("进行第二次缓存更新尝试...");

        // 使用不同的时间戳重试
        const retryTimestamp = (Date.now() + 1).toString();
        const retryCacheResponse = new Response(JSON.stringify(data), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${cacheMaxAge}`,
            "X-Cache-Timestamp": retryTimestamp,
            "X-Cache": "MISS",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
          },
        });

        try {
          await cache.put(cacheKey, retryCacheResponse);
          console.log(`第二次缓存更新尝试完成，时间戳: ${retryTimestamp}`);

          // 再次验证
          const retry2Check = await cache.match(cacheKey);
          if (retry2Check) {
            const retry2Ts = retry2Check.headers.get("X-Cache-Timestamp");
            console.log(`第二次缓存更新验证: 时间戳=${retry2Ts || "无"}`);
            if (retry2Ts === retryTimestamp) {
              console.log("第二次尝试成功！");
            } else {
              console.log("第二次尝试未能更新缓存时间戳");
            }
          } else {
            console.log("第二次尝试后仍无法找到缓存");
          }
        } catch (retryError) {
          console.log(`第二次缓存更新尝试失败: ${retryError.message}`);
        }
      }
    }

    // 再次检查缓存状态，确保已更新
    const finalCache = await cache.match(cacheKey);
    const finalTimestamp = finalCache
      ? finalCache.headers.get("X-Cache-Timestamp")
      : null;
    const cacheControl = finalCache
      ? finalCache.headers.get("Cache-Control")
      : null;
    const finalMaxAge = cacheControl
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

    const currentTime = Date.now();
    const status = oldCacheTimestamp === finalTimestamp ? "无变化" : "已更新";

    // 返回成功响应
    return new Response(
      JSON.stringify({
        success: true,
        message: "RSS 缓存已成功更新",
        timestamp: toBeiJingTime(new Date()),
        feedsCount: Array.isArray(data) ? data.length : 0,
        cache: {
          status: status,
          lastUpdate: finalTimestamp
            ? toBeiJingTime(Number(finalTimestamp))
            : toBeiJingTime(new Date()),
          maxAge: `${Math.floor(Number(finalMaxAge) / 60)} 分钟`,
          nextUpdate: toBeiJingTime(
            new Date(
              Number(finalTimestamp || currentTime) + Number(finalMaxAge) * 1000
            )
          ),
          previousUpdate: oldCacheTimestamp
            ? toBeiJingTime(Number(oldCacheTimestamp))
            : "无",
          cacheKey: cacheKey.url,
          hostname: url.hostname,
          cacheMiss: status === "已更新",
        },
        debug: {
          requestOrigin: url.origin,
          feedsUrl: feedsUrl.toString(),
          finalTimestamp: finalTimestamp,
          oldTimestamp: oldCacheTimestamp,
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
        error: error.stack,
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
