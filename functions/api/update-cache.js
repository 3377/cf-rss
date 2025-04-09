// 专用于手动强制更新 KV 缓存的 API 端点
const CACHE_KEY = "RSS_FEEDS_DATA";
const DEFAULT_CACHE_TTL = 7200; // 默认缓存时间 2 小时

export async function onRequest(context) {
  const startTime = Date.now();
  
  try {
    // 检查访问密钥
    const url = new URL(context.request.url);
    const accessKey = url.searchParams.get("key");
    const secretKey = context.env.UPDATE_KEY || "35794406";
    
    // 是否清除缓存（彻底删除而非仅更新）
    const clearCache = url.searchParams.get("clear") === "true";

    if (accessKey !== secretKey) {
      console.error("非法访问，密钥不匹配");
      return new Response(
        JSON.stringify({
          success: false,
          message: "非法访问，密钥不匹配"
        }),
        {
          headers: {
            "Content-Type": "application/json"
          },
          status: 403
        }
      );
    }

    console.log(`开始${clearCache ? '清除并' : ''}手动更新 RSS 缓存...`);
    
    // 从环境变量获取缓存时间（秒）
    const ttl = parseInt(context.env.CACHE_MAX_AGE || String(DEFAULT_CACHE_TTL));

    // 如果请求清除缓存，则先删除KV中的缓存项
    if (clearCache) {
      try {
        console.log("正在清除现有缓存...");
        await context.env.RSS_KV.delete(CACHE_KEY);
        console.log("缓存已成功清除");
      } catch (clearError) {
        console.error("清除缓存时出错:", clearError);
        // 继续执行，尝试获取新数据
      }
    }

    // 获取新数据 - 通过调用原始 API 端点强制刷新
    const feedsUrl = new URL("/api/feeds", url.origin);
    feedsUrl.searchParams.set("forceRefresh", "true");
    feedsUrl.searchParams.set("t", Date.now().toString()); // 防止缓存

    console.log(`向 ${feedsUrl.toString()} 请求最新数据`);

    const response = await fetch(feedsUrl.toString(), {
      headers: {
        "Cache-Control": "no-cache",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`获取数据失败: ${response.status} ${response.statusText}`);
    }

    // 解析数据
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("返回的数据格式无效，不是数组");
    }

    console.log(`成功获取 ${data.length} 个 RSS 源的数据`);
    
    // 验证数据内容, 特别关注NodeSeek
    let nodeseekFound = false;
    let nodeseekItems = 0;
    
    for (const feed of data) {
      if (feed.title.includes("NodeSeek") || (feed.link && feed.link.includes("nodeseek"))) {
        nodeseekFound = true;
        nodeseekItems = feed.items ? feed.items.length : 0;
        console.log(`NodeSeek源包含 ${nodeseekItems} 个条目`);
        break;
      }
    }

    // 用新数据更新 KV 缓存
    const metadata = {
      timestamp: Date.now(),
      lastUpdate: new Date().toISOString(),
      updateMethod: "manual",
      updateDuration: Date.now() - startTime
    };

    await context.env.RSS_KV.put(CACHE_KEY, JSON.stringify(data), {
      expirationTtl: ttl,
      metadata: metadata
    });

    console.log(`缓存成功${clearCache ? '清除并' : ''}更新，过期时间: ${ttl}秒`);

    // 返回成功信息
    return new Response(
      JSON.stringify({
        success: true,
        message: `RSS 缓存已${clearCache ? '清除并' : ''}手动更新`,
        timestamp: Date.now(),
        feeds: data.length,
        nodeseekStatus: {
          found: nodeseekFound,
          itemCount: nodeseekItems
        },
        cacheExpiration: Date.now() + (ttl * 1000)
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error) {
    console.error("缓存更新失败:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: `缓存更新失败: ${error.message}`,
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
