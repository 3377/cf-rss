import { RSS_CONFIG } from "../../src/config/rss.config.js";

export async function onRequest(context) {
  const startTime = Date.now();
  let debug = {
    startTime,
    cacheFound: false,
    cacheUsed: false,
    errors: [],
    timing: {},
    cacheKey: "https://fixed-cache-key/api/feeds",
    requestUrl: context.request.url,
  };

  try {
    // 获取请求参数
    const url = new URL(context.request.url);
    const forceRefresh = url.searchParams.get("forceRefresh") === "true";
    const isFirstLoad = url.searchParams.get("isFirstLoad") === "true";

    // 从环境变量获取缓存时间（秒），默认为1800秒（30分钟）
    const cacheMaxAge = parseInt(context.env.CACHE_MAX_AGE || "1800");
    console.log(
      `[${startTime}] API请求: forceRefresh=${forceRefresh}, isFirstLoad=${isFirstLoad}, cacheMaxAge=${cacheMaxAge}秒, 路径=${
        url.pathname
      }, 完整URL=${url.toString()}, 域名=${url.hostname}`
    );

    // 创建固定的缓存键 - 使用最简单的形式避免任何不一致
    const cacheKey = new Request(debug.cacheKey);

    console.log(`[${startTime}] 使用固定缓存键: ${debug.cacheKey}`);

    // 缓存处理 - 只有在强制刷新时跳过缓存
    let cachedResponse = null;
    let cachedBody = null;

    // 首次加载或非强制刷新时尝试使用缓存
    if (!forceRefresh) {
      try {
        console.log(`[${startTime}] 开始尝试从缓存获取数据...`);
        const cacheStartTime = Date.now();
        const cache = caches.default;

        // 尝试从缓存中获取数据 - 使用固定缓存键
        try {
          cachedResponse = await cache.match(cacheKey);
          debug.timing.cacheMatch = Date.now() - cacheStartTime;
          debug.cacheFound = !!cachedResponse;

          console.log(
            `[${startTime}] 缓存查询完成，耗时: ${
              debug.timing.cacheMatch
            }ms, 是否找到缓存: ${debug.cacheFound ? "是" : "否"}, 域名: ${
              url.hostname
            }`
          );
        } catch (matchError) {
          console.error(`[${startTime}] 缓存查询出错:`, matchError);
          debug.errors.push({
            type: "cache_match",
            message: matchError.message,
          });
        }

        // 如果找到了缓存响应，尝试读取内容
        if (cachedResponse) {
          try {
            console.log(`[${startTime}] 找到缓存数据，准备读取内容...`);
            const bodyReadStart = Date.now();

            // 克隆响应以确保可以多次读取
            const clonedResponse = cachedResponse.clone();
            cachedBody = await clonedResponse.text();

            debug.timing.cacheRead = Date.now() - bodyReadStart;
            console.log(
              `[${startTime}] 缓存内容读取成功，长度:${cachedBody.length}，耗时:${debug.timing.cacheRead}ms`
            );

            // 验证缓存内容是有效的JSON
            try {
              const parsedData = JSON.parse(cachedBody);
              if (Array.isArray(parsedData) && parsedData.length > 0) {
                debug.cacheUsed = true;
                console.log(
                  `[${startTime}] 缓存内容验证成功，包含${parsedData.length}个源`
                );
              } else {
                console.error(`[${startTime}] 缓存内容不是有效的数组或为空`);
                cachedBody = null; // 标记为无效缓存
                debug.errors.push({
                  type: "cache_invalid",
                  message: "缓存内容不是有效的数组或为空",
                });
              }
            } catch (parseError) {
              console.error(
                `[${startTime}] 缓存内容解析为JSON失败:`,
                parseError
              );
              cachedBody = null; // 标记为无效缓存
              debug.errors.push({
                type: "cache_parse",
                message: parseError.message,
              });
            }
          } catch (readError) {
            console.error(`[${startTime}] 读取缓存内容失败:`, readError);
            cachedBody = null;
            debug.errors.push({
              type: "cache_read",
              message: readError.message,
            });
          }
        } else {
          console.log(`[${startTime}] 未找到匹配的缓存数据，需要从源站获取`);
        }

        // 如果成功读取和验证了缓存内容，直接返回
        if (cachedBody) {
          console.log(
            `[${startTime}] 使用缓存数据，跳过源站获取，域名: ${url.hostname}`
          );

          // 创建新的响应对象，设置所有必要的头
          const headers = new Headers();
          headers.set("Content-Type", "application/json");
          headers.set("X-Cache", "HIT");
          headers.set(
            "X-Cache-Timestamp",
            cachedResponse.headers.get("X-Cache-Timestamp") ||
              Date.now().toString()
          );
          headers.set("Access-Control-Allow-Origin", "*");
          headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
          headers.set(
            "Cache-Control",
            `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`
          );
          headers.set("X-Response-Time", `${Date.now() - startTime}ms`);
          headers.set(
            "X-Debug-Info",
            JSON.stringify({
              ...debug,
              cacheHit: true,
              hostname: url.hostname,
              timestamp: Date.now(),
            })
          );

          console.log(
            `[${startTime}] 成功返回缓存数据，X-Cache: HIT，总耗时:${
              Date.now() - startTime
            }ms，域名: ${url.hostname}`
          );
          return new Response(cachedBody, { headers });
        } else {
          console.log(`[${startTime}] 无法使用缓存数据，将获取新数据`);
        }
      } catch (cacheError) {
        console.error(`[${startTime}] 缓存处理过程中出错:`, cacheError);
        debug.errors.push({
          type: "cache_process",
          message: cacheError.message,
        });
      }
    } else {
      console.log(`[${startTime}] 强制刷新，跳过缓存，域名: ${url.hostname}`);
    }

    // 如果无法使用缓存，则获取新数据
    console.log(`[${startTime}] 开始获取新的RSS数据...`);
    const fetchStartTime = Date.now();
    debug.timing.fetchStart = fetchStartTime - startTime;

    const feedResults = await Promise.all(
      RSS_CONFIG.feeds.map(async (source) => {
        console.log(`[${startTime}] 开始获取RSS源 ${source.title}...`);
        const sourceFetchStart = Date.now();
        try {
          const response = await fetch(source.url);
          const xml = await response.text();
          console.log(
            `[${startTime}] 成功获取 ${source.title}，耗时:${
              Date.now() - sourceFetchStart
            }ms`
          );

          // 解析XML
          const items = [];
          const parser = new DOMParser();
          const doc = parser.parseFromString(xml, "text/xml");

          // 尝试识别RSS格式
          const rssItems = doc.querySelectorAll("item");
          const atomEntries = doc.querySelectorAll("entry");

          if (rssItems.length > 0) {
            // 标准RSS格式
            for (
              let i = 0;
              i <
              Math.min(rssItems.length, RSS_CONFIG.display?.itemsPerFeed || 10);
              i++
            ) {
              const item = rssItems[i];
              const title = getTagContent(xml, item.querySelector("title"));
              const link = getTagContent(xml, item.querySelector("link"));
              const pubDate = getTagContent(xml, item.querySelector("pubDate"));

              if (title && link) {
                items.push({
                  title,
                  link,
                  pubDate,
                });
              }
            }
          } else if (atomEntries.length > 0) {
            // Atom格式
            for (
              let i = 0;
              i <
              Math.min(
                atomEntries.length,
                RSS_CONFIG.display?.itemsPerFeed || 10
              );
              i++
            ) {
              const entry = atomEntries[i];
              const title = getTagContent(xml, entry.querySelector("title"));
              const linkElem = entry.querySelector("link");
              const link = linkElem ? linkElem.getAttribute("href") : null;
              const pubDate =
                getTagContent(xml, entry.querySelector("published")) ||
                getTagContent(xml, entry.querySelector("updated"));

              if (title && link) {
                items.push({
                  title,
                  link,
                  pubDate,
                });
              }
            }
          }

          return {
            title: source.title,
            items: items,
          };
        } catch (error) {
          console.error(
            `[${startTime}] 获取RSS源 ${source.title} 失败:`,
            error
          );
          return {
            title: source.title,
            items: [],
            error: error.message,
          };
        }
      })
    );

    debug.timing.fetchComplete = Date.now() - fetchStartTime;
    console.log(
      `[${startTime}] 所有RSS源获取完成，总耗时:${debug.timing.fetchComplete}ms`
    );

    // 准备新的响应
    const timestamp = Date.now().toString();
    const responseBody = JSON.stringify(feedResults);

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

    // 创建响应，添加详细的调试信息
    const responseHeaders = {
      "Content-Type": "application/json",
      "X-Cache": "MISS",
      "X-Cache-Timestamp": timestamp,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`,
      "X-Response-Time": `${Date.now() - startTime}ms`,
      "X-Debug-Info": JSON.stringify({
        ...debug,
        cacheHit: false,
        hostname: url.hostname,
        timestamp: Date.now(),
        // 时间信息
        timestamps: {
          start: formatTimestamp(startTime),
          end: getBeijingTime(),
          duration: `${(Date.now() - startTime) / 1000}秒`,
          cacheTimestamp: formatTimestamp(timestamp),
        },
        // 性能信息
        performance: {
          totalTime: `${(Date.now() - startTime) / 1000}秒`,
          cacheTime: debug.timing.cacheMatch
            ? `${debug.timing.cacheMatch / 1000}秒`
            : null,
          fetchTime: debug.timing.fetchComplete
            ? `${debug.timing.fetchComplete / 1000}秒`
            : null,
        },
        // 缓存信息
        cacheInfo: {
          found: debug.cacheFound,
          used: debug.cacheUsed,
          maxAge: cacheMaxAge,
        },
      }),
    };

    const response = new Response(responseBody, {
      headers: responseHeaders,
    });

    // 只有在非强制刷新时才缓存结果
    if (!forceRefresh) {
      try {
        const cache = caches.default;
        const cacheableResponse = new Response(responseBody, {
          headers: new Headers(responseHeaders),
        });

        // 使用固定缓存键存储
        await cache.put(cacheKey, cacheableResponse.clone());
        console.log(
          `[${startTime}] 成功更新缓存，使用固定缓存键: ${debug.cacheKey}`
        );
      } catch (cacheError) {
        console.error(`[${startTime}] 缓存更新失败:`, cacheError);
        debug.errors.push({
          type: "cache_update",
          message: cacheError.message,
        });
      }
    } else {
      responseHeaders.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate"
      );
      console.log(`[${startTime}] 强制刷新模式，不更新缓存`);
    }

    console.log(
      `[${startTime}] 成功返回新数据，X-Cache: MISS，总耗时:${
        Date.now() - startTime
      }ms，域名: ${url.hostname}`
    );
    return response;
  } catch (error) {
    console.error(`[${startTime}] 处理请求时出错:`, error);

    return new Response(
      JSON.stringify({
        error: "获取RSS数据时发生错误",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        debug,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Response-Time": `${Date.now() - startTime}ms`,
        },
      }
    );
  }
}

// 辅助函数：获取XML标签内容
function getTagContent(xml, element) {
  if (!element) return null;

  try {
    // 如果元素有子元素，返回innerHTML
    if (element.innerHTML) {
      return element.innerHTML.trim();
    }

    // 否则返回textContent
    return element.textContent ? element.textContent.trim() : null;
  } catch (error) {
    console.error("解析XML内容失败:", error);
    return null;
  }
}
