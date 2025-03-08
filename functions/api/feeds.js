import { RSS_CONFIG } from "../../src/config/rss.config.js";

export async function onRequest(context) {
  const startTime = Date.now();
  try {
    // 获取请求参数
    const url = new URL(context.request.url);
    const forceRefresh = url.searchParams.get("forceRefresh") === "true";

    // 从环境变量获取缓存时间（秒），默认为3900秒（65分钟）
    const cacheMaxAge = parseInt(context.env.CACHE_MAX_AGE || "3900");
    console.log(
      `[${startTime}] API请求: forceRefresh=${forceRefresh}, cacheMaxAge=${cacheMaxAge}秒, 路径=${url.pathname}`
    );

    // 创建用于缓存的键（不依赖域名，仅使用路径和处理后的参数）
    // 这样不同域名访问时将共享同一个缓存
    const cachePath = url.pathname;
    const cacheKey = new Request(`https://cache-key${cachePath}`);

    console.log(`[${startTime}] 使用缓存键: cache-key${cachePath}（域名独立）`);

    // 如果不是强制刷新，尝试从缓存获取数据
    let cachedResponse = null;
    if (!forceRefresh) {
      console.log(`[${startTime}] 尝试从缓存获取数据...`);
      const cache = caches.default;
      const cacheStartTime = Date.now();
      cachedResponse = await cache.match(cacheKey);
      console.log(
        `[${startTime}] 缓存查询耗时: ${Date.now() - cacheStartTime}ms`
      );

      if (cachedResponse) {
        console.log(`[${startTime}] 找到缓存数据，准备返回`);
        // 复制缓存响应，以便我们可以修改头部
        const headers = new Headers(cachedResponse.headers);
        headers.set("X-Cache", "HIT");
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        headers.set("Cache-Control", "no-store"); // 确保浏览器不缓存
        headers.set("X-Response-Time", `${Date.now() - startTime}ms`);
        headers.set("X-Worker-Debug", `cache-read:success`);

        // 保持原有的缓存控制头，但更新剩余时间
        const originalTimestamp = headers.get("X-Cache-Timestamp");
        const maxAge = cacheMaxAge;

        if (originalTimestamp) {
          const timeLeft = Math.floor(
            (parseInt(originalTimestamp) + maxAge * 1000 - Date.now()) / 1000
          );
          if (timeLeft > 0) {
            console.log(`[${startTime}] 缓存有效，剩余时间: ${timeLeft}秒`);
          } else {
            console.log(
              `[${startTime}] 缓存已过期，但仍返回过期的缓存 (stale-while-revalidate)`
            );
          }
        }

        try {
          console.log(`[${startTime}] 开始读取缓存内容...`);
          const bodyReadStart = Date.now();
          const cachedBody = await cachedResponse.text();
          console.log(
            `[${startTime}] 缓存内容读取成功，长度:${cachedBody.length}，耗时:${
              Date.now() - bodyReadStart
            }ms`
          );

          // 返回带有明确缓存标记的响应
          const hitResponse = new Response(cachedBody, {
            headers: headers,
          });

          console.log(
            `[${startTime}] 成功返回缓存数据，X-Cache: HIT，总耗时:${
              Date.now() - startTime
            }ms`
          );
          return hitResponse;
        } catch (cacheReadError) {
          console.error(`[${startTime}] 读取缓存内容失败:`, cacheReadError);
          // 如果读取缓存失败，继续获取新数据
        }
      } else {
        console.log(`[${startTime}] 缓存中没有数据，将获取新数据`);
      }
    } else {
      console.log(`[${startTime}] 强制刷新，绕过缓存`);
    }

    // 如果是强制刷新或没有缓存，获取新数据
    console.log(`[${startTime}] 开始获取新的RSS数据...`);
    const fetchStartTime = Date.now();

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

    console.log(
      `[${startTime}] 所有RSS源获取完成，总耗时:${
        Date.now() - fetchStartTime
      }ms`
    );

    const timestamp = Date.now().toString();

    // 创建响应，始终包含时间戳和缓存状态
    const responseHeaders = {
      "Content-Type": "application/json",
      "X-Cache": "MISS",
      "X-Cache-Timestamp": timestamp,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": "no-store", // 确保浏览器不缓存
      "X-Response-Time": `${Date.now() - startTime}ms`,
      "X-Worker-Debug": `fresh-data:success`,
    };

    const responseBody = JSON.stringify(feedResults);
    const response = new Response(responseBody, {
      headers: responseHeaders,
    });

    // 如果不是强制刷新，将结果存入缓存
    if (!forceRefresh) {
      const cache = caches.default;

      // 创建一个新的响应用于缓存，使用相同的时间戳
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

      // 使用域名无关的缓存键存储
      console.log(
        `[${startTime}] 将结果存入缓存，键: cache-key${cachePath}（域名独立）`
      );
      try {
        const cacheStoreStart = Date.now();
        await cache.put(cacheKey, cacheResponse);
        console.log(
          `[${startTime}] 成功存入缓存，耗时:${Date.now() - cacheStoreStart}ms`
        );
      } catch (cachePutError) {
        console.error(`[${startTime}] 存入缓存失败:`, cachePutError);
        // 存入缓存失败不影响响应
      }
    } else {
      console.log(`[${startTime}] 强制刷新，不存储到缓存`);
    }

    console.log(
      `[${startTime}] 返回新获取的数据，X-Cache: MISS，总耗时:${
        Date.now() - startTime
      }ms`
    );
    return response;
  } catch (error) {
    console.error(`[${startTime}] 全局错误:`, error);
    return new Response(
      JSON.stringify({
        error: error.message,
        debug: `处理时间:${Date.now() - startTime}ms`,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "X-Response-Time": `${Date.now() - startTime}ms`,
          "X-Worker-Debug": `error:${error.message}`,
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
