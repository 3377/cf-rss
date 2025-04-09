import { RSS_CONFIG } from "../../src/config/rss.config.js";

// KV 缓存键名
const CACHE_KEY = "RSS_FEEDS_DATA";

// 缓存有效期（秒）- 2小时
const DEFAULT_CACHE_TTL = 7200;

/**
 * 从 KV 中获取缓存数据
 * @param {Object} env Cloudflare Workers 环境
 * @returns {Promise<Object|null>} 缓存数据或 null
 */
async function getFromCache(env) {
  try {
    // 尝试读取缓存及其元数据
    const result = await env.RSS_KV.getWithMetadata(CACHE_KEY, { type: "json" });
    
    if (result && result.value && Array.isArray(result.value) && result.value.length > 0) {
      const metadata = result.metadata || {};
      return {
        data: result.value,
        metadata: metadata,
        cacheHit: true
      };
    }
  } catch (error) {
    console.error("读取 KV 缓存失败:", error);
  }
  
  return { cacheHit: false };
}

/**
 * 将数据保存到 KV 缓存
 * @param {Object} env Cloudflare Workers 环境
 * @param {Array} data 要缓存的数据
 * @param {number} ttl 缓存过期时间（秒）
 * @returns {Promise<boolean>} 缓存操作是否成功
 */
async function saveToCache(env, data, ttl = DEFAULT_CACHE_TTL) {
  try {
    // 创建元数据对象，包含时间戳
    const metadata = {
      timestamp: Date.now(),
      lastUpdate: new Date().toISOString()
    };
    
    // 将数据和元数据保存到 KV
    await env.RSS_KV.put(CACHE_KEY, JSON.stringify(data), {
      expirationTtl: ttl,
      metadata: metadata
    });
    
    console.log(`数据已缓存，过期时间: ${ttl}秒`);
    return true;
  } catch (error) {
    console.error("保存数据到 KV 缓存失败:", error);
    return false;
  }
}

/**
 * 获取 RSS 源数据
 * @returns {Promise<Array>} RSS 源数据
 */
async function fetchRSSData() {
  console.log("开始获取新的 RSS 数据...");
  
  try {
    const feedResults = await Promise.all(
      RSS_CONFIG.feeds.map(async (source) => {
        try {
          console.log(`获取 RSS 源: ${source.title}`);
          const response = await fetch(source.url);
          const xml = await response.text();

          // 解析 XML
          const items = [];
          const parser = new DOMParser();
          const doc = parser.parseFromString(xml, "text/xml");

          // 尝试识别 RSS 格式
          const rssItems = doc.querySelectorAll("item");
          const atomEntries = doc.querySelectorAll("entry");

          if (rssItems.length > 0) {
            // 标准 RSS 格式解析
            Array.from(rssItems).forEach((item) => {
              const title = item.querySelector("title")?.textContent || "";
              const link = item.querySelector("link")?.textContent || "";
              const pubDate = item.querySelector("pubDate")?.textContent || "";
              const description = item.querySelector("description")?.textContent || "";
              
              items.push({
                title: title.trim(),
                link: link.trim(),
                pubDate: pubDate.trim(),
                description: description.trim()
              });
            });
          } else if (atomEntries.length > 0) {
            // Atom 格式解析
            Array.from(atomEntries).forEach((entry) => {
              let link = "";
              const linkElement = entry.querySelector("link");
              
              if (linkElement) {
                link = linkElement.getAttribute("href") || linkElement.textContent || "";
              }
              
              const title = entry.querySelector("title")?.textContent || "";
              const pubDate = entry.querySelector("published,updated")?.textContent || "";
              const summary = entry.querySelector("summary,content")?.textContent || "";
              
              items.push({
                title: title.trim(),
                link: link.trim(),
                pubDate: pubDate.trim(),
                description: summary.trim()
              });
            });
          }

          return {
            source: source.id,
            title: source.title,
            link: source.link || "",
            items: items,
            totalItems: items.length,
            lastUpdate: new Date().toISOString()
          };
        } catch (error) {
          console.error(`获取 RSS 源 ${source.title} 失败:`, error);
          return {
            source: source.id,
            title: source.title,
            link: source.link || "",
            items: [],
            error: error.message,
            lastUpdate: new Date().toISOString()
          };
        }
      })
    );

    console.log(`所有 RSS 源获取完成，共 ${feedResults.length} 个源`);
    return feedResults;
  } catch (error) {
    console.error("获取 RSS 数据失败:", error);
    throw error;
  }
}

/**
 * 检查是否需要异步更新缓存
 * @param {Object} cacheResult 缓存结果
 * @param {number} maxTtl 最大缓存时间（秒）
 * @returns {boolean} 是否需要更新缓存
 */
function shouldUpdateCache(cacheResult, maxTtl = DEFAULT_CACHE_TTL) {
  // 如果没有缓存命中，不需要触发异步更新（会在主流程中直接更新）
  if (!cacheResult.cacheHit) return false;
  
  const metadata = cacheResult.metadata || {};
  const timestamp = metadata.timestamp || 0;
  const cacheAge = Date.now() - timestamp;
  
  // 如果缓存已经达到其最大年龄的 80%，触发异步更新
  return cacheAge > maxTtl * 0.8 * 1000;
}

/**
 * 异步更新缓存
 * @param {Object} env Cloudflare Workers 环境
 */
async function asyncUpdateCache(env) {
  try {
    console.log("开始异步更新缓存...");
    const newData = await fetchRSSData();
    await saveToCache(env, newData);
    console.log("异步缓存更新完成");
  } catch (error) {
    console.error("异步更新缓存失败:", error);
  }
}

export async function onRequest(context) {
  const startTime = Date.now();
  const ttl = parseInt(context.env.CACHE_MAX_AGE || String(DEFAULT_CACHE_TTL));
  
  try {
    // 获取请求参数
    const url = new URL(context.request.url);
    const forceRefresh = url.searchParams.get("forceRefresh") === "true";
    
    console.log(`处理 RSS API 请求: forceRefresh=${forceRefresh}, cacheMaxAge=${ttl}秒`);
    
    // 如果不是强制刷新，尝试从缓存获取数据
    if (!forceRefresh) {
      const cacheResult = await getFromCache(context.env);
      
      // 如果缓存命中
      if (cacheResult.cacheHit) {
        console.log("缓存命中，使用缓存数据");
        
        // 如果缓存即将过期，触发异步更新
        if (shouldUpdateCache(cacheResult, ttl)) {
          console.log("缓存即将过期，触发异步更新");
          // 使用调度器在后台运行异步更新
          context.waitUntil(asyncUpdateCache(context.env));
        }
        
        // 返回缓存数据
        const headers = new Headers();
        headers.set("Content-Type", "application/json");
        headers.set("X-Cache", "HIT");
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        headers.set("X-Response-Time", `${Date.now() - startTime}ms`);
        
        return new Response(JSON.stringify(cacheResult.data), { headers });
      }
      
      console.log("缓存未命中，获取新数据");
    } else {
      console.log("强制刷新，跳过缓存检查");
    }
    
    // 获取新数据
    const data = await fetchRSSData();
    
    // 返回数据并更新缓存
    await saveToCache(context.env, data, ttl);
    
    // 设置响应头
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("X-Cache", "MISS");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("X-Response-Time", `${Date.now() - startTime}ms`);
    
    return new Response(JSON.stringify(data), { headers });
  } catch (error) {
    console.error("处理 RSS 请求失败:", error);
    
    return new Response(
      JSON.stringify({
        error: `处理 RSS 请求失败: ${error.message}`,
        timestamp: Date.now()
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
