import { RSS_CONFIG } from "../../src/config/rss.config.js";
import { DOMParser } from "@xmldom/xmldom";

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
          const response = await fetch(source.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              "Accept": "application/rss+xml, application/xml, text/xml, */*"
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
          }
          
          const xml = await response.text();

          // 解析 XML
          const items = [];
          
          try {
            console.log(`尝试解析RSS源: ${source.title}, URL: ${source.url}`);
            const parser = new DOMParser({
              errorHandler: {
                warning: () => {},
                error: () => {},
                fatalError: (e) => console.error(`XML解析致命错误: ${e}`)
              }
            });
            
            const doc = parser.parseFromString(xml, "text/xml");

            // 尝试识别 RSS 格式
            const rssItems = doc.getElementsByTagName("item");
            const atomEntries = doc.getElementsByTagName("entry");

            // 增强型辅助函数：安全获取元素内容，支持CDATA
            const getElementText = (parent, tagName) => {
              const elements = parent.getElementsByTagName(tagName);
              if (!elements || elements.length === 0) return "";
              
              const element = elements[0];
              
              // 优先检查CDATA部分
              const cdataNode = element.firstChild;
              if (cdataNode && cdataNode.nodeType === 4) { // 4 是 CDATA 节点类型
                return cdataNode.data.trim();
              }
              
              // 否则尝试获取完整内容
              return element.textContent ? element.textContent.trim() : "";
            };
            
            // 专门为NodeSeek设计的解析逻辑
            if (source.url.includes("nodeseek.com")) {
              console.log("检测到NodeSeek RSS源，使用专用解析逻辑");
              
              // NodeSeek的标题和链接通常包含在CDATA中
              if (rssItems && rssItems.length > 0) {
                for (let i = 0; i < rssItems.length; i++) {
                  const item = rssItems[i];
                  let title = getElementText(item, "title");
                  let link = getElementText(item, "link");
                  const pubDate = getElementText(item, "pubDate");
                  
                  // 如果标题包含CDATA标记，手动处理
                  if (!title && xml.includes("<title><![CDATA[")) {
                    const titleMatch = xml.match(new RegExp(`<item>[\\s\\S]*?<title><!\\[CDATA\\[([^\\]]+)\\]\\]></title>`, "g"));
                    if (titleMatch && titleMatch[i]) {
                      const extractedTitle = titleMatch[i].match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/);
                      if (extractedTitle && extractedTitle[1]) {
                        title = extractedTitle[1].trim();
                      }
                    }
                  }
                  
                  // 如果链接不存在，尝试从原始XML中提取
                  if (!link && xml.includes("<link>")) {
                    const linkMatch = xml.match(new RegExp(`<item>[\\s\\S]*?<link>([^<]+)</link>`, "g"));
                    if (linkMatch && linkMatch[i]) {
                      const extractedLink = linkMatch[i].match(/<link>([^<]+)<\/link>/);
                      if (extractedLink && extractedLink[1]) {
                        link = extractedLink[1].trim();
                      }
                    }
                  }
                  
                  items.push({
                    title: title,
                    link: link,
                    pubDate: pubDate,
                    description: ""
                  });
                }
      }
    } else {
              // 其他RSS源的标准解析逻辑
              // 辅助函数：获取链接
              const getLink = (parent) => {
                const linkElements = parent.getElementsByTagName("link");
                if (linkElements && linkElements.length > 0) {
                  const linkElement = linkElements[0];
                  // 检查是否有href属性(Atom格式)
                  if (linkElement.getAttribute && linkElement.getAttribute("href")) {
                    return linkElement.getAttribute("href").trim();
                  }
                  // 否则使用文本内容(RSS格式)
                  return linkElement.textContent ? linkElement.textContent.trim() : "";
                }
                return "";
              };
  
              if (rssItems && rssItems.length > 0) {
                // 标准 RSS 格式解析
                for (let i = 0; i < rssItems.length; i++) {
                  const item = rssItems[i];
                  const title = getElementText(item, "title");
                  const link = getLink(item) || getElementText(item, "link");
                  const pubDate = getElementText(item, "pubDate");
                  const description = getElementText(item, "description");
                  
                  items.push({
                    title: title,
                    link: link,
                    pubDate: pubDate,
                    description: description
                  });
                }
              } else if (atomEntries && atomEntries.length > 0) {
                // Atom 格式解析
                for (let i = 0; i < atomEntries.length; i++) {
                  const entry = atomEntries[i];
                  const title = getElementText(entry, "title");
                  const link = getLink(entry);
                  const pubDate = getElementText(entry, "published") || getElementText(entry, "updated");
                  const summary = getElementText(entry, "summary") || getElementText(entry, "content");
                  
                items.push({
                    title: title,
                    link: link,
                    pubDate: pubDate,
                    description: summary
                  });
                }
              }
            }
            
            // 如果仍然没有获取到任何条目，使用备用解析方法
            if (items.length === 0) {
              throw new Error("未找到RSS条目，尝试备用解析方法");
            }
          } catch (parseError) {
            console.error(`解析 ${source.title} 的XML内容失败:`, parseError);
            console.log(`原始XML内容片段: ${xml.substring(0, 200)}...`);
            
            // 备用解析方法：使用正则表达式
            try {
              console.log("使用备用正则表达式解析方法");
              
              // 针对NodeSeek的特殊处理
              if (source.url.includes("nodeseek.com")) {
                const itemRegex = /<item>[\s\S]*?<\/item>/g;
                const matches = xml.match(itemRegex) || [];
                
                matches.forEach(itemXml => {
                  // 提取CDATA中的标题
                  const titleMatch = itemXml.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/);
                  // 提取链接
                  const linkMatch = itemXml.match(/<link>([^<]+)<\/link>/);
                  // 提取发布日期
                  const dateMatch = itemXml.match(/<pubDate>([^<]+)<\/pubDate>/);
                  
                  if (titleMatch && titleMatch[1] && linkMatch && linkMatch[1]) {
                items.push({
                      title: titleMatch[1].trim(),
                      link: linkMatch[1].trim(),
                      pubDate: dateMatch ? dateMatch[1].trim() : "",
                      description: ""
                    });
                  }
                });
              } else {
                // 标准备用解析
                // 提取标题
                const titleMatches = xml.match(/<title>([^<]+)<\/title>/g) || xml.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/g);
                const linkMatches = xml.match(/<link>([^<]+)<\/link>/g) || xml.match(/<link[^>]+href="([^"]+)"[^>]*\/?>/g);
                
                if (titleMatches && linkMatches) {
                  for (let i = 0; i < Math.min(titleMatches.length, linkMatches.length); i++) {
                    // 跳过第一个（通常是频道标题）
                    if (i === 0) continue;
                    
                    let titleMatch = titleMatches[i].match(/<title>([^<]+)<\/title>/);
                    if (!titleMatch) {
                      titleMatch = titleMatches[i].match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/);
                    }
                    
                    let linkMatch = linkMatches[i].match(/<link>([^<]+)<\/link>/);
                    if (!linkMatch) {
                      linkMatch = linkMatches[i].match(/href="([^"]+)"/);
                    }
                    
                    if (titleMatch && titleMatch[1] && linkMatch && linkMatch[1]) {
                      items.push({
                        title: titleMatch[1].trim(),
                        link: linkMatch[1].trim(),
                        pubDate: "",
                        description: ""
                      });
                    }
                  }
                }
              }
            } catch (regexError) {
              console.error(`备用解析方法也失败:`, regexError);
            }
          }

          console.log(`成功从 ${source.title} 获取了 ${items.length} 个条目`);

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
    
    // 从缓存获取数据
    const result = await getFromCache(context.env);
    
    // 准备响应头
    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=120" // 允许客户端缓存120秒
    };
    
    if (result.cacheHit) {
      // 缓存命中
      console.log(`命中缓存, 缓存时间戳: ${result.metadata.timestamp || 'unknown'}`);
      
      // 添加缓存相关的响应头
      headers["X-Cache"] = "HIT";
      headers["X-Cache-Status"] = "hit";
      headers["X-Cache-Timestamp"] = result.metadata.timestamp || Date.now();
      
      // 构建响应体，包含数据和缓存元数据
      const responseData = {
        data: result.data,
        cache: {
          status: 'hit',
          timestamp: result.metadata.timestamp || Date.now(),
          lastUpdate: result.metadata.lastUpdate || new Date().toISOString()
        }
      };
      
      return new Response(JSON.stringify(responseData), { headers });
    } else {
      // 缓存未命中，尝试获取新数据
      try {
        console.log("缓存未命中或强制刷新，获取新数据");
        
        // 添加缓存未命中相关的响应头
        headers["X-Cache"] = "MISS";
        headers["X-Cache-Status"] = "miss";
        headers["X-Cache-Timestamp"] = Date.now();
        
        const data = await fetchRSSData();
        
        // 保存到缓存
        const cached = await saveToCache(context.env, data, ttl);
        
        if (cached) {
          console.log(`数据已成功缓存, 过期时间: ${ttl}秒`);
        } else {
          console.log("数据缓存失败");
        }
        
        // 构建响应体，包含数据和缓存元数据
        const responseData = {
          data: data,
          cache: {
            status: 'miss',
            timestamp: Date.now(),
            lastUpdate: new Date().toISOString()
          }
        };
        
        return new Response(JSON.stringify(responseData), { headers });
      } catch (error) {
        console.error("获取RSS数据失败:", error);
        
        // 构建错误响应
        headers["X-Cache"] = "ERROR";
        headers["X-Cache-Status"] = "error";
        
        return new Response(
          JSON.stringify({
            error: `获取RSS数据失败: ${error.message}`,
            cache: {
              status: 'error',
              timestamp: Date.now()
            }
          }),
          {
            status: 500,
            headers
          }
        );
      }
    }
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
