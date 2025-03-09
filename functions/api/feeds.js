import { RSS_CONFIG } from "../../src/config/rss.config.js";

export async function onRequest(context) {
  const startTime = Date.now();
  let debug = {
    startTime,
    cacheFound: false,
    cacheUsed: false,
    errors: [],
    timing: {},
    cacheKey: "",
    url: "",
  };

  try {
    // 获取请求参数
    const url = new URL(context.request.url);
    debug.url = url.toString();
    const forceRefresh = url.searchParams.get("forceRefresh") === "true";

    // 从环境变量获取缓存时间（秒），默认为1800秒（30分钟）
    const cacheMaxAge = parseInt(context.env.CACHE_MAX_AGE || "1800");
    console.log(
      `[${startTime}] API请求: forceRefresh=${forceRefresh}, cacheMaxAge=${cacheMaxAge}秒, 路径=${
        url.pathname
      }, 完整URL=${url.toString()}`
    );

    // 创建固定的缓存键 - 使用最简单的形式避免任何不一致
    const cacheKey = new Request("https://fixed-cache-key/api/feeds");
    debug.cacheKey = "https://fixed-cache-key/api/feeds";

    console.log(`[${startTime}] 使用固定缓存键: ${debug.cacheKey}`);

    // 确保在任何情况下都返回有效结果
    let feedResults = [];

    // 缓存处理 - 只有在非强制刷新时尝试使用缓存
    let cachedResponse = null;
    let cachedBody = null;

    if (!forceRefresh) {
      try {
        console.log(`[${startTime}] 开始尝试从缓存获取数据...`);
        const cacheStartTime = Date.now();
        const cache = caches.default;

        // 尝试从缓存中获取数据
        try {
          cachedResponse = await cache.match(cacheKey);
          debug.timing.cacheMatch = Date.now() - cacheStartTime;
          debug.cacheFound = !!cachedResponse;

          console.log(
            `[${startTime}] 缓存查询完成，耗时: ${
              debug.timing.cacheMatch
            }ms, 是否找到缓存: ${debug.cacheFound ? "是" : "否"}`
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
                feedResults = parsedData; // 保存缓存数据，即使后续出错也能返回
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
        }

        // 如果成功读取和验证了缓存内容，直接返回
        if (cachedBody && debug.cacheUsed) {
          console.log(`[${startTime}] 使用缓存数据，跳过源站获取`);

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
          headers.set("Cache-Control", "no-store"); // 确保浏览器不缓存
          headers.set("X-Response-Time", `${Date.now() - startTime}ms`);
          headers.set("X-Debug-Info", JSON.stringify(debug));

          console.log(
            `[${startTime}] 成功返回缓存数据，X-Cache: HIT，总耗时:${
              Date.now() - startTime
            }ms`
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
      console.log(`[${startTime}] 强制刷新，跳过缓存`);
    }

    // 如果无法使用缓存，则获取新数据
    if (!debug.cacheUsed) {
      console.log(`[${startTime}] 开始获取新的RSS数据...`);
      const fetchStartTime = Date.now();
      debug.timing.fetchStart = fetchStartTime - startTime;

      try {
        // 获取RSS数据
        feedResults = await Promise.all(
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
                  Math.min(
                    rssItems.length,
                    RSS_CONFIG.display?.itemsPerFeed || 10
                  );
                  i++
                ) {
                  const item = rssItems[i];
                  const title = getTagContent(xml, item.querySelector("title"));
                  const link = getTagContent(xml, item.querySelector("link"));
                  const pubDate = getTagContent(
                    xml,
                    item.querySelector("pubDate")
                  );

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
                  const title = getTagContent(
                    xml,
                    entry.querySelector("title")
                  );
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
      } catch (fetchError) {
        console.error(`[${startTime}] RSS数据获取过程中发生错误:`, fetchError);
        debug.errors.push({
          type: "fetch_process",
          message: fetchError.message,
        });

        // 即使获取失败，也尝试返回一些基本数据
        if (feedResults.length === 0) {
          feedResults = RSS_CONFIG.feeds.map((source) => ({
            title: source.title,
            items: [],
            error: "数据获取失败",
          }));
        }
      }

      debug.timing.fetchComplete = Date.now() - fetchStartTime;
      console.log(
        `[${startTime}] 所有RSS源获取完成，总耗时:${debug.timing.fetchComplete}ms`
      );
    }

    // 准备新的响应
    const timestamp = Date.now().toString();
    const responseBody = JSON.stringify(feedResults);

    // 创建响应，添加详细的调试信息
    const responseHeaders = {
      "Content-Type": "application/json",
      "X-Cache": debug.cacheUsed ? "HIT" : "MISS",
      "X-Cache-Timestamp": timestamp,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": "no-store", // 确保浏览器不缓存
      "X-Response-Time": `${Date.now() - startTime}ms`,
      "X-Debug-Info": JSON.stringify(debug),
    };

    const response = new Response(responseBody, {
      headers: responseHeaders,
    });

    // 如果不是强制刷新且成功获取了新数据，将结果存入缓存
    if (!forceRefresh && !debug.cacheUsed && feedResults.length > 0) {
      try {
        const cache = caches.default;
        const cacheStoreStart = Date.now();

        // 创建一个新的响应用于缓存，使用相同的内容但不同的头
        const cacheResponse = new Response(responseBody, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${cacheMaxAge}`,
            "X-Cache-Timestamp": timestamp,
            "X-Cache": "MISS",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
          },
        });

        // 使用固定的缓存键存储
        console.log(`[${startTime}] 将结果存入缓存，键: ${debug.cacheKey}`);
        await cache.put(cacheKey, cacheResponse);
        debug.timing.cacheStore = Date.now() - cacheStoreStart;
        console.log(
          `[${startTime}] 成功存入缓存，耗时:${debug.timing.cacheStore}ms`
        );
      } catch (cachePutError) {
        console.error(`[${startTime}] 存入缓存失败:`, cachePutError);
        debug.errors.push({
          type: "cache_store",
          message: cachePutError.message,
        });
      }
    } else if (forceRefresh) {
      console.log(`[${startTime}] 强制刷新，不存储到缓存`);
    }

    console.log(
      `[${startTime}] 返回${debug.cacheUsed ? "缓存" : "新"}数据，X-Cache: ${
        debug.cacheUsed ? "HIT" : "MISS"
      }，总耗时:${Date.now() - startTime}ms`
    );
    return response;
  } catch (error) {
    console.error(`[${startTime}] 全局错误:`, error);
    debug.errors.push({
      type: "global",
      message: error.message,
      stack: error.stack,
    });

    return new Response(
      JSON.stringify({
        error: error.message,
        debug: debug,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
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
